import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import MapView from "@/components/map/map-view";
import { Navbar } from "@/components/navbar";
import { TelemetryTable } from "@/components/telemetry-table";
import { useGlobalContext } from "@/context";
import type { Destination, Drone } from "@/types";

export function App() {
  const [drones, setDrones] = useState<Drone[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [flyToPosition, setFlyToPosition] = useState<[number, number]>(null);

  const { connected } = useGlobalContext();

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    async function setupListener() {
      if (!connected) {
        setDrones([]);
        return;
      }

      try {
        const { listen } = await import("@tauri-apps/api/event");
        unlisten = await listen<Drone[]>("serial-data", (event) => {
          setDrones(event.payload);
        });
      } catch (err) {
        console.error("Failed to setup serial listener:", err);
      }
    }

    setupListener();

    return () => {
      if (unlisten) unlisten();
    };
  }, [connected]);

  const handleAddDestination = ({ lat, lng }: { lat: number; lng: number }) => {
    setDestinations((prev) => [
      ...prev,
      {
        id: `dest-${Date.now()}`,
        lat,
        lon: lng,
        assignedDrones: [],
      },
    ]);
  };

  const handleFlyToDrone = (drone: Drone) => {
    if (drone.latitude && drone.longitude) {
      setFlyToPosition([drone.latitude, drone.longitude]);
    }
  };

  const handleFlyToDestination = (destination: Destination) => {
    if (destination) {
      setFlyToPosition([destination.lat, destination.lon]);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      <Navbar
        destinations={destinations}
        drones={drones}
        setDestinations={setDestinations}
        setDrones={setDrones}
      />
      <div className="flex flex-1 flex-col gap-3 overflow-hidden p-3">
        <MapView
          destinations={destinations}
          drones={drones}
          flyToPosition={flyToPosition}
          onMapRightClick={handleAddDestination}
          setFlyToPosition={setFlyToPosition}
        />
        <div className="overflow-auto">
          <TelemetryTable
            destinations={destinations}
            drones={drones}
            onFlyToDestination={handleFlyToDestination}
            onFlyToDrone={handleFlyToDrone}
            setDestinations={setDestinations}
          />
        </div>
      </div>
    </div>
  );
}
