// DroneContext.tsx
import { createContext, type ReactNode, useContext, useState } from "react";

interface DroneContextType {
  baudRate: number;
  connected: boolean;
  path: string;
  setBaudRate: (value: number) => void;
  setConnected: (value: boolean) => void;
  setPath: (value: string) => void;
}

const GlobalContext = createContext<DroneContextType | undefined>(undefined);

export function DroneProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [path, setPath] = useState("");
  const [baudRate, setBaudRate] = useState(115_200);

  return (
    <GlobalContext.Provider
      value={{
        connected,
        setConnected,
        path,
        setPath,
        baudRate,
        setBaudRate,
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
}

export function useGlobalContext() {
  const context = useContext(GlobalContext);
  if (!context) {
    throw new Error("useDroneContext must be used within a DroneProvider");
  }
  return context;
}
