import L, { type DivIcon } from "leaflet";
import { Drone, MapPin } from "lucide-react";
import type { JSX } from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Drone icon mapping for different states
export const colorByState: Record<string, string> = {
  idle: "black",
  forming: "blue",
  enroute: "green",
  error: "red",
  returning: "orange",
};

// Create a Leaflet icon for a drone
export function createDroneIcon(color = "black"): DivIcon {
  const DroneIcon = Drone; // use the Drone icon from Lucide
  const svgMarkup = renderToStaticMarkup(
    <DroneIcon color={color} size={20} strokeWidth={2} />
  );

  return new L.DivIcon({
    html: `
      <div style="
        width: 36px;
        height: 36px;
        background: white;
        border-radius: 50%;
        display: flex;
        justify-content: center;
        align-items: center;
        box-shadow: 0 0 6px rgba(0,0,0,0.6);
      ">
        ${svgMarkup}
      </div>`,
    className: "",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

// Create a Leaflet icon for a target/waypoint
export function createTargetIcon(): DivIcon {
  const svgMarkup = renderToStaticMarkup(
    <MapPin color="red" size={28} strokeWidth={2} />
  );

  return new L.DivIcon({
    html: `
      <div style="display:flex; justify-content:center; align-items:center;">
        ${svgMarkup}
      </div>`,
    className: "",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

// Create a small battery status component
export function createBatteryIcon(percentage: number): JSX.Element {
  let bg = "#4caf50";
  if (percentage < 30) {
    bg = "#f44336";
  } else if (percentage < 60) {
    bg = "#ff9800";
  }

  return (
    <span
      style={{
        backgroundColor: bg,
        color: "white",
        padding: "2px 8px",
        borderRadius: "4px",
        fontWeight: 500,
      }}
    >
      🔋 {percentage}%
    </span>
  );
}
