import { Settings, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { DroneSettingsModal } from "@/components/modals/drone-settings-modal";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Destination, Drone } from "@/types";

interface TelemetryTableProps {
  destinations: Destination[];
  drones: Drone[];
  onFlyToDestination: (destination: Destination) => void;
  onFlyToDrone: (drone: Drone) => void;
  setDestinations: React.Dispatch<React.SetStateAction<Destination[]>>;
}

const getBatteryColor = (battery: number) => {
  if (battery < 30) {
    return "bg-destructive";
  }
  if (battery < 60) {
    return "bg-warning";
  }
  return "bg-success";
};

export function TelemetryTable({
  drones,
  destinations,
  setDestinations,
  onFlyToDrone,
  onFlyToDestination,
}: TelemetryTableProps) {
  const { t } = useTranslation();
  const [selectedDrone, setSelectedDrone] = useState<string | null>(null);

  const handleDeleteDestination = (id: string) => {
    setDestinations((prev) => prev.filter((d) => d.id !== id));
  };

  const selectedDroneObject = drones.find(
  (d) => d.id === selectedDrone
);

  return (
    <div className="min-h-96">
      <div className="resize-y overflow-hidden rounded-md border border-border bg-card">
        <Tabs defaultValue="telemetry">
          {/* Tabs Header */}
          <div className="flex items-center gap-3 border-border border-b px-4 py-2">
            <div className="h-2 w-2 animate-pulse-glow rounded-full bg-primary" />
            <TabsList className="h-8 bg-secondary">
              <TabsTrigger
                className="h-6 px-3 font-mono text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                value="telemetry"
              >
                {t("drone_dashboard")}
              </TabsTrigger>
              <TabsTrigger
                className="h-6 px-3 font-mono text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                value="destinations"
              >
                {t("destinations")}
              </TabsTrigger>
            </TabsList>
            <span className="ml-auto font-mono text-muted-foreground text-xs">
              {drones.length} {t("drones")}
            </span>
          </div>

          {/* Telemetry Tab */}
          <TabsContent className="mt-0" value="telemetry">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  {[
                    t("id"),
                    t("name"),
                    t("latitude"),
                    t("longitude"),
                    t("altitude"),
                    t("relative_altitude"),
                    t("ground_speed"),
                    t("battery"),
                    t("last_update"),
                    t("actions"),
                  ].map((header) => (
                    <TableHead
                      className="font-mono text-muted-foreground text-xs"
                      key={header}
                    >
                      {header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {drones.map((drone) => {
                  const lat = drone.latitude.toFixed(5) ?? "-";
                  const lon = drone.longitude?.toFixed(5) ?? "-";
                  const relAlt = drone.relativeAltitude?.toFixed(2) ?? "-";
                  const alt = drone.altitude?.toFixed(2) ?? "-";
                  const speed = drone.groundSpeed?.toFixed(4) ?? "-";
                  const battery = drone.battery ?? 0;

                  return (
                    <TableRow
                      className="border-border hover:cursor-pointer hover:bg-secondary/50"
                      key={drone.id}
                      onClick={() => {
                        onFlyToDrone(drone);
                      }}
                    >
                      <TableCell className="font-mono text-primary text-sm">
                        {drone.id}
                      </TableCell>
                      <TableCell className="text-sm">
                        {`Drone ${drone.id}`}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{lat}</TableCell>
                      <TableCell className="font-mono text-sm">{lon}</TableCell>
                      <TableCell className="font-mono text-sm">{alt}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {relAlt}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {speed} m/s
                      </TableCell>
                      <TableCell className="px-2 py-0 align-middle font-mono text-sm">
                        <div className="flex h-4 items-center gap-2">
                          {/* Battery bar container */}
                          <div className="h-2 flex-1 overflow-hidden rounded bg-muted/30">
                            <div
                              className={`h-full rounded ${getBatteryColor(battery)}`}
                              style={{ width: `${battery}%` }}
                            />
                          </div>

                          {/* Percentage text */}
                          <span className="w-8 text-right font-mono text-xs">
                            {battery}%
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="font-mono text-muted-foreground text-xs">
                        {drone.lastUpdate
                          ? new Date(drone.lastUpdate).toLocaleTimeString()
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Button
                          className="text-muted-foreground hover:bg-gray-600/20 hover:text-primary dark:hover:bg-gray-700/30"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDrone(drone.id);
                          }}
                          size="icon"
                          variant="ghost"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TabsContent>

          {/* Destinations Tab */}
          <TabsContent className="mt-0" value="destinations">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="w-1/4 font-mono text-muted-foreground text-xs">
                    {t("id")}
                  </TableHead>
                  <TableHead className="w-1/6 font-mono text-muted-foreground text-xs">
                    {t("latitude")}
                  </TableHead>
                  <TableHead className="w-1/6 font-mono text-muted-foreground text-xs">
                    {t("longitude")}
                  </TableHead>
                  <TableHead className="w-1/6 font-mono text-muted-foreground text-xs">
                    {t("assigned_drones_table")}
                  </TableHead>
                  <TableHead className="w-1/6 text-center font-mono text-muted-foreground text-xs">
                    {t("actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {destinations.length === 0 && (
                  <TableRow>
                    <TableCell
                      className="py-4 text-center font-mono text-muted-foreground"
                      colSpan={5}
                    >
                      {t("no_destinations")}
                    </TableCell>
                  </TableRow>
                )}

                {destinations.map((dest, index) => {
                  const bgColor = index % 2 === 0 ? "bg-card" : "bg-muted/5";

                  return (
                    <TableRow
                      className={`${bgColor} cursor-pointer hover:bg-secondary/50`}
                      key={dest.id}
                      onClick={() => onFlyToDestination(dest)}
                    >
                      <TableCell className="truncate font-mono text-primary text-sm">
                        {dest.id}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {dest.lat}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {dest.lon}
                      </TableCell>
                      <TableCell className="text-center font-mono text-sm">
                        {dest.assignedDrones?.length ?? 0}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          aria-label={t("delete_destination", { id: dest.id })}
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDestination(dest.id);
                          }}
                          size="icon"
                          variant="destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </div>

      {selectedDrone && (
        <DroneSettingsModal
          drone={selectedDroneObject}
          destinations={destinations}
          droneId={selectedDrone}
          onClose={() => setSelectedDrone(null)}
        />
      )}
    </div>
  );
}
