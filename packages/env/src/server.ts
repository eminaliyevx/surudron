import {
  DEFAULT_ARDUPILOT_PORT,
  DEFAULT_MTX_API_PORT,
  DEFAULT_MTX_RTSP_PORT,
  DEFAULT_PORT,
  DEFAULT_RTSP_PORT,
  DEFAULT_SERVER_HOST,
  DEFAULT_WEBRTC_PORT,
  NODE_ENV,
} from "@surudron/shared/constants";
import { createEnv } from "@t3-oss/env-core";
import { coerce, string, enum as zEnum } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: zEnum(NODE_ENV).default(NODE_ENV.development).catch(NODE_ENV.development),
    SERVER_HOST: string().default(DEFAULT_SERVER_HOST).catch(DEFAULT_SERVER_HOST),
    PORT: coerce.number().default(DEFAULT_PORT).catch(DEFAULT_PORT),
    RTSP_PORT: coerce.number().default(DEFAULT_RTSP_PORT).catch(DEFAULT_RTSP_PORT),
    WEBRTC_PORT: coerce.number().default(DEFAULT_WEBRTC_PORT).catch(DEFAULT_WEBRTC_PORT),
    MTX_API_PORT: coerce.number().default(DEFAULT_MTX_API_PORT).catch(DEFAULT_MTX_API_PORT),
    MTX_RTSP_PORT: coerce.number().default(DEFAULT_MTX_RTSP_PORT).catch(DEFAULT_MTX_RTSP_PORT),
    ARDUPILOT_PORT: coerce.number().default(DEFAULT_ARDUPILOT_PORT).catch(DEFAULT_ARDUPILOT_PORT),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
