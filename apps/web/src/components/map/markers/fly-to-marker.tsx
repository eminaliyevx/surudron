import type { LatLngExpression } from "leaflet";
import { useEffect } from "react";
import { useMap } from "react-leaflet";

interface FlyToMarkerProps {
  position?: LatLngExpression | null;
}

export default function FlyToMarker({ position }: FlyToMarkerProps) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.flyTo(position, 15, { duration: 1 });
    }
  }, [position, map]);

  return null;
}
