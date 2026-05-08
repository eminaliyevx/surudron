import type { AsyncIteratorData, Outputs } from "@surudron/api/types";

export type Copter = AsyncIteratorData<Outputs["ardupilot"]["sse"]>["data"][number];
