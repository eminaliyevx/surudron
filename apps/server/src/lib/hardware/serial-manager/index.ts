import { EventEmitter } from "node:events";
import { existsSync } from "node:fs";
import { join } from "node:path";

import type { Nullable, Optional } from "@surudron/shared/types";

type SerialEvent =
  | { type: "ports_list"; ports: string[] }
  | { type: "status"; connected: boolean; port: Nullable<string> }
  | { type: "error"; message: string }
  | { type: "data"; payload: string };

type SerialEventCallbackMap = {
  ports_list: (ports: string[]) => void;
  status: (connected: boolean, port: Nullable<string>) => void;
  error: (message: string) => void;
  data: (data: Uint8Array) => void;
  raw_json: (event: SerialEvent) => void;
  exit: (code: Nullable<number>) => void;
};

interface SerialEventEmitter extends EventEmitter {
  on<K extends keyof SerialEventCallbackMap>(event: K, listener: SerialEventCallbackMap[K]): this;
  off<K extends keyof SerialEventCallbackMap>(event: K, listener: SerialEventCallbackMap[K]): this;
  once<K extends keyof SerialEventCallbackMap>(event: K, listener: SerialEventCallbackMap[K]): this;
  emit<K extends keyof SerialEventCallbackMap>(
    event: K,
    ...args: Parameters<SerialEventCallbackMap[K]>
  ): boolean;
}

export class SerialManager extends (EventEmitter as new () => SerialEventEmitter) {
  private process: Nullable<ReturnType<typeof Bun.spawn>> = null;

  private buffer: string = "";

  constructor() {
    super();
  }

  private get executablePath(): string {
    const isWindows = process.platform === "win32";
    const binaryName = isWindows ? "serial.exe" : "serial";

    const prodPath = join(import.meta.dir, "..", "bin", binaryName);

    const devPath = join(process.cwd(), "..", "serial", "target", "release", binaryName);

    if (existsSync(prodPath)) {
      return prodPath;
    }

    if (existsSync(devPath)) {
      return devPath;
    }

    throw new Error("Serial executable missing");
  }

  private async readStdout() {
    if (!this.process || !this.process.stdout) {
      return;
    }

    const reader = (this.process.stdout as ReadableStream).getReader();

    const decoder = new TextDecoder();

    try {
      while (true) {
        const { value, done } = await reader.read();

        if (done) {
          break;
        }

        this.buffer += decoder.decode(value, { stream: true });

        let newlineIndex;

        while ((newlineIndex = this.buffer.indexOf("\n")) !== -1) {
          const line = this.buffer.slice(0, newlineIndex).trim();

          this.buffer = this.buffer.slice(newlineIndex + 1);

          if (line) {
            this.handleJsonLine(line);
          }
        }
      }
    } catch (error) {
      this.emit("error", `Failed to read stdout from serial manager: ${error}`);
    }
  }

  private handleJsonLine(line: string) {
    try {
      const event = JSON.parse(line) as SerialEvent;

      this.emit("raw_json", event);

      switch (event.type) {
        case "ports_list":
          this.emit("ports_list", event.ports);
          break;

        case "status":
          this.emit("status", event.connected, event.port);
          break;

        case "error":
          this.emit("error", event.message);
          break;

        case "data": {
          try {
            const bytes = Buffer.from(event.payload, "base64");

            this.emit("data", new Uint8Array(bytes));
          } catch (error) {
            this.emit("error", `Failed to decode base64 payload: ${error}`);
          }

          break;
        }

        default:
          this.emit("error", "Unknown event type received from serial manager");
      }
    } catch (error) {
      this.emit("error", `Failed to parse JSON from serial manager: ${line} - Error: ${error}`);
    }
  }

  private sendCommand(command: Record<string, unknown>) {
    if (!this.process || !this.process.stdin) {
      this.emit("error", "Serial manager is not running. Cannot send command");

      return;
    }

    try {
      const jsonCommand = JSON.stringify(command) + "\n";

      (this.process.stdin as Bun.FileSink).write(jsonCommand);
    } catch (error) {
      this.emit("error", `Failed to send command to serial manager: ${error}`);

      this.stop();
    }
  }

  private request<K extends keyof SerialEventCallbackMap, T>(
    command: Record<string, unknown>,
    waitForEvent: K,
    evaluator: (...args: Parameters<SerialEventCallbackMap[K]>) => Optional<T>,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        this.off(waitForEvent, onResolve);
        this.off("error", onReject);
      };

      const onResolve = ((...args: Parameters<SerialEventCallbackMap[K]>) => {
        const result = evaluator(...args);

        if (result !== undefined) {
          cleanup();
          resolve(result);
        }
      }) as SerialEventCallbackMap[K];

      const onReject = (message: string) => {
        cleanup();
        reject(new Error(message));
      };

      this.on(waitForEvent, onResolve);
      this.on("error", onReject);

      this.sendCommand(command);
    });
  }

  public start() {
    if (this.process) {
      return;
    }

    try {
      this.process = Bun.spawn([this.executablePath], {
        stdin: "pipe",
        stdout: "pipe",
        stderr: "inherit",
      });

      this.process.exited.then((code) => {
        this.process = null;

        this.emit("exit", code);
        this.emit("error", `Serial manager exited with code: ${code}`);
      });

      this.readStdout();
    } catch (error) {
      this.process = null;

      this.emit("error", `Failed to spawn serial manager: ${error}`);
    }
  }

  public stop() {
    if (this.process) {
      try {
        this.process.kill();
      } catch (error) {
        this.emit("error", `Failed to kill serial manager: ${error}`);
      }

      this.process = null;
    }
  }

  public listPorts() {
    return this.request({ action: "list_ports" }, "ports_list", (ports) => ports);
  }

  public connect(port: string, baud: number) {
    return this.request({ action: "connect", port, baud }, "status", (connected, connectedPort) => {
      if (connected && connectedPort === port) {
        return true;
      }
    });
  }

  public disconnect() {
    return this.request({ action: "disconnect" }, "status", (connected) => {
      if (!connected) {
        return true;
      }
    });
  }

  public getConnection() {
    return this.request({ action: "status" }, "status", (isOpen, port) => {
      return { port, isOpen };
    });
  }

  public write(data: Uint8Array) {
    try {
      const base64 = Buffer.from(data).toString("base64");

      this.sendCommand({ action: "write", data: base64 });
    } catch (error) {
      this.emit("error", `Failed to encode data: ${error}`);
    }
  }
}

export const serialManager = new SerialManager();
