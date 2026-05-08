import { sse as ardupilotSse } from "./ardupilot";
import { stream } from "./drone";
import { sse as serialSse, connect, disconnect, connection, telemetry, command } from "./serial";

export const contract = {
  serial: {
    sse: serialSse,
    connect,
    disconnect,
    connection,
    telemetry,
    command,
  },
  ardupilot: {
    sse: ardupilotSse,
  },
  drone: {
    stream,
  },
};
