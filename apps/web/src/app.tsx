import { contract } from "@surudron/api/contract";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import MapView from "@/components/map/map-view";
import { Navbar } from "@/components/navbar";
import { TelemetryTable } from "@/components/telemetry-table";
import { useGlobalContext } from "@/context";
import type { Destination, Drone } from "@/types";

import { orpc } from "./client";
export function App() {
  const [drones, setDrones] = useState<Drone[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [flyToPosition, setFlyToPosition] = useState<[number, number]>(null);

  const { connected } = useGlobalContext();

  // STREAM FROM THE SERIAL PORT
  // const { data: stream } = useQuery(
  //   orpc.serial.telemetry.experimental_streamedOptions({
  //     context: { cache: true },
  //     queryFnOptions: {
  //       refetchMode: "reset",
  //       maxChunks: 3,
  //     },
  //     retry: true,
  //     enabled: connected,
  //   }),
  // );

  // STREAM FROM ARDUPILOT
  const ardupilotQuery = useQuery(
    orpc.serial.telemetry.experimental_liveOptions({
      context: { cache: true },
      queryFnOptions: {
        refetchMode: "reset",
        maxChunks: 1,
      },
      retry: true,
      enabled: connected,
    }),
  );

  const { data: ardupilotStream } = ardupilotQuery;

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
        drones={ardupilotStream ? ardupilotStream.data : []}
        setDestinations={setDestinations}
        setDrones={setDrones}
      />
      <div className="flex flex-1 flex-col gap-3 overflow-hidden p-3">
        <MapView
          destinations={destinations}
          drones={ardupilotStream ? ardupilotStream.data : []}
          flyToPosition={flyToPosition}
          onMapRightClick={handleAddDestination}
          setFlyToPosition={setFlyToPosition}
        />
        <div className="overflow-auto">
          <TelemetryTable
            destinations={destinations}
            drones={ardupilotStream ? ardupilotStream.data : []}
            onFlyToDestination={handleFlyToDestination}
            onFlyToDrone={handleFlyToDrone}
            setDestinations={setDestinations}
          />
        </div>
      </div>
    </div>
  );
}
