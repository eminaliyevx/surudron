import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { MapContainer, useMap, useMapEvent } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import type { LatLng as LeafletLatLng, Map as LeafletMap } from "leaflet";
import { Polyline } from "react-leaflet";
import { CachedTileLayer } from "@/components/map/cached-tile-layer";
import DestinationMarker from "@/components/map/markers/destination-marker";
import DistanceMeasure from "@/components/map/markers/distance-measurement-component";
import DroneMarker from "@/components/map/markers/drone-marker";
import FlyToMarker from "@/components/map/markers/fly-to-marker";
import { Button } from "@/components/ui/button";
import { CloudSun } from "lucide-react";
import {
  WeatherModal,
  type WeatherData,
} from "@/components/modals/weather-modal";

import type { Destination, Drone } from "@/types";

const getDroneColor = (id: string) => {
  const match = id.match(/\d+/);
  const index = match ? Number.parseInt(match[0], 10) : 0;

  const hue = (index * 137.508) % 360; // golden angle

  return `hsl(${hue}, 65%, 50%)`;
};

interface MapViewProps {
  destinations: Destination[];
  drones: Drone[];
  flyToPosition: [number, number] | null;
  onMapRightClick?: (latlng: LeafletLatLng) => void;
  setFlyToPosition: (position: [number, number] | null) => void;
}

// Right-click handler (kept outside)
function MapRightClickHandler({
  onMapRightClick,
}: {
  onMapRightClick?: (latlng: LeafletLatLng) => void;
}) {
  useMapEvent("contextmenu", (e) => {
    onMapRightClick?.(e.latlng);
  });

  return null;
}

function MapRefHandler({
  mapRef,
}: {
  mapRef: MutableRefObject<LeafletMap | null>;
}) {
  const map = useMap();

  useEffect(() => {
    mapRef.current = map;
  }, [map, mapRef]);

  return null;
}

export default function MapView({
  drones = [],
  destinations = [],
  flyToPosition,
  onMapRightClick,
  setFlyToPosition,
}: MapViewProps) {
  const { t } = useTranslation();

  const mapRef = useRef<LeafletMap>(null);

  const [paths, setPaths] = useState<Record<string, [number, number][]>>({});
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [weatherOpen, setWeatherOpen] = useState(false);

  const loadWeather = async () => {
    setWeatherLoading(true);
    setWeatherError(null);

    const center = mapRef.current?.getCenter();
    if (!center) {
      setWeatherError("Map is not ready yet. Try again in a moment.");
      setWeatherLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${center.lat}&longitude=${center.lng}&current_weather=true&timezone=auto`,
      );

      if (!response.ok) {
        throw new Error("Unable to fetch weather data.");
      }

      const json = await response.json();
      const currentWeather = json.current_weather;

      if (!currentWeather) {
        throw new Error("No weather data returned from Open-Meteo.");
      }

      setWeather({
        temperature: currentWeather.temperature,
        windspeed: currentWeather.windspeed,
        winddirection: currentWeather.winddirection,
        weathercode: currentWeather.weathercode,
        time: currentWeather.time,
        latitude: json.latitude,
        longitude: json.longitude,
        timezone: json.timezone,
        elevation: json.elevation,
      });
    } catch (error) {
      setWeather(null);
      setWeatherError(
        error instanceof Error
          ? error.message
          : "Unexpected error while loading weather.",
      );
    } finally {
      setWeatherLoading(false);
    }
  };

  useEffect(() => {
    setPaths((prev) => {
      const updated = { ...prev };

      drones.forEach((drone) => {
        if (
          typeof drone?.latitude === "number" &&
          typeof drone?.longitude === "number"
        ) {
          const point: [number, number] = [drone.latitude, drone.longitude];

          if (updated[drone.id]) {
            const last = updated[drone.id][updated[drone.id].length - 1];

            // avoid duplicates (optional but important)
            if (last[0] !== point[0] || last[1] !== point[1]) {
              updated[drone.id] = [...updated[drone.id], point];
            }
          } else {
            updated[drone.id] = [point];
          }
        }
      });

      return updated;
    });
  }, [drones]);

  // Calculate initial center = average position of all valid drones
  const initialCenter = useMemo<[number, number]>(() => {
    const validDrones = drones.filter(
      (d: Drone) =>
        typeof d?.latitude === "number" && typeof d?.longitude === "number",
    );

    if (validDrones.length === 0) {
      return [40.4093, 49.8671]; // Baku default
    }

    const avgLat =
      validDrones.reduce((sum, drone) => sum + drone.latitude, 0) /
      validDrones.length;

    const avgLon =
      validDrones.reduce((sum, drone) => sum + drone.longitude, 0) /
      validDrones.length;

    return [avgLat, avgLon];
  }, [drones]);

  return (
    <div className="relative h-full w-full">
      <MapContainer
        attributionControl={false}
        center={flyToPosition ?? initialCenter}
        scrollWheelZoom={true}
        style={{
          height: "100%",
          width: "100%",
          borderRadius: "8px",
          zIndex: 1,
        }}
        zoom={13}
      >
        <MapRefHandler mapRef={mapRef} />
        <DistanceMeasure />

        {Object.entries(paths).map(([droneId, positions]) => (
          <Polyline
            key={droneId}
            pathOptions={{
              color: getDroneColor(droneId),
              weight: 3,
            }}
            positions={positions}
          />
        ))}

        <CachedTileLayer
          maxZoom={17}
          minZoom={1}
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapRightClickHandler onMapRightClick={onMapRightClick} />

        {/* Drone Markers */}
        {drones.map((drone) => {
          if (!(drone?.latitude && drone?.longitude)) {
            return null;
          }

          return (
            <DroneMarker
              color={getDroneColor(drone.id)}
              drone={drone}
              key={drone.id}
              onClick={() =>
                setFlyToPosition([drone.latitude, drone.longitude])
              }
            />
          );
        })}

        {/* Destination Markers */}
        {destinations.map((dest) => (
          <DestinationMarker
            destination={dest}
            key={dest.id}
            onClick={() => setFlyToPosition([dest.lat, dest.lon])}
          />
        ))}

        {flyToPosition && <FlyToMarker position={flyToPosition} />}
      </MapContainer>

      <div className="absolute right-4 top-4 z-20 flex flex-col gap-2">
        <Button
          className="cursor-pointer rounded-md border border-slate-400 bg-white hover:bg-slate-100 dark:hover:bg-white"
          onClick={() => {
            setWeatherOpen(true);
            loadWeather();
          }}
          variant="secondary"
          size="icon"
          aria-label="Show weather"
        >
          <CloudSun className="h-4 w-4 text-slate-800 dark:text-slate-800!" />
        </Button>
      </div>

      <WeatherModal
        open={weatherOpen}
        onOpenChange={(open) => setWeatherOpen(open)}
        weather={weather}
        loading={weatherLoading}
        error={weatherError}
      />
    </div>
  );
}
