use base64::{Engine as _, engine::general_purpose::STANDARD as b64};
use serde::{Deserialize, Serialize};
use std::io::{self, BufRead, Read, Write};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::sync::mpsc::{self, Sender};
use std::thread;
use std::time::Duration;

// =====================================================================
// 1. DATA CONTRACTS (Like TypeScript Interfaces)
// =====================================================================
// This defines what incoming JSON commands we expect from TypeScript.
// `serde` automatically parses JSON strings into these Rust structures.
#[derive(Deserialize, Debug)]
#[serde(tag = "action")] // Use the "action" field to identify the command
#[serde(rename_all = "snake_case")] // e.g., ListPorts becomes "list_ports"
enum Command {
    ListPorts,
    Connect { port: String, baud: u32 },
    Disconnect,
    Status,
    Write { data: String },
}

// This defines what outgoing JSON events we send to TypeScript.
#[derive(Serialize, Debug)]
#[serde(tag = "type")] // Use the "type" field to identify the event
#[serde(rename_all = "snake_case")]
enum Event {
    PortsList {
        ports: Vec<String>,
    },
    Status {
        connected: bool,
        port: Option<String>,
    },
    Error {
        message: String,
    },
    Data {
        payload: String,
    },
}

// =====================================================================
// 2. COMMUNICATION HELPERS (Talking to Bun/TypeScript)
// =====================================================================
// Helper to print a Rust struct as a JSON string to `stdout` safely.
fn emit(event: Event) {
    if let Ok(json) = serde_json::to_string(&event) {
        // Lock standard output so multiple threads don't jumble text together
        let mut stdout = io::stdout().lock();

        // Print the JSON followed by a newline (\n), and force it to flush
        if writeln!(stdout, "{}", json).is_err() || stdout.flush().is_err() {
            // [ERROR HANDLING] If we can't write to stdout, it means the Bun/TS
            // parent process died or closed the pipe. We must exit to prevent a memory leak.
            std::process::exit(0);
        }
    }
}

// Helper specifically to format and send error events to TS.
fn emit_error(msg: &str) {
    emit(Event::Error {
        message: msg.to_string(),
    });
}

// =====================================================================
// 3. THREAD MESSAGES
// =====================================================================
// Rust uses "Channels" (like thread-safe mailboxes) to send data between threads.
// The main thread receives JSON from Bun, decodes it, and sends these ThreadMsgs
// to the background serial port Writer thread.
enum ThreadMsg {
    Write(Vec<u8>), // Tells the worker to write raw bytes to the hardware
    Disconnect,     // Tells the worker to cleanly shut down
}

// =====================================================================
// 4. MAIN PROGRAM LOOP (The Router)
// =====================================================================
fn main() {
    let stdin = io::stdin();
    // Create an iterator that blocks and reads stdin line-by-line
    let mut lines = stdin.lock().lines();

    // active_tx = A "Transmitter" to send messages to the active writer thread.
    // It's wrapped in `Option` which is Rust's version of `Sender | null`.
    let mut active_tx: Option<Sender<ThreadMsg>> = None;
    let mut current_port_name: Option<String> = None;
    let mut active_flag: Option<Arc<AtomicBool>> = None;
    let mut writer_handle: Option<thread::JoinHandle<()>> = None;
    let mut reader_handle: Option<thread::JoinHandle<()>> = None;

    // Infinite loop, continuously listening for commands from TypeScript
    loop {
        // 1. Wait for the next line of text from standard input
        let line = match lines.next() {
            Some(Ok(l)) => l,
            _ => break, // [ERROR HANDLING] EOF or stdin closed (Bun died). Exit loop.
        };

        let line = line.trim();
        if line.is_empty() {
            continue;
        }

        // 2. Try to parse the received JSON line into our `Command` struct
        let cmd: Command = match serde_json::from_str(line) {
            Ok(c) => c,
            Err(e) => {
                // [ERROR HANDLING] Invalid JSON sent by Bun
                emit_error(&format!("Invalid command JSON: {} (Payload: {})", e, line));
                continue;
            }
        };

        // 3. Route the command
        match cmd {
            Command::ListPorts => {
                // Ask OS for hardware ports
                match serialport::available_ports() {
                    Ok(available) => {
                        let ports = available.into_iter().map(|p| p.port_name).collect();
                        emit(Event::PortsList { ports });
                    }
                    Err(e) => {
                        // [ERROR HANDLING] OS denied access or failed to read dev nodes
                        emit_error(&format!("Failed to list ports. (OS Error): {}", e));
                    }
                }
            }
            Command::Status => {
                let connected = active_tx.is_some();
                emit(Event::Status {
                    connected,
                    port: current_port_name.clone(),
                });
            }
            Command::Disconnect => {
                // If we have an active connection, tell the thread to shut down
                if let Some(tx) = active_tx.take() {
                    let _ = tx.send(ThreadMsg::Disconnect);
                }
                if let Some(flag) = active_flag.take() {
                    flag.store(false, Ordering::SeqCst);
                }
                // Wait for the threads to finish so the OS lock is fully released
                if let Some(handle) = writer_handle.take() {
                    let _ = handle.join();
                }
                if let Some(handle) = reader_handle.take() {
                    let _ = handle.join();
                }
                current_port_name = None;
                emit(Event::Status {
                    connected: false,
                    port: None,
                });
            }
            Command::Connect { port, baud } => {
                // Safety: If a port is already active, safely shut it down first
                if let Some(tx) = active_tx.take() {
                    let _ = tx.send(ThreadMsg::Disconnect);
                }
                if let Some(flag) = active_flag.take() {
                    flag.store(false, Ordering::SeqCst);
                }
                // Wait for the threads to finish so the OS lock is fully released
                if let Some(handle) = writer_handle.take() {
                    let _ = handle.join();
                }
                if let Some(handle) = reader_handle.take() {
                    let _ = handle.join();
                }
                current_port_name = None;

                // Try to open hardware port
                match serialport::new(&port, baud)
                    // Timeout allows the Read thread's loop to cycle gracefully instead of
                    // blocking permanently, so it can see if it needs to shut down.
                    .timeout(Duration::from_millis(100))
                    .open()
                {
                    Ok(mut serial_port) => {
                        // We need to split the port into a "Reader" and a "Writer" to handle
                        // full-duplex communication simultaneously.
                        let mut read_port = match serial_port.try_clone() {
                            Ok(p) => p,
                            Err(e) => {
                                emit_error(&format!("Failed to clone port for reading: {}", e));
                                continue; // Skip to next command
                            }
                        };

                        // Create the message channel (mailbox)
                        let (tx, rx) = mpsc::channel::<ThreadMsg>();
                        active_tx = Some(tx);
                        current_port_name = Some(port.clone());

                        let keep_running = Arc::new(AtomicBool::new(true));
                        active_flag = Some(keep_running.clone());

                        // -------- WRITER THREAD --------
                        // Spawn a background thread to receive data from the main thread
                        // and write it to the physical serial port.
                        writer_handle = Some(thread::spawn(move || {
                            loop {
                                match rx.recv() {
                                    // Block until main thread sends a message
                                    Ok(ThreadMsg::Write(data)) => {
                                        // [ERROR HANDLING] Try to write bytes to hardware
                                        if let Err(e) = serial_port.write_all(&data) {
                                            emit_error(&format!("Hardware write error: {}", e));
                                            break; // Exit thread if hardware failed
                                        }
                                    }
                                    Ok(ThreadMsg::Disconnect) | Err(_) => {
                                        // Graceful shutdown requested, or main thread dropped sender
                                        break;
                                    }
                                }
                            }
                        })); // Thread dies naturally here

                        // -------- READER THREAD --------
                        // Spawn a background thread to continuously poll for new bytes
                        reader_handle = Some(thread::spawn(move || {
                            let mut buf = vec![0; 4096]; // 4KB buffer
                            loop {
                                if !keep_running.load(Ordering::SeqCst) {
                                    break; // Disconnect was requested
                                }

                                match read_port.read(&mut buf) {
                                    Ok(t) if t > 0 => {
                                        // Bytes arrived! Base64 encode them and send to TS
                                        let payload = b64.encode(&buf[..t]);
                                        emit(Event::Data { payload });
                                    }
                                    Ok(_) => {} // 0 bytes read, just loop again
                                    Err(ref e) if e.kind() == io::ErrorKind::TimedOut => {
                                        // The 100ms timeout we set earlier. This is normal.
                                        // We just loop again.
                                    }
                                    Err(e) => {
                                        // We only emit an error if we weren't intentionally shutting down
                                        if keep_running.load(Ordering::SeqCst) {
                                            // [ERROR HANDLING] A real fatal error (e.g. USB unplugged)
                                            emit_error(&format!(
                                                "Device disconnected or read error: {}",
                                                e
                                            ));
                                        }
                                        break; // Exit thread
                                    }
                                }
                            }
                        })); // Thread dies naturally here

                        // Let TS know we successfully connected
                        emit(Event::Status {
                            connected: true,
                            port: Some(port),
                        });
                    }
                    Err(e) => {
                        // [ERROR HANDLING] Failed to establish physical connection
                        emit_error(&format!("Failed to open hardware port {}: {}", port, e));
                    }
                }
            }
            Command::Write { data } => {
                // If we are connected...
                if let Some(tx) = &active_tx {
                    // Try to decode the Base64 from TypeScript into raw bytes
                    match b64.decode(&data) {
                        Ok(bytes) => {
                            // Send the raw bytes to our Writer thread
                            if tx.send(ThreadMsg::Write(bytes)).is_err() {
                                // [ERROR HANDLING] If `send` fails, it means the Writer Thread died
                                // (likely due to USB disconnection from a previous error).
                                active_tx = None;
                                current_port_name = None;
                                emit_error("Port disconnected implicitly. Failed to write.");
                            }
                        }
                        Err(e) => emit_error(&format!("Base64 decode error on Rust side: {}", e)),
                    }
                } else {
                    emit_error("Cannot write: No active port connected");
                }
            }
        }
    }
}
