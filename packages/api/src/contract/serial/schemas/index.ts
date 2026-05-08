import { successOutputSchema } from "@surudron/shared/utils";
import { array, boolean, discriminatedUnion, literal, number, object, string } from "zod";

import { copterSchema } from "../../ardupilot/schemas";

export const portSchema = string().brand<"Port">();

export const sseOutputSchema = successOutputSchema(
  array(
    object({
      path: string().min(1),
    }),
  ),
);

export const connectInputSchema = object({
  body: object({
    port: portSchema,
    baud: number(),
  }),
});

export const connectOutputSchema = successOutputSchema(
  object({
    port: portSchema,
    isOpen: boolean(),
  }),
);

export const disconnectOutputSchema = successOutputSchema(
  object({
    port: portSchema.nullable(),
    isOpen: literal(false),
  }),
);

export const connectionOutputSchema = successOutputSchema(
  object({
    port: portSchema,
    isOpen: literal(true),
  }).or(literal(null)),
);

export const telemetryOutputSchema = successOutputSchema(array(copterSchema));

export const commandInputSchema = object({
  body: discriminatedUnion("type", [
    object({
      type: literal("goto"),
      id: string(),
      lat: number(),
      lon: number(),
    }),
    object({
      type: literal("takeoff"),
      id: string(),
      altitude: number().optional(),
    }),
    object({
      type: literal("land"),
      id: string(),
    }),
  ]),
});

export const commandOutputSchema = successOutputSchema(boolean());
