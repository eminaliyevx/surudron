import { successOutputSchema } from "@surudron/shared/utils";
import { object, string, url } from "zod";

export const streamInputSchema = object({
  body: object({
    droneId: string(),
  }),
});

export const streamOutputSchema = successOutputSchema(
  object({
    webrtcUrl: url(),
  }),
);
