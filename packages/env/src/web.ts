import { createEnv } from "@t3-oss/env-core";
import { url } from "zod";

export const env = createEnv({
  clientPrefix: "VITE_",
  client: {
    VITE_API_BASE_URL: url(),
  },
  runtimeEnv: import.meta.env,
  emptyStringAsUndefined: true,
});
