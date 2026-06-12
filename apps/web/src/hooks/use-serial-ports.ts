import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";

// These types perfectly match the Rust structs we just built!

/**
 * Describes the type of serial port hardware.
 * Matches the Rust `PortDescription` enum exactly.
 */
export type PortDescription =
  | { Usb: string }
  | "Pci"
  | "Bluetooth"
  | "Unknown";

/**
 * Represents a physical serial port available on the host machine.
 */
export interface SerialPort {
  /** The OS-specific path to the port (e.g., `/dev/ttyUSB0` or `COM3`) */
  name: string;
  /** Detailed hardware description, usually including the manufacturer. */
  description: PortDescription;
}

/**
 * A React hook that subscribes to real-time serial port hardware changes
 * via the Tauri backend. It automatically fetches the initial state on mount.
 * 
 * @returns An array of currently connected serial ports.
 */
export function useSerialPorts() {
  const [ports, setPorts] = useState<SerialPort[]>([]);

  useEffect(() => {
    let unlisten: UnlistenFn | null = null;

    // Listen for the specific event string we defined in Rust's constants.rs
    const setupListener = async () => {
      // 1. Subscribe to future hot-plug events
      unlisten = await listen<SerialPort[]>("serial:ports-changed", (event) => {
        console.log("Live update from Rust background thread:", event.payload);
        setPorts(event.payload);
      });

      // 2. Fetch the current state immediately!
      // This fixes the race condition where the Rust thread emits its first
      // event BEFORE the React app has finished loading and subscribing.
      try {
        const initialPorts = await invoke<SerialPort[]>("list_ports");
        setPorts(initialPorts);
      } catch (err) {
        console.error("Failed to fetch initial serial ports:", err);
      }
    };

    setupListener();

    // Cleanup the event listener when the component unmounts
    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, []);

  return ports;
}
