import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { orpc } from "@/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { getShapeCoordinates, shapeDroneCountMap } from "@/helpers/shapeUtils";
import type { Destination, Drone } from "@/types";

interface Props {
  destinations: Destination[];
  drones: Drone[];
  formation: string;
  onClose: () => void;
  setDestinations: React.Dispatch<React.SetStateAction<Destination[]>>;
}

export function FormationModal({
  drones,
  destinations,
  setDestinations,
  formation,
  onClose,
}: Props) {
  const { t } = useTranslation();

  const requiredDroneCount = shapeDroneCountMap[formation] || 0;

  const [selectedDroneIds, setSelectedDroneIds] = useState<Set<string>>(
    new Set()
  );
  const [selectedDestinationId, setSelectedDestinationId] = useState<
    string | null
  >(null);
  const [radius, setRadius] = useState([50]);

  const command = useMutation(orpc.serial.command.mutationOptions());

  useEffect(() => {
    setSelectedDroneIds(new Set());
    setSelectedDestinationId(null);
  }, []);

  const toggleDroneSelection = useCallback(
    (id: string) => {
      setSelectedDroneIds((prev) => {
        const next = new Set(prev);

        if (next.has(id)) {
          next.delete(id);
        } else if (next.size < requiredDroneCount) {
          next.add(id);
        }

        return next;
      });
    },
    [requiredDroneCount]
  );

  const toggleDestinationSelection = useCallback((id: string) => {
    setSelectedDestinationId((prev) => (prev === id ? null : id));
  }, []);

  const handleSubmit = () => {
    onClose();

    const selectedIds = Array.from(selectedDroneIds);

    if (!(selectedIds.length && selectedDestinationId)) {
      return;
    }

    const destination = destinations.find(
      (d) => d.id === selectedDestinationId
    );
    if (!destination) {
      return;
    }

    const center = [destination.lat, destination.lon];

    const positions = getShapeCoordinates(
      formation,
      center,
      radius[0],
      selectedIds.length
    );

    setDestinations((prev: Destination[]) =>
      prev.map((dest) =>
        dest.id === selectedDestinationId
          ? {
              ...dest,
              assignedDrones: Array.from(
                new Set([...(dest.assignedDrones || []), ...selectedIds])
              ),
            }
          : dest
      )
    );

    // send commands
    selectedIds.forEach((droneId, idx) => {
      const [lat, lon] = positions[idx];

      command.mutate({
        body: {
          type: "goto",
          id: droneId,
          lat,
          lon,
        },
      });
    });
  };

  const canSubmit =
    selectedDroneIds.size === requiredDroneCount &&
    selectedDestinationId !== null;

  return (
    <Dialog onOpenChange={onClose} open={formation != null}>
      <DialogContent className="border-border bg-card sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="glow-text font-mono text-primary capitalize">
            {t("assign_drones_for", { shape: t(formation) })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <DialogTitle className="font-mono text-md text-primary capitalize">
            {t("select_exactly", { count: requiredDroneCount })}
          </DialogTitle>

          {/* Drone selection */}
          <div className="grid grid-cols-2 gap-2">
            {drones.map((drone) => {
              const isSelected = selectedDroneIds.has(drone.id);
              const disabled =
                !isSelected && selectedDroneIds.size >= requiredDroneCount;

              const lat = drone.latitude?.toFixed(5);
              const lon = drone.longitude?.toFixed(5);

              return (
                <label
                  className={`flex cursor-pointer flex-col gap-1 rounded-md border p-2 text-xs transition-colors ${disabled ? "cursor-not-allowed opacity-50" : "hover:border-primary/40"}
  ${isSelected ? "border-primary bg-primary/10" : "border-border bg-secondary"}`}
                  htmlFor={`${drone.id}`}
                  key={drone.id}
                >
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={isSelected}
                      disabled={disabled}
                      id={`${drone.id}`}
                      onCheckedChange={() => toggleDroneSelection(drone.id)}
                    />
                    <span className="font-mono text-sm">
                      Drone {drone.id} (ID: {drone.id})
                    </span>
                  </div>

                  <div className="ml-6 text-muted-foreground">
                    <div>{lat && lon ? `${lat}, ${lon}` : "No position"}</div>
                  </div>
                </label>
              );
            })}
          </div>

          {/* Destination selection */}
          <div className="space-y-1.5">
            <DialogTitle className="font-mono text-md text-primary capitalize">
              {t("select_destination")}
            </DialogTitle>
            {destinations.length === 0 && (
              <div className="flex items-center justify-center py-4 text-muted-foreground text-sm">
                {t("no_destinations")}
              </div>
            )}{" "}
            {destinations.map((dest) => {
              const isSelected = selectedDestinationId === dest.id;

              return (
                <button
                  className={`flex flex-col gap-1 rounded-md border p-2 text-left text-xs ${
                    isSelected
                      ? "border-primary bg-primary/10"
                      : "border-border bg-secondary"
                  }`}
                  key={dest.id}
                  onClick={() => toggleDestinationSelection(dest.id)}
                  type="button"
                >
                  <div className="flex items-center gap-2">
                    <Checkbox checked={isSelected} />
                    <span className="font-mono">
                      {dest.lat.toFixed(5)}, {dest.lon.toFixed(5)}
                    </span>
                  </div>

                  <div className="ml-6 text-muted-foreground">
                    {t("assigned_drones", {
                      count: dest.assignedDrones.length,
                    })}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Radius */}
          <div>
            <h4 className="mb-2 font-medium text-muted-foreground text-sm">
              Radius:{" "}
              <span className="font-mono text-primary">{radius[0]}m</span>
            </h4>

            <Slider
              className="py-2"
              max={500}
              min={10}
              onValueChange={setRadius}
              step={5}
              value={radius}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            className="hover:bg-slate-700 hover:text-white"
            onClick={onClose}
            variant="outline"
          >
            {t("cancel")}
          </Button>

          <Button disabled={!canSubmit} onClick={handleSubmit}>
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
