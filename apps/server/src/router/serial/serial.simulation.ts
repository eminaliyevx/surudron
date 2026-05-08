import type { Nullable } from "@surudron/shared/types";

import type { Copter } from "../../types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const TICK_MS = 100;
const COPTER_COUNT = 3;
const BASE_LAT = 47.3977; // Emmen Airfield, Switzerland
const BASE_LON = 8.0478;
const ORBIT_RADIUS_DEG = 0.0005; // ≈ 55 m radius
const ORBIT_OMEGA = 0.08; // rad/s → ≈ 4.4 m/s ground speed
const ORBIT_RADIUS_M = ORBIT_RADIUS_DEG * 111_320;
const GOTO_SPEED_MS = 8; // m/s cruise speed toward waypoint
const ARRIVED_THRESHOLD_M = 1.5; // m — considered arrived
const TAKEOFF_SPEED_MS = 3; // m/s climb rate
const LAND_SPEED_MS = 2; // m/s descent rate
const DEFAULT_TAKEOFF_ALT = 30; // m AGL

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type CopterMode = "orbit" | "goto" | "takeoff" | "land";

type Target = { lat: number; lon: number };

type SerialCopterState = {
  id: string;
  name: string;
  phase: number;
  battery: number;
  mode: CopterMode;
  lat: number;
  lon: number;
  alt: number;
  armed: boolean;
  target: Nullable<Target>;
  targetAlt: number;
};

export type DroneCommand =
  | { type: "goto"; id: string; lat: number; lon: number }
  | { type: "takeoff"; id: string; altitude?: number }
  | { type: "land"; id: string };

type SnapshotCallback = (snapshot: Copter[]) => void;

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const serialCopters: SerialCopterState[] = Array.from({ length: COPTER_COUNT }, (_, index) => {
  const phase = (index * 2 * Math.PI) / COPTER_COUNT;

  return {
    id: `drone-${index + 1}`,
    name: `drone-${index + 1}`,
    phase,
    battery: 100 - index * 5,
    mode: "orbit" as CopterMode,
    lat: BASE_LAT + ORBIT_RADIUS_DEG * Math.cos(phase),
    lon: BASE_LON + ORBIT_RADIUS_DEG * Math.sin(phase),
    alt: DEFAULT_TAKEOFF_ALT,
    armed: true,
    target: null,
    targetAlt: DEFAULT_TAKEOFF_ALT,
  };
});

// ---------------------------------------------------------------------------
// Per-tick state builder
// ---------------------------------------------------------------------------
const buildCopterState = (copter: SerialCopterState, tSec: number): Copter => {
  const dt = TICK_MS / 1000;

  let vx = 0;
  let vy = 0;
  let vz = 0;
  let roll = 0;
  let flightMode: number;

  switch (copter.mode) {
    case "orbit": {
      const angle = copter.phase + ORBIT_OMEGA * tSec;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      copter.lat = BASE_LAT + ORBIT_RADIUS_DEG * cosA;
      copter.lon = BASE_LON + ORBIT_RADIUS_DEG * sinA;
      copter.alt = 30 + 5 * Math.sin(tSec * 0.1 + copter.phase);
      copter.armed = true;

      vx = -ORBIT_RADIUS_M * ORBIT_OMEGA * sinA;
      vy = ORBIT_RADIUS_M * ORBIT_OMEGA * cosA;
      vz = 0.3 * Math.sin(tSec * 0.15 + copter.phase);
      roll = 0.04 * Math.sin(angle + Math.PI);
      flightMode = 3; // AUTO
      break;
    }

    case "goto": {
      if (copter.target) {
        const dNorth = (copter.target.lat - copter.lat) * 111_320;
        const dEast =
          (copter.target.lon - copter.lon) * 111_320 * Math.cos((copter.lat * Math.PI) / 180);
        const dist = Math.sqrt(dNorth * dNorth + dEast * dEast);

        if (dist < ARRIVED_THRESHOLD_M) {
          copter.lat = copter.target.lat;
          copter.lon = copter.target.lon;
          copter.target = null;
        } else {
          const speed = Math.min(GOTO_SPEED_MS, dist / dt);
          vx = speed * (dNorth / dist);
          vy = speed * (dEast / dist);
          copter.lat += (vx * dt) / 111_320;
          copter.lon += (vy * dt) / (111_320 * Math.cos((copter.lat * Math.PI) / 180));
        }
      }

      copter.alt = 30 + 5 * Math.sin(tSec * 0.1 + copter.phase);
      vz = 0.3 * Math.sin(tSec * 0.15 + copter.phase);
      flightMode = 4; // GUIDED
      break;
    }

    case "takeoff": {
      if (copter.alt < copter.targetAlt) {
        copter.alt = Math.min(copter.alt + TAKEOFF_SPEED_MS * dt, copter.targetAlt);
        vz = TAKEOFF_SPEED_MS;
      } else {
        copter.alt = copter.targetAlt;
        copter.mode = "orbit";
        vz = 0;
      }

      flightMode = 4; // GUIDED
      break;
    }

    case "land": {
      if (copter.alt > 0) {
        copter.alt = Math.max(copter.alt - LAND_SPEED_MS * dt, 0);
        vz = -LAND_SPEED_MS;
      } else {
        copter.alt = 0;
        copter.armed = false;
        vz = 0;
      }

      flightMode = 9; // LAND
      break;
    }

    default:
      flightMode = 0;
      break;
  }

  const groundSpeed = Math.sqrt(vx * vx + vy * vy);
  const isMoving = groundSpeed > 0.1;
  const heading = isMoving ? ((Math.atan2(vy, vx) * 180) / Math.PI + 360) % 360 : 0;
  const yaw = isMoving ? Math.atan2(vy, vx) : 0;

  copter.battery = Math.max(0, copter.battery - 1 / 600);

  const wpDist = copter.target
    ? Math.sqrt(
        ((copter.target.lat - copter.lat) * 111_320) ** 2 +
          ((copter.target.lon - copter.lon) * 111_320 * Math.cos((copter.lat * Math.PI) / 180)) **
            2,
      )
    : 0;

  return {
    id: copter.id,
    name: copter.name,
    latitude: copter.lat,
    longitude: copter.lon,
    altitude: copter.alt + 450, // approximate MSL (m)
    relativeAltitude: copter.alt,
    vx,
    vy,
    vz,
    roll,
    pitch: isMoving ? 0.05 : 0.02,
    yaw,
    heading,
    groundSpeed,
    airspeed: groundSpeed + 0.3,
    climb: vz,
    throttle: copter.armed ? 52 : 0,
    armed: copter.armed,
    flightMode,
    systemStatus: copter.armed ? 4 : 3, // ACTIVE vs STANDBY
    battery: Math.round(copter.battery),
    batteryVoltage: 11.1 + (copter.battery / 100) * 1.1,
    batteryCurrent: copter.armed ? 8.5 + Math.random() * 0.5 : 0.1,
    gpsFix: 3,
    gpsSatellites: 12,
    gpsHdop: 1.2,
    wpDist,
    wpSeq: 0,
    cpuLoad: 15 + Math.random() * 5,
    ekfFlags: 63,
    vibrationX: 0.08 + Math.random() * 0.04,
    vibrationY: 0.08 + Math.random() * 0.04,
    vibrationZ: 0.12 + Math.random() * 0.06,
    lastUpdate: Date.now(),
  };
};

// ---------------------------------------------------------------------------
// Simulation lifecycle
// ---------------------------------------------------------------------------
let interval: Nullable<NodeJS.Timeout> = null;
let startTime: Nullable<number> = null;

export const startSimulation = (onSnapshot: SnapshotCallback) => {
  if (interval) {
    return;
  }

  startTime = Date.now();

  serialCopters.forEach((copter, index) => {
    const phase = (index * 2 * Math.PI) / COPTER_COUNT;
    copter.battery = 100 - index * 5;
    copter.mode = "orbit";
    copter.armed = true;
    copter.target = null;
    copter.alt = DEFAULT_TAKEOFF_ALT;
    copter.targetAlt = DEFAULT_TAKEOFF_ALT;
    copter.lat = BASE_LAT + ORBIT_RADIUS_DEG * Math.cos(phase);
    copter.lon = BASE_LON + ORBIT_RADIUS_DEG * Math.sin(phase);
  });

  interval = setInterval(() => {
    const tSec = (Date.now() - (startTime ?? Date.now())) / 1000;
    const snapshot = serialCopters.map((copter) => buildCopterState(copter, tSec));

    onSnapshot(snapshot);
  }, TICK_MS);
};

export const stopSimulation = () => {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }

  startTime = null;
};

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------
export const dispatchCommand = (command: DroneCommand): boolean => {
  const copter = serialCopters.find((c) => c.id === command.id);

  if (!copter) {
    return false;
  }

  switch (command.type) {
    case "goto":
      copter.mode = "goto";
      copter.target = { lat: command.lat, lon: command.lon };
      break;

    case "takeoff":
      copter.armed = true;
      copter.alt = 0;
      copter.targetAlt = command.altitude ?? DEFAULT_TAKEOFF_ALT;
      copter.mode = "takeoff";
      break;

    case "land":
      copter.mode = "land";
      break;

    default:
      break;
  }

  return true;
};
