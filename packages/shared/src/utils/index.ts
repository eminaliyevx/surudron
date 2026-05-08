import { object, type ZodType } from "zod";

export const unsafeCast = <T>(value?: unknown) => {
  return value as unknown as T;
};

export const successOutputSchema = <T extends ZodType>(schema: T) =>
  object({
    data: schema,
  });
