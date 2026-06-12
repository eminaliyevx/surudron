//! Serial port management, hot-plug detection, and Tauri IPC commands.

use crate::error::AppResult;
use log::{error, info};
use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader, Write};
use std::sync::Arc;
use std::sync::Mutex;
use std::sync::atomic::{AtomicBool, Ordering};
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

/// Holds the globally active serial port state.
pub struct SerialState {
    pub active_port: Mutex<Option<String>>,
    pub write_port: Mutex<Option<Box<dyn serialport::SerialPort>>>,
    pub kill_signal: Mutex<Option<Arc<AtomicBool>>>,
}

impl Default for SerialState {
    fn default() -> Self {
        Self {
            active_port: Mutex::new(None),
            write_port: Mutex::new(None),
            kill_signal: Mutex::new(None),
        }
    }
}

/// Commands to control drones over the serial port.
#[derive(Deserialize, Serialize, Debug)]
#[serde(tag = "type")]
pub enum Command {
    #[serde(rename = "goto")]
    Goto { id: String, lat: f64, lon: f64 },
    #[serde(rename = "takeoff")]
    Takeoff { id: String, altitude: Option<f64> },
    #[serde(rename = "land")]
    Land { id: String },
}

// ─── Constants & Types ───────────────────────────────────────────────────────

/// The Tauri event emitted when the list of plugged-in serial ports changes.
pub const EVENT_SERIAL_PORTS_CHANGED: &str = "serial:ports-changed";

/// How often the background thread checks for hardware changes (in milliseconds).
pub const THREAD_POLL_INTERVAL_MS: u64 = 1000;

/// Describes the type of serial port and includes manufacturer data if available.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PortDescription {
    /// A USB port containing dynamic product and manufacturer strings.
    Usb(String),
    /// A standard PCI serial port.
    Pci,
    /// A Bluetooth-mapped serial port.
    Bluetooth,
    /// An unknown port type.
    Unknown,
}

impl Serialize for PortDescription {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        match self {
            Self::Usb(str) => serializer.serialize_str(str),
            Self::Pci => serializer.serialize_str("PCI"),
            Self::Bluetooth => serializer.serialize_str("Bluetooth"),
            Self::Unknown => serializer.serialize_str("Unknown"),
        }
    }
}

/// Represents a physical serial port available on the host machine.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct SerialPort {
    /// The OS-specific path to the port (e.g., `/dev/ttyUSB0` or `COM3`).
    pub name: String,
    /// Detailed hardware description.
    pub description: PortDescription,
}

// ─── Core Logic (Scanner) ────────────────────────────────────────────────────

/// Scans the host operating system and returns a list of all available serial ports.
/// Provides detailed manufacturer and product information for USB devices.
pub fn enumerate_ports() -> Result<Vec<SerialPort>, serialport::Error> {
    let ports = serialport::available_ports()?;

    let result = ports
        .into_iter()
        .map(|port| {
            let description = match &port.port_type {
                serialport::SerialPortType::UsbPort(info) => {
                    let product = info.product.as_deref().unwrap_or("Unknown");
                    let manufacturer = info.manufacturer.as_deref().unwrap_or("Unknown");

                    PortDescription::Usb(format!("{product} ({manufacturer})"))
                }
                serialport::SerialPortType::PciPort => PortDescription::Pci,
                serialport::SerialPortType::BluetoothPort => PortDescription::Bluetooth,
                serialport::SerialPortType::Unknown => PortDescription::Unknown,
            };

            SerialPort {
                name: port.port_name,
                description,
            }
        })
        .collect();

    return Ok(result);
}

// ─── Background Monitor ──────────────────────────────────────────────────────

/// Spawns a background thread that continuously polls for hardware changes.
/// If a device is plugged or unplugged, it emits a `serial:ports-changed` Tauri event.
pub fn start_watcher(app_handle: AppHandle) {
    thread::spawn(move || {
        info!("Serial port watcher started (polling every {THREAD_POLL_INTERVAL_MS}ms)");

        let mut previous: Vec<SerialPort> = vec![];

        loop {
            match enumerate_ports() {
                Ok(current) => {
                    if current != previous {
                        info!("Serial ports changed: {} port(s) detected", current.len());

                        if let Err(error) = app_handle.emit(EVENT_SERIAL_PORTS_CHANGED, &current) {
                            error!("Failed to emit {EVENT_SERIAL_PORTS_CHANGED}: {error}");
                        }

                        previous = current;
                    }
                }
                Err(error) => {
                    error!("Failed to enumerate serial ports: {error}");
                }
            }

            thread::sleep(Duration::from_millis(THREAD_POLL_INTERVAL_MS));
        }
    });
}

// ─── Tauri Commands ──────────────────────────────────────────────────────────

/// Tauri IPC Command: Manually triggers a hardware scan and returns the list of ports.
/// Used by the frontend to fetch the initial state upon loading.
#[tauri::command]
pub fn list_ports() -> AppResult<Vec<SerialPort>> {
    return Ok(enumerate_ports()?);
}

/// Tauri IPC Command: Connects to a specific serial port with the given baud rate.
/// Asynchronous to prevent blocking the UI during hardware initialization.
#[tauri::command]
pub async fn connect_port(
    app_handle: AppHandle,
    state: tauri::State<'_, SerialState>,
    port_name: String,
    baud_rate: u32,
) -> AppResult<()> {
    let port = match serialport::new(&port_name, baud_rate)
        .timeout(Duration::from_millis(10))
        .open()
    {
        Ok(port) => port,
        Err(error) => {
            error!("Failed to open port {port_name}: {error}");

            return Err(error.into());
        }
    };

    info!("Successfully opened {port_name}");

    let stop_signal = Arc::new(AtomicBool::new(false));
    let stop_signal_clone = stop_signal.clone();

    let port_clone = match port.try_clone() {
        Ok(clone) => clone,
        Err(error) => {
            error!("Failed to clone serial port: {error}");

            return Err(error.into());
        }
    };

    {
        let mut active_port = state.active_port.lock().unwrap();
        *active_port = Some(port_name.clone());

        let mut write_port = state.write_port.lock().unwrap();
        *write_port = Some(port_clone);

        let mut kill_signal = state.kill_signal.lock().unwrap();
        *kill_signal = Some(stop_signal);
    }

    thread::spawn(move || {
        let mut reader = BufReader::new(port);
        let mut buffer = String::new();

        loop {
            if stop_signal_clone.load(Ordering::Relaxed) {
                info!("Disconnect signal received. Terminating serial reader thread.");

                break;
            }

            buffer.clear();

            match reader.read_line(&mut buffer) {
                Ok(bytes_read) => {
                    if bytes_read > 0 {
                        if let Ok(json_data) =
                            serde_json::from_str::<serde_json::Value>(buffer.trim())
                        {
                            if let Err(error) = app_handle.emit("serial-data", json_data) {
                                error!("Failed to emit serial-data to frontend: {error}");
                            }
                        }
                    }
                }
                Err(error) if error.kind() == std::io::ErrorKind::TimedOut => {
                    continue;
                }
                Err(error) if error.kind() == std::io::ErrorKind::InvalidData => {
                    continue;
                }
                Err(error) => {
                    error!("Error reading from serial port: {error}");

                    break;
                }
            }
        }
    });

    return Ok(());
}

/// Tauri IPC Command: Disconnects the currently active serial port.
#[tauri::command]
pub async fn disconnect_port(state: tauri::State<'_, SerialState>) -> AppResult<()> {
    let mut active_name = state.active_port.lock().unwrap();
    let mut write_port = state.write_port.lock().unwrap();
    let mut kill_signal = state.kill_signal.lock().unwrap();

    if let Some(signal) = kill_signal.take() {
        info!("Sending disconnect signal to hardware thread...");

        signal.store(true, Ordering::Relaxed);
    }

    *active_name = None;
    *write_port = None;

    return Ok(());
}

/// Tauri IPC Command: Returns the name of the currently active serial port, if any.
#[tauri::command]
pub async fn get_active_port(state: tauri::State<'_, SerialState>) -> AppResult<Option<String>> {
    let active_name = state.active_port.lock().unwrap();

    return Ok(active_name.clone());
}

/// Tauri IPC Command: Sends a command over serial.
#[tauri::command]
pub async fn send_command(state: tauri::State<'_, SerialState>, command: Command) -> AppResult<()> {
    let mut write_port = state.write_port.lock().unwrap();

    if let Some(port) = write_port.as_mut() {
        let json = serde_json::to_string(&command).map_err(|error| {
            std::io::Error::new(
                std::io::ErrorKind::Other,
                format!("Failed to serialize: {error}"),
            )
        })?;

        let data = format!("{json}\n");

        port.write_all(data.as_bytes()).map_err(|error| {
            error!("Failed to write command to serial port: {error}");

            error
        })?;

        info!("Sent command over serial: {json}");

        return Ok(());
    }

    return Err(std::io::Error::new(
        std::io::ErrorKind::NotConnected,
        "Serial port is not connected",
    )
    .into());
}
