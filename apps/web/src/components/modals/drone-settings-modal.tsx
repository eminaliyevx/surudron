import { Camera, Home, MapPin, PlaneLanding, PlaneTakeoff } from "lucide-react";
import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import DroneVideoStreamer from "@/components/drone-video-streamer";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Destination, Drone } from "@/types";

const Card = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-2">
    <div className="text-xs font-semibold text-muted-foreground uppercase">
      {title}
    </div>
    <div className="space-y-1 text-sm">{children}</div>
  </div>
);

interface Props {
  drone: Drone;
  destinations: Destination[];
  droneId: string;
  onClose: () => void;
}

const actions = [
  {
    label: "go_to_destination",
    value: "goto",
    icon: MapPin,
    description: "action_descriptions.navigate_to_waypoint",
  },
  {
    label: "takeoff",
    value: "takeoff",
    icon: PlaneTakeoff,
    description: "action_descriptions.initiate_takeoff",
  },
  {
    label: "land",
    value: "land",
    icon: PlaneLanding,
    description: "action_descriptions.begin_landing",
  },
  {
    label: "return_to_base",
    value: "return",
    icon: Home,
    description: "action_descriptions.return_to_launch",
  },
  {
    label: "open_camera",
    value: "camera",
    icon: Camera,
    description: "action_descriptions.view_camera",
  },
  {
    label: "details",
    value: "details",
    icon: Camera,
    description: "action_descriptions.details",
  },
];

export function DroneSettingsModal({ drone, droneId, onClose, destinations }: Props) {
  const [showDestinations, setShowDestinations] = useState(false);
  const { t } = useTranslation();
  const [showCamera, setShowCamera] = useState(false);
  const [showDroneDetails, setShowDroneDetails] = useState(false);

  const sendCommand = async (commandBody: any) => {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("send_command", { command: commandBody });
    } catch (error) {
      console.error("Failed to send command over serial:", error);
    }
  };

  return (
    <>
      <Dialog onOpenChange={onClose} open={droneId != null && !showCamera}>
        <DialogContent className="h-fit border-border bg-card sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="glow-text font-mono text-primary">
              <Trans
                components={{
                  blue: <span style={{ color: "#1976d2", fontWeight: 600 }} />,
                }}
                i18nKey="drone_number_actions"
                values={{ id: droneId }}
              />
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {actions.map((action) => (
              <Button
                className="flex flex-col items-start gap-1 border-border bg-secondary py-12 transition-colors hover:border-primary/40 hover:bg-muted"
                key={action.label}
                onClick={() => {
                  if (action.value === "camera") {
                    setShowCamera(true);
                  } else if (action.value === "details") {
                    setShowDroneDetails(true);
                  } else if (action.value === "takeoff") {
                    sendCommand({ type: "takeoff", id: droneId });
                    onClose();
                  } else if (action.value === "land") {
                    sendCommand({ type: "land", id: droneId });
                    onClose();
                  } else {
                    setShowDestinations(true);
                  }
                }}
                variant="outline"
              >
                <div className="flex items-center gap-2 text-foreground">
                  <action.icon className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">{t(action.label)}</span>
                </div>
                <span className="text-muted-foreground text-xs">
                  {t(action.description)}
                </span>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {showDroneDetails && (
        <Dialog open onOpenChange={() => setShowDroneDetails(false)}>
          <DialogContent className="border-border bg-card w-[90vw] max-w-6xl">             
            <DialogHeader>
              <DialogTitle className="glow-text font-mono text-primary">
                {drone.name}
              </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto pr-2">              
              <Card title="Position & Motion">
                <div>Lat: {drone.latitude.toFixed(6)}</div>
                <div>Lon: {drone.longitude.toFixed(6)}</div>
                <div>Alt: {drone.altitude.toFixed(2)} m</div>
                <div>Relative Alt: {drone.relativeAltitude.toFixed(2)} m</div>

                <div className="pt-2 text-muted-foreground text-xs">Motion</div>
                <div>VX: {drone.vx}</div>
                <div>VY: {drone.vy}</div>
                <div>VZ: {drone.vz}</div>
                <div>Ground: {drone.groundSpeed}</div>
              </Card>

              <Card title="Orientation & Power">
                <div>Roll: {drone.roll}</div>
                <div>Pitch: {drone.pitch}</div>
                <div>Yaw: {drone.yaw}</div>
                <div>Heading: {drone.heading}</div>

                <div className="pt-2 text-muted-foreground text-xs">Power</div>
                <div>Battery: {drone.battery}%</div>
                <div>Voltage: {drone.batteryVoltage} V</div>
                <div>Current: {drone.batteryCurrent} A</div>
                <div>Throttle: {drone.throttle}</div>
              </Card>

              <Card title="GPS & System">
                <div>Fix: {drone.gpsFix}</div>
                <div>Satellites: {drone.gpsSatellites}</div>
                <div>HDOP: {drone.gpsHdop}</div>

                <div className="pt-2 text-muted-foreground text-xs">System</div>
                <div>Mode: {drone.flightMode}</div>
                <div>Status: {drone.systemStatus}</div>
                <div>CPU: {drone.cpuLoad}</div>
                <div>EKF: {drone.ekfFlags}</div>
              </Card>

              <Card title="Mission & Health">
                <div>WP Seq: {drone.wpSeq}</div>
                <div>WP Dist: {drone.wpDist}</div>

                <div className="pt-2 text-muted-foreground text-xs">Health</div>
                <div>Vib X: {drone.vibrationX}</div>
                <div>Vib Y: {drone.vibrationY}</div>
                <div>Vib Z: {drone.vibrationZ}</div>
              </Card>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDroneDetails(false)}
              >
                {t("cancel")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Destinations modal */}
      {showDestinations && (
        <Dialog onOpenChange={() => setShowDestinations(false)} open>
          <DialogContent className="border-border bg-card sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="glow-text font-mono text-primary">
                {t("available_destinations")}
              </DialogTitle>
            </DialogHeader>

            <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
              {destinations.map((dest) => (
                <Button
                  className="justify-start text-foreground hover:border-primary/40 hover:bg-muted hover:text-foreground"
                  key={dest.id}
                  onClick={() => {
                    sendCommand({
                      type: "goto",
                      id: droneId,
                      lat: dest.lat,
                      lon: dest.lon,
                    });
                    setShowDestinations(false);
                    onClose();
                  }}
                  variant="outline"
                >
                  {dest.id} — {dest.lat.toFixed(5)}, {dest.lon.toFixed(5)}
                </Button>
              ))}

              {destinations.length === 0 && (
                <div className="py-4 text-center text-muted-foreground">
                  {t("no_destinations")}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                className="hover:bg-slate-700 hover:text-white"
                onClick={() => setShowDestinations(false)}
                variant="outline"
              >
                {t("cancel")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {showCamera && (
        <DroneVideoStreamer droneId={droneId} setShowCamera={setShowCamera} />
      )}
    </>
  );
}
