import L from "leaflet";
import { MapPin } from "lucide-react";
import ReactDOMServer from "react-dom/server";
import { useTranslation } from "react-i18next";
import { Marker, Popup } from "react-leaflet";
import type { Destination } from "@/types";

interface DestinationMarkerProps {
  destination: Destination;
  onClick: () => void;
}

const createReactDivIcon = () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <MapPin color="red" size={30} />
    </div>
  );

  return new L.DivIcon({
    className: "react-leaflet-marker",
    html,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
  });
};

export default function DestinationMarker({
  destination,
  onClick,
}: DestinationMarkerProps) {
  const { t } = useTranslation();
  const icon = createReactDivIcon();

  return (
    <Marker
      eventHandlers={{ click: onClick }}
      icon={icon}
      position={[destination.lat, destination.lon]}
      title={`${t("destination")} ${destination.id}`}
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
            {t("destination")} <span>{destination.id}</span>
          </div>

          <div>
            <strong>{t("position")}:</strong> {destination.lat.toFixed(6)},{" "}
            {destination.lon.toFixed(6)}
          </div>

          <div>
            <strong>{t("assigned_drones")}:</strong>{" "}
            {destination.assignedDrones.length}
          </div>
        </div>
      </Popup>
    </Marker>
  );
}
