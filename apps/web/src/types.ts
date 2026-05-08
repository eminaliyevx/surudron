import { InferClientOutputs } from "@orpc/client";

import { client } from "./client";

export interface Destination {
  assignedDrones: string[];
  id: string;
  lat: number;
  lon: number;
}

export interface SerialPort {
  friendlyName: string;
  locationId: string;
  manufacturer: string;
  path: string;
  pnpId: string;
  productId: string;
  serialNumber: string;
  vendorId: string;
}

export type LatLng = number[];

type Outputs = InferClientOutputs<typeof client>;
type SSEPayload<T> = T extends AsyncIteratorObject<infer U> ? U : never;
export type Drone = SSEPayload<Outputs["ardupilot"]["sse"]>["data"][number];
