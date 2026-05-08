import type { Drone } from "@/types";
import { DISTANCE_BTW_DRONES } from "./constants";
import { getShapeCoordinates } from "./shapeUtils";

/**
 * Assigns drones to a geometric shape, returning the updated drones array.
 * @param drones - Array of drones
 * @param selectedDroneIds - Set of drone IDs to assign
 * @param shapeName - Name of the geometric shape
 * @param center - Center coordinates [lat, lng]
 * @returns updated array of drones with target positions
 */
export function assignDronesToShape(
  drones: Drone[],
  selectedDroneIds: Set<string>,
  shapeName: string,
  center: [number, number]
): Drone[] {
  if (!selectedDroneIds || selectedDroneIds.size === 0) {
    return drones;
  }

  const selectedIdsArray = Array.from(selectedDroneIds);
  const positions = getShapeCoordinates(
    shapeName,
    center,
    DISTANCE_BTW_DRONES,
    selectedIdsArray.length
  );

  return drones.map((d) => {
    if (selectedDroneIds.has(d.id)) {
      const idx = selectedIdsArray.indexOf(d.id);
      return {
        ...d,
        targetLat: positions[idx][0],
        targetLng: positions[idx][1],
        state: "enroute" as const,
      };
    }
    return { ...d };
  });
}
