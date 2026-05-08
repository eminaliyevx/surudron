import { eventIterator } from "@orpc/contract";

import { api } from "../..";
import {
  commandInputSchema,
  commandOutputSchema,
  connectInputSchema,
  connectionOutputSchema,
  connectOutputSchema,
  disconnectOutputSchema,
  sseOutputSchema,
  telemetryOutputSchema,
} from "./schemas";

export const sse = api
  .route({
    method: "GET",
    path: "/serial/sse",
    tags: ["Serial"],
    summary: "Stream available serial ports",
    description: `
Provides a real-time SSE stream of available serial devices on the host system.
* Pushes the full list whenever a device is plugged in or removed.
* Useful for auto-populating device selection dropdowns in the UI.`,
  })
  .output(eventIterator(sseOutputSchema));

export const connect = api
  .route({
    method: "POST",
    path: "/serial/connect",
    inputStructure: "detailed",
    tags: ["Serial"],
    summary: "Establish serial connection",
    description: `
Attempts to open a persistent connection to the specified serial port.

> **Side Effect:** Locks the serial port at the OS level.

**Requirement:** Port must not be in use by another application.
    `,
  })
  .errors({
    BAD_REQUEST: {},
  })
  .input(connectInputSchema)
  .output(connectOutputSchema);

export const disconnect = api
  .route({
    method: "GET",
    path: "/serial/disconnect",
    tags: ["Serial"],
    summary: "Terminate active connection",
    description:
      "Gracefully closes the active serial connection and releases the serial port back to the system.",
  })
  .output(disconnectOutputSchema);

export const connection = api
  .route({
    method: "GET",
    path: "/serial/connection",
    tags: ["Serial"],
    summary: "Get current connection status",
    description: "Returns metadata about the currently active serial connection.",
  })
  .output(connectionOutputSchema);

export const telemetry = api
  .route({
    method: "GET",
    path: "/serial/telemetry",
    tags: ["Serial"],
    summary: "Stream live telemetry data",
    description: `
Provides a real-time SSE stream of live telemetry data from the connected serial device.
> **Pre-requisite:** You must call \`/serial/connect\` before subscribing to this stream.
    `,
  })
  .output(eventIterator(telemetryOutputSchema));

export const command = api
  .route({
    method: "POST",
    path: "/serial/command",
    inputStructure: "detailed",
    tags: ["Serial"],
    summary: "Dispatch a drone command",
    description: `Sends one of three commands to a simulated drone identified by \`id\`:

- **goto** — fly to the given \`lat\`/\`lon\`; drone enters GUIDED mode and navigates in real time
- **takeoff** — arm and climb to \`altitude\` (default 30 m AGL); drone transitions to AUTO orbit on arrival
- **land** — descend and disarm; drone enters LAND mode until it reaches the ground`,
  })
  .errors({
    NOT_FOUND: {},
  })
  .input(commandInputSchema)
  .output(commandOutputSchema);
