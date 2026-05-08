import { EventPublisher } from "@orpc/server";
import { env } from "@surudron/env/server";
import { DEFAULT_ARDUPILOT_PORT, DEFAULT_SERVER_HOST } from "@surudron/shared/constants";
import type { Nullable } from "@surudron/shared/types";
import {
  ardupilotmega,
  common,
  type MavLinkPacket,
  MavLinkPacketParser,
  type MavLinkPacketRegistry,
  MavLinkPacketSplitter,
  minimal,
} from "node-mavlink";

import type { Copter } from "@/types";

const REGISTRY: MavLinkPacketRegistry = {
  ...minimal.REGISTRY,
  ...common.REGISTRY,
  ...ardupilotmega.REGISTRY,
};

const MAV_MODE_FLAG_SAFETY_ARMED = 128;
const GLOBAL_POSITION_INT_HDG_UNKNOWN = 65_535;

const droneStates = new Map<number, Copter>();

const applyPacketToState = (state: Copter, data: unknown): boolean => {
  if (data instanceof common.GlobalPositionInt) {
    state.latitude = data.lat / 1e7;
    state.longitude = data.lon / 1e7;
    state.altitude = data.alt / 1e3;
    state.relativeAltitude = data.relativeAlt / 1e3;
    state.vx = data.vx / 100;
    state.vy = data.vy / 100;
    state.vz = data.vz / 100;
    state.heading = data.hdg === GLOBAL_POSITION_INT_HDG_UNKNOWN ? state.heading : data.hdg / 100;

    return true;
  }
  if (data instanceof common.VfrHud) {
    state.groundSpeed = data.groundspeed;
    state.airspeed = data.airspeed;
    state.climb = data.climb;
    state.throttle = data.throttle;

    return true;
  }

  if (data instanceof common.SysStatus) {
    state.battery = data.batteryRemaining;
    state.batteryVoltage = data.voltageBattery / 1000;
    state.batteryCurrent = data.currentBattery === -1 ? 0 : data.currentBattery / 100;
    state.cpuLoad = data.load / 10;
    return true;
  }

  if (data instanceof minimal.Heartbeat) {
    state.armed = (data.baseMode & MAV_MODE_FLAG_SAFETY_ARMED) !== 0;
    state.flightMode = data.customMode;
    state.systemStatus = data.systemStatus;

    return true;
  }

  if (data instanceof common.Attitude) {
    state.roll = data.roll;
    state.pitch = data.pitch;
    state.yaw = data.yaw;

    return true;
  }

  if (data instanceof common.GpsRawInt) {
    state.gpsFix = data.fixType;
    state.gpsSatellites = data.satellitesVisible;
    state.gpsHdop = data.eph / 100;

    return true;
  }
  if (data instanceof common.NavControllerOutput) {
    state.wpDist = data.wpDist;

    return true;
  }
  if (data instanceof common.MissionCurrent) {
    state.wpSeq = data.seq;

    return true;
  }
  if (data instanceof ardupilotmega.EkfStatusReport) {
    state.ekfFlags = data.flags;

    return true;
  }
  if (data instanceof common.Vibration) {
    state.vibrationX = data.vibrationX;
    state.vibrationY = data.vibrationY;
    state.vibrationZ = data.vibrationZ;

    return true;
  }

  return false;
};

const eventPublisher = new EventPublisher<{
  "ardupilot-data": Copter[];
}>();

export const subscribe = (signal: AbortSignal) =>
  eventPublisher.subscribe("ardupilot-data", { signal });

let activeSocket: Nullable<Bun.udp.Socket<"buffer">> = null;
let activeSubscribers = 0;

const createConnection = async (host = DEFAULT_SERVER_HOST, port = env.ARDUPILOT_PORT) => {
  if (activeSocket || activeSubscribers <= 0) {
    return;
  }

  const splitter = new MavLinkPacketSplitter();
  const parser = new MavLinkPacketParser();

  splitter.pipe(parser);

  activeSocket = await Bun.udpSocket({
    hostname: host,
    port,
    socket: {
      data: (_, data) => {
        splitter.write(data);
      },
      error: (socket) => {
        socket.close();
      },
    },
  });

  parser.on("data", (packet: MavLinkPacket) => {
    const clazz = REGISTRY[packet.header.msgid];

    if (!clazz) {
      return;
    }

    const sysid = packet.header.sysid;
    const msg = packet.protocol.data(packet.payload, clazz);

    let state = droneStates.get(sysid);

    if (!state) {
      state = {
        id: sysid.toString(),
        name: `SITL-${sysid}`,
        latitude: 0,
        longitude: 0,
        altitude: 0,
        relativeAltitude: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        roll: 0,
        pitch: 0,
        yaw: 0,
        heading: 0,
        groundSpeed: 0,
        airspeed: 0,
        climb: 0,
        throttle: 0,
        armed: false,
        flightMode: 0,
        systemStatus: 0,
        battery: 0,
        batteryVoltage: 0,
        batteryCurrent: 0,
        gpsFix: 0,
        gpsSatellites: 0,
        gpsHdop: 0,
        wpDist: 0,
        wpSeq: 0,
        cpuLoad: 0,
        ekfFlags: 0,
        vibrationX: 0,
        vibrationY: 0,
        vibrationZ: 0,
        lastUpdate: Date.now(),
      };

      droneStates.set(sysid, state);
    }

    if (!applyPacketToState(state, msg)) {
      return;
    }

    state.lastUpdate = Date.now();

    const snapshot = Array.from(droneStates.values()).map((value) => value);

    eventPublisher.publish("ardupilot-data", snapshot);
  });

  if (activeSocket.closed) {
    activeSocket = null;
  }
};

export const connect = (host = DEFAULT_SERVER_HOST, port = DEFAULT_ARDUPILOT_PORT) => {
  activeSubscribers++;

  if (activeSubscribers === 1) {
    createConnection(host, port);
  }
};

export const disconnect = () => {
  activeSubscribers--;

  if (activeSubscribers <= 0) {
    activeSubscribers = 0;

    if (activeSocket) {
      activeSocket.close();

      activeSocket = null;
    }
  }
};
