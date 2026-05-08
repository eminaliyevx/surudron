import { createORPCClient, onError } from "@orpc/client";
import type { ContractRouterClient } from "@orpc/contract";
import type { JsonifiedClient } from "@orpc/openapi-client";
import { OpenAPILink } from "@orpc/openapi-client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { contract } from "@surudron/api/contract";
import { env } from "@surudron/env/web";

const link = new OpenAPILink(contract, {
  url: env.VITE_API_BASE_URL,
  fetch: (request, init) =>
    globalThis.fetch(request, {
      ...init,
    }),
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});

export const client: JsonifiedClient<ContractRouterClient<typeof contract>> =
  createORPCClient(link);

export const orpc = createTanstackQueryUtils(client);
