import { setTimeout } from "node:timers/promises";

import { serialManager } from "@/lib/hardware/serial-manager";
import { os } from "@/orpc";

import {
  attachSerialListeners,
  closeSerialPort,
  getSerialPorts,
  openSerialPort,
  command as serialCommand,
  subscribeToTelemetry,
} from "./serial.service";

export const sse = os.serial.sse.handler(async function* ({ signal }) {
  const abortSignal = signal ?? new AbortController().signal;

  while (!abortSignal.aborted) {
    try {
      const serialPorts = await getSerialPorts();

      yield { data: serialPorts };
    } catch {
      if (abortSignal.aborted) {
        return;
      }
    }

    try {
      await setTimeout(1000, undefined, { signal: abortSignal });
    } catch (error: any) {
      if (error?.name === "AbortError") {
        return;
      }
    }
  }
});

export const connect = os.serial.connect.handler(async ({ input }) => {
  const { port } = await openSerialPort(input.body);

  attachSerialListeners();

  return {
    data: {
      port,
      isOpen: true,
    },
  };
});

export const disconnect = os.serial.disconnect.handler(async () => {
  const { port } = await closeSerialPort();

  return {
    data: {
      port,
      isOpen: false,
    },
  };
});

export const connection = os.serial.connection.handler(async () => {
  const data = await serialManager.getConnection();

  return {
    data: data.port
      ? {
          port: data.port,
          isOpen: true,
        }
      : null,
  };
});

export const telemetry = os.serial.telemetry.handler(async function* ({ signal }) {
  const abortSignal = signal ?? new AbortController().signal;

  const iterator = subscribeToTelemetry(abortSignal);

  for await (const payload of iterator) {
    yield {
      data: payload,
    };
  }
});

export const command = os.serial.command.handler(({ input, errors }) => {
  const dispatched = serialCommand(input.body);

  if (!dispatched) {
    throw errors.NOT_FOUND({
      message: `Drone "${input.body.id}" not found`,
    });
  }

  return { data: dispatched };
});
