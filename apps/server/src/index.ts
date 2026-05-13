import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { CORSPlugin } from "@orpc/server/plugins";
import { ZodToJsonSchemaConverter } from "@orpc/zod";
import { env } from "@surudron/env/server";
import { NODE_ENV } from "@surudron/shared/constants";

import { serialManager } from "@/lib/hardware/serial-manager";
import { router } from "@/router";

const handler = new OpenAPIHandler(router, {
  plugins: [
    new CORSPlugin(),
    new OpenAPIReferencePlugin({
      schemaConverters: [new ZodToJsonSchemaConverter()],
      specGenerateOptions: {
        info: {
          title: "SuruDron API",
          version: "1.0.0",
        },
      },
    }),
  ],
});

export const startServer = (port = env.PORT) => {
  serialManager.start();

  const server = Bun.serve({
    port: env.NODE_ENV === NODE_ENV.production ? 0 : port,
    async fetch(request: Request) {
      const { matched, response } = await handler.handle(request, {
        prefix: "/api",
        context: {},
      });

      if (matched) {
        return response;
      }

      return new Response(undefined, { status: 302, headers: { Location: "/api" } });
    },
  });

  return server;
};

export { serialManager };

if (import.meta.main) {
  const server = startServer();

  const cleanup = () => {
    serialManager.stop();
    server.stop(true);

    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
}
