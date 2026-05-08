import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Dot,
  Hexagon,
  Info,
  Moon,
  Pentagon,
  Square,
  Sun,
  Triangle,
  Unplug,
  Usb,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { orpc } from "@/client.ts";
import { FormationModal } from "@/components/modals/formation-modal.tsx";
import { InstructionsModal } from "@/components/modals/instructions-modal.tsx";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGlobalContext } from "../context.tsx";

type FormationType =
  | "point"
  | "triangle"
  | "rectangle"
  | "pentagon"
  | "hexagon";

const formations: {
  type: FormationType;
  label: string;
  icon: React.ReactNode;
}[] = [
  { type: "point", label: "point", icon: <Dot className="h-4 w-4" /> },
  {
    type: "triangle",
    label: "triangle",
    icon: <Triangle className="h-4 w-4" />,
  },
  {
    type: "rectangle",
    label: "rectangle",
    icon: <Square className="h-4 w-4" />,
  },
  {
    type: "pentagon",
    label: "pentagon",
    icon: <Pentagon className="h-4 w-4" />,
  },
  { type: "hexagon", label: "hexagon", icon: <Hexagon className="h-4 w-4" /> },
];

export function Navbar({ drones, destinations, setDestinations, setDrones }) {
  const { t } = useTranslation();

  const [selectedFormation, setSelectedFormation] =
    useState<FormationType | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [selectedPort, setSelectedPort] = useState<string | null>(null);

  const { connected, setConnected } = useGlobalContext();

  const { data: activeSerialPortData } = useQuery(
    orpc.serial.connection.queryOptions()
  );

  useEffect(() => {
    const connection = activeSerialPortData?.data;
    if (!connection) {
      return;
    }

    const { isOpen, port } = connection;
    console.log(isOpen);
    setConnected(isOpen);

    if (isOpen && port && !selectedPort) {
      setSelectedPort(port);
    }
  }, [activeSerialPortData, selectedPort, setConnected]);

  const { data: stream } = useQuery(
    orpc.serial.sse.experimental_streamedOptions({
      context: { cache: true },
      queryFnOptions: {
        refetchMode: "reset",
        maxChunks: 3,
      },
      retry: true,
    })
  );

  const serialPorts = stream?.[stream.length - 1]?.data ?? [];

  const connect = useMutation(orpc.serial.connect.mutationOptions());
  const disconnect = useMutation(orpc.serial.disconnect.mutationOptions());

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle("dark", next);
      return next;
    });
  };

  return (
    <>
      <nav className="flex items-center justify-between border-border border-b bg-card px-4 py-2">
        {/* Left: Serial Port */}
        <div className="flex items-center gap-2">
          <Select
            disabled={connected || serialPorts.length === 0}
            onValueChange={setSelectedPort}
            value={selectedPort ?? undefined}
          >
            <SelectTrigger className="w-[200px] border-border bg-secondary font-mono text-sm">
              <SelectValue placeholder={t("select_serial_port")} />
            </SelectTrigger>
            <SelectContent>
              {serialPorts.map((port) => (
                <SelectItem key={port.path} value={port.path}>
                  {port.path}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {connected ? (
            <Button
              className="gap-1.5 bg-red-500 text-white hover:bg-red-600 hover:text-white"
              onClick={() => {
                if (selectedPort) {
                  disconnect.mutate({});
                  setConnected(false);
                  setDrones([]);
                }
              }}
              size="sm"
              variant="outline"
            >
              <Unplug className="h-4 w-4" />
              {t("disconnect")}
            </Button>
          ) : (
            <Button
              className="gap-1.5"
              disabled={!selectedPort}
              onClick={() => {
                if (selectedPort) {
                  connect.mutate({
                    body: {
                      port: selectedPort,
                      baud: 115_200,
                    },
                  });
                  setConnected(true);
                }
              }}
              size="sm"
            >
              <Usb className="h-4 w-4" />
              {t("connect")}
            </Button>
          )}
        </div>

        {/* Center: Formation buttons */}
        <div className="flex items-center gap-1 rounded-md bg-secondary p-1">
          {formations.map((f) => (
            <Button
              className="gap-1.5 text-secondary-foreground text-xs hover:bg-muted hover:text-primary"
              key={f.type}
              onClick={() => setSelectedFormation(f.type)}
              size="sm"
              variant="ghost"
            >
              {f.icon}
              {t(f.label)}
            </Button>
          ))}
        </div>

        {/* Right: Theme + Info */}
        <div className="flex items-center gap-2">
          <Button
            className="text-muted-foreground hover:bg-gray-600/20 hover:text-primary dark:hover:bg-gray-700/30"
            onClick={toggleTheme}
            size="icon"
            variant="ghost"
          >
            {isDark ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
          <Button
            className="text-muted-foreground hover:bg-gray-600/20 hover:text-primary dark:hover:bg-gray-700/30"
            onClick={() => setShowInstructions(true)}
            size="icon"
            variant="ghost"
          >
            <Info className="h-5 w-5" />
          </Button>
        </div>
      </nav>

      {selectedFormation && (
        <FormationModal
          destinations={destinations}
          drones={drones}
          formation={selectedFormation}
          onClose={() => setSelectedFormation(null)}
          setDestinations={setDestinations}
        />
      )}

      {showInstructions && (
        <InstructionsModal onClose={() => setShowInstructions(false)} />
      )}
    </>
  );
}
