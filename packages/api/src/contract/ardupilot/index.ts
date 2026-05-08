import { eventIterator } from "@orpc/contract";

import { api } from "../..";
import { sseOutputSchema } from "./schemas";

export const sse = api
  .route({
    method: "GET",
    path: "/ardupilot/sse",
    inputStructure: "detailed",
    tags: ["ArduPilot"],
    summary: "Stream live telemetry data",
    description: `
Provides a real-time SSE stream of live telemetry data from all active SITL instances.
> **Note:** This is a unidirectional stream. To send commands or adjust parameters, use the \`/ardupilot/command\` endpoint.`,
  })
  .output(eventIterator(sseOutputSchema));
