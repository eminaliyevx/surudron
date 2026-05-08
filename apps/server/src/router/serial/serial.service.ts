import type { InferContractRouterOutputs } from "@orpc/contract";
import { EventPublisher, ORPCError } from "@orpc/server";
import type { contract } from "@surudron/api/contract";
import type { Inputs } from "@surudron/api/types";

import { serialManager } from "@/lib/hardware/serial-manager";
import type { Copter } from "@/types";

import type { DroneCommand } from "./serial.simulation";
import { dispatchCommand, startSimulation, stopSimulation } from "./serial.simulation";

export type Outputs = InferContractRouterOutputs<typeof contract>;

const eventPublisher = new EventPublisher<{
  "serial-data": Copter[];
}>();

export const subscribeToTelemetry = (signal: AbortSignal) =>
  eventPublisher.subscribe("serial-data", { signal });

export const getSerialPorts = async () => {
  try {
    const serialPorts = await serialManager.listPorts();

    return serialPorts.map((port) => ({ path: port }));
  } catch {
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: "An error occurred while fetching serial ports",
    });
  }
};

export const closeSerialPort = async () => {
  stopSimulation();

  const { port } = await serialManager.getConnection();

  if (!port) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: "No active serial port found",
    });
  }

  try {
    await serialManager.disconnect();

    return {
      port,
    };
  } catch {
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: `Failed to close serial port ${port}`,
    });
  }
};

export const openSerialPort = async ({ port, baud }: Inputs["serial"]["connect"]["body"]) => {
  try {
    const { port: activePort, isOpen: activePortIsOpen } = await serialManager.getConnection();

    if (port === activePort && activePortIsOpen) {
      return {
        port: activePort,
      };
    }

    const isOpen = await serialManager.connect(port, baud);

    if (!isOpen) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: `Failed to open serial port ${port}`,
      });
    }

    return {
      port,
    };
  } catch {
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: `Failed to open serial port ${port}`,
    });
  }
};

export const attachSerialListeners = () => {
  startSimulation((snapshot) => {
    eventPublisher.publish("serial-data", snapshot);
  });
};

export const command = (cmd: DroneCommand): boolean => dispatchCommand(cmd);
