import { successOutputSchema } from "@surudron/shared/utils";
import { array, boolean, number, object, string } from "zod";

export const copterSchema = object({
  id: string(),
  name: string(),

  // Position
  latitude: number(),
  longitude: number(),
  altitude: number(),
  relativeAltitude: number(),

  // Velocity (m/s, NED frame)
  vx: number(),
  vy: number(),
  vz: number(),

  // Orientation (radians)
  roll: number(),
  pitch: number(),
  yaw: number(),

  // Flight state
  heading: number(),
  groundSpeed: number(),
  airspeed: number(),
  climb: number(),
  throttle: number(),

  // Autopilot status
  armed: boolean(),
  flightMode: number(),
  systemStatus: number(),

  // Battery
  battery: number(),
  batteryVoltage: number(),
  batteryCurrent: number(),

  // GPS
  gpsFix: number(),
  gpsSatellites: number(),
  gpsHdop: number(),

  // Navigation / mission
  wpDist: number(),
  wpSeq: number(),

  // Health
  cpuLoad: number(),
  ekfFlags: number(),
  vibrationX: number(),
  vibrationY: number(),
  vibrationZ: number(),

  lastUpdate: number(),
});

export const sseOutputSchema = successOutputSchema(array(copterSchema));
