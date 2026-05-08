import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, useMapEvent } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import type { LatLng as LeafletLatLng, Map as LeafletMap } from "leaflet";
import { Polyline } from "react-leaflet";
import { CachedTileLayer } from "@/components/map/cached-tile-layer";
import DestinationMarker from "@/components/map/markers/destination-marker";
import DistanceMeasure from "@/components/map/markers/distance-measurement-component";
import DroneMarker from "@/components/map/markers/drone-marker";
import FlyToMarker from "@/components/map/markers/fly-to-marker";

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

export default function MapView({
  drones = [],
  destinations = [],
  flyToPosition,
  onMapRightClick,
  setFlyToPosition,
}: MapViewProps) {
  const mapRef = useRef<LeafletMap>(null);

  const [paths, setPaths] = useState<Record<string, [number, number][]>>({});

  useEffect(() => {
    setPaths((prev) => {
      const updated = { ...prev };

      drones.forEach((drone) => {
        if (
          typeof drone?.latitude === "number" &&
          typeof drone?.longitude === "number"
        ) {
          const point: [number, number] = [
            drone.latitude,
            drone.longitude,
          ];

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
        typeof d?.latitude === "number" &&
        typeof d?.longitude === "number"
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
      whenReady={() => {
        if (mapRef.current) {
          console.log("Map is ready");
        }
      }}
      zoom={13}
    >
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
  );
}
