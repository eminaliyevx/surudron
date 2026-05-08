import type { InferContractRouterInputs, InferContractRouterOutputs } from "@orpc/contract";

import type { contract } from "../contract";

export type Inputs = InferContractRouterInputs<typeof contract>;

export type Outputs = InferContractRouterOutputs<typeof contract>;

export type AsyncIteratorData<T> = T extends AsyncIteratorObject<infer U> ? U : never;
