import { api } from "../..";
import { streamInputSchema, streamOutputSchema } from "./schemas";

export const stream = api
  .route({
    method: "POST",
    path: "/drone/stream",
    inputStructure: "detailed",
    tags: ["Drone"],
    summary: "Request camera stream endpoint",
    description: `### Camera Stream Access (WHEP)

Initiates or retrieves a **WHEP (WebRTC-HTTP Egress Protocol)** URL for the live video feed from the drone.

* **Protocol:** Returns a standardized egress endpoint (e.g., \`http://localhost:8889/drone-1/whep\`).
* **Compatibility:** The returned URL is designed for direct use with WHEP-compliant WebRTC players.
* **Latency:** Optimized for sub-second FPV (First Person View) monitoring.

> **Note:** This endpoint provides the egress URL only. The actual WebRTC negotiation is handled via the WHEP standard by the media server at the provided address.`,
  })
  .errors({
    BAD_REQUEST: {},
  })
  .input(streamInputSchema)
  .output(streamOutputSchema);
