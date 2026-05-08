import type { LatLng } from "@/types";
import { EARTH_RADIUS } from "./constants";

// Convert degrees to radians
const toRadians = (deg: number): number => (deg * Math.PI) / 180;

// Convert radians to degrees
const toDegrees = (rad: number): number => (rad * 180) / Math.PI;

/**
 * Calculates a destination point given a starting lat/lng, distance (m), and bearing (deg)
 */
export function destinationPoint(
  lat: number,
  lng: number,
  distance: number,
  bearing: number
): LatLng {
  const angularDistance = distance / EARTH_RADIUS;
  const bearingRad = toRadians(bearing);

  const latRad = toRadians(lat);
  const lngRad = toRadians(lng);

  const newLatRad = Math.asin(
    Math.sin(latRad) * Math.cos(angularDistance) +
      Math.cos(latRad) * Math.sin(angularDistance) * Math.cos(bearingRad)
  );

  const newLngRad =
    lngRad +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(angularDistance) * Math.cos(latRad),
      Math.cos(angularDistance) - Math.sin(latRad) * Math.sin(newLatRad)
    );

  return [toDegrees(newLatRad), toDegrees(newLngRad)];
}

// Returns an array of coordinates forming the specified shape around a center
export function getShapeCoordinates(
  shapeName: string,
  center: LatLng,
  radiusMeters: number,
  droneCount: number
): LatLng[] {
  const [centerLat, centerLng] = center;

  const shapeVertexMap: Record<string, number> = {
    point: 1,
    triangle: 3,
    square: 4,
    rectangle: 4,
    pentagon: 5,
    hexagon: 6,
    star: 10,
    circle: 12,
  };

  const vertexCount = shapeVertexMap[shapeName];
  if (!vertexCount) {
    return [];
  }

  const points: LatLng[] = [];

  if (shapeName === "point") {
    points.push([centerLat, centerLng]);
    return points;
  }

  const createCircleOrStarPoints = (
    count: number,
    radiusFn: (i: number) => number
  ) => {
    for (let i = 0; i < count; i++) {
      const angle = (360 / count) * i - 90;
      points.push(destinationPoint(centerLat, centerLng, radiusFn(i), angle));
    }
  };

  if (shapeName === "star") {
    const outerRadius = radiusMeters;
    const innerRadius = radiusMeters * 0.5;
    createCircleOrStarPoints(10, (i) =>
      i % 2 === 0 ? outerRadius : innerRadius
    );
    return points;
  }

  if (shapeName === "circle") {
    const count = Math.max(droneCount, 12);
    createCircleOrStarPoints(count, () => radiusMeters);
    return points;
  }

  // Regular polygons
  const vertices: LatLng[] = [];
  for (let i = 0; i < vertexCount; i++) {
    const angle = (360 / vertexCount) * i - 90;
    vertices.push(destinationPoint(centerLat, centerLng, radiusMeters, angle));
  }

  if (droneCount <= vertexCount) {
    points.push(...vertices.slice(0, droneCount));
  } else {
    const edges = vertices.length;
    const dronesPerEdge = Math.ceil(droneCount / edges);

    for (let i = 0; i < edges; i++) {
      const start = vertices[i];
      const end = vertices[(i + 1) % edges];
      for (let j = 0; j < dronesPerEdge; j++) {
        if (points.length >= droneCount) {
          break;
        }
        const t = j / dronesPerEdge;
        points.push([
          start[0] + t * (end[0] - start[0]),
          start[1] + t * (end[1] - start[1]),
        ]);
      }
    }
    points.splice(droneCount); // ensure exactly droneCount points
  }

  return points;
}

// Default drone counts per shape
export const shapeDroneCountMap: Record<string, number> = {
  point: 1,
  triangle: 3,
  rectangle: 4,
  square: 4,
  pentagon: 5,
  hexagon: 6,
  star: 10,
  circle: 12,
};
