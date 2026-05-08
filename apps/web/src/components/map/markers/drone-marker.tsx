import type { LeafletMouseEvent } from "leaflet";
import { useTranslation } from "react-i18next";
import { Marker, Popup } from "react-leaflet";
import { colorByState, createDroneIcon } from "@/helpers/icons";
import type { Drone } from "@/types";

interface DroneMarkerProps {
  color: any;
  drone: Drone;
  onClick: (e: LeafletMouseEvent) => void;
}

export default function DroneMarker({
  color,
  drone,
  onClick,
}: DroneMarkerProps) {
  const { t } = useTranslation();

  // we may add drone states in the future, e.g., idle, not-responding etc.
  // for now state is non-existent, only actual telemetry data is read.
  const finalColor =
    color || colorByState[drone.state as string] || "limegreen";
  const icon = createDroneIcon(color);

  return (
    <Marker
      eventHandlers={{ click: onClick }}
      icon={icon}
      key={`${t("drone")}-${drone.id}`}
      position={[drone.latitude, drone.longitude]}
      title={`${t("drone")} ${drone.id}`}
    >
      <Popup>
        <div
          style={{
            fontFamily: "'Segoe UI', Tahoma, sans-serif",
            fontSize: "0.9rem",
            lineHeight: "1.4",
            color: "#333",
            minWidth: "180px",
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
            {t("drone")} <span style={{ color: finalColor }}>{drone.id}</span>
          </div>

          <div>
            <strong>{t("battery")}:</strong> {drone.battery}%
          </div>

          <div>
            <strong>{t("position")}:</strong> {drone.latitude.toFixed(6)},{" "}
            {drone.longitude.toFixed(6)}
          </div>

          <div>
            <strong>{t("altitude")}:</strong> {drone.altitude.toFixed(2)} m
          </div>

          <div>
            <strong>{t("relative_altitude")}:</strong>{" "}
            {drone.relativeAltitude.toFixed(2)} m
          </div>
        </div>
      </Popup>
    </Marker>
  );
}
