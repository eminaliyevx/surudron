export type LatLng = [number, number];

/**
 * Calculates the Haversine distance between two points in meters
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6_371_000; // Earth radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Moves a point from current coordinates towards a target by maxDistance (meters)
 */
export function moveTowards(
  currentLat: number,
  currentLng: number,
  targetLat: number,
  targetLng: number,
  maxDistance: number
): LatLng {
  const distance = haversineDistance(
    currentLat,
    currentLng,
    targetLat,
    targetLng
  );
  if (distance <= maxDistance) {
    return [targetLat, targetLng];
  }

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const lat1 = toRad(currentLat);
  const lng1 = toRad(currentLng);
  const lat2 = toRad(targetLat);
  const lng2 = toRad(targetLng);

  const y = Math.sin(lng2 - lng1) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(lng2 - lng1);
  const bearing = Math.atan2(y, x);
  const angularDistance = maxDistance / 6_371_000; // Earth radius in meters

  const newLat = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
      Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing)
  );
  const newLng =
    lng1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(newLat)
    );

  return [toDeg(newLat), toDeg(newLng)];
}
