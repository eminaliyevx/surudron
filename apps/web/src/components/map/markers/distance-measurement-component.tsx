import L, { type LatLng } from "leaflet";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { CircleMarker, Polyline, Tooltip, useMapEvents } from "react-leaflet";

interface HistoryEntry {
  finishedEnds: number[];
  points: LatLng[];
}

function DistanceMeasure() {
  const [points, setPoints] = useState<LatLng[]>([]);
  const [finishedShapeEnds, setFinishedShapeEnds] = useState<number[]>([]);

  const historyRef = useRef<HistoryEntry[]>([]);
  const redoRef = useRef<HistoryEntry[]>([]);

  // Save current state to history
  const saveToHistory = useCallback(() => {
    historyRef.current.push({
      points: [...points],
      finishedEnds: [...finishedShapeEnds],
    });
    redoRef.current = [];
  }, [points, finishedShapeEnds]);

  // Finish current shape
  const finishCurrentShape = useCallback(() => {
    if (points.length === 0) {
      return;
    }

    saveToHistory();
    setFinishedShapeEnds((prev) => [...prev, points.length - 1]);
  }, [points.length, saveToHistory]);

  useEffect(() => {
    const isUndo = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const modifier = isMac ? e.metaKey : e.ctrlKey;
      return modifier && e.key.toLowerCase() === "z";
    };

    const isRedo = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const modifier = isMac ? e.metaKey : e.ctrlKey;
      return modifier && e.key.toLowerCase() === "y";
    };

    const isFinish = (e: KeyboardEvent) => e.key === "Enter" || e.key === " ";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isUndo(e)) {
        e.preventDefault();
        e.stopPropagation();
        if (historyRef.current.length > 0) {
          const prev = historyRef.current.pop();
          redoRef.current.push({
            points: [...points],
            finishedEnds: [...finishedShapeEnds],
          });
          setPoints(prev.points);
          setFinishedShapeEnds(prev.finishedEnds);
        }
        return;
      }

      if (isRedo(e)) {
        e.preventDefault();
        e.stopPropagation();
        if (redoRef.current.length > 0) {
          const next = redoRef.current.pop();
          historyRef.current.push({
            points: [...points],
            finishedEnds: [...finishedShapeEnds],
          });
          setPoints(next.points);
          setFinishedShapeEnds(next.finishedEnds);
        }
        return;
      }

      if (isFinish(e)) {
        e.preventDefault();
        e.stopPropagation();
        finishCurrentShape();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [finishCurrentShape, points, finishedShapeEnds]);

  useMapEvents({
    click(e) {
      if (e.originalEvent.button === 0) {
        saveToHistory();
        setPoints((prev) => [...prev, e.latlng]);
      }
    },
    contextmenu(e) {
      e.originalEvent.preventDefault();
      finishCurrentShape();
    },
  });

  const formatDistanceForSegment = useCallback(
    (startIdx: number, endIdx: number): string => {
      if (endIdx - startIdx < 1) {
        return "0 m";
      }

      let dist = 0;
      for (let i = startIdx + 1; i <= endIdx; i++) {
        dist += points[i - 1].distanceTo(points[i]);
      }

      return dist < 1000
        ? `${dist.toFixed(2)} m`
        : `${(dist / 1000).toFixed(2)} km`;
    },
    [points]
  );

  const segments = React.useMemo(() => {
    const result: { start: number; end: number }[] = [];
    let start = 0;

    for (const end of finishedShapeEnds) {
      if (end >= start) {
        result.push({ start, end });
      }
      start = end + 1;
    }

    if (points.length > start) {
      result.push({ start, end: points.length - 1 });
    }

    return result;
  }, [finishedShapeEnds, points.length]);

  return (
    <>
      {points.map((point) => (
        <CircleMarker
          center={point}
          key={`${point.lat.toFixed(6)}-${point.lng.toFixed(6)}`}
          pathOptions={{ color: "red" }}
          radius={6}
        />
      ))}

      {segments.map((seg) => {
        const isCurrent =
          seg.end === points.length - 1 &&
          finishedShapeEnds.length === segments.length - 1;

        const segmentKey = `${seg.start}-${seg.end}`;

        return (
          <React.Fragment key={segmentKey}>
            <Polyline
              pathOptions={{
                color: isCurrent ? "blue" : "gray",
                dashArray: isCurrent ? "5,5" : undefined,
              }}
              positions={points.slice(seg.start, seg.end + 1)}
            />

            {seg.end - seg.start >= 1 && (
              <CircleMarker
                center={L.latLng(
                  (points[seg.end - 1].lat + points[seg.end].lat) / 2,
                  (points[seg.end - 1].lng + points[seg.end].lng) / 2
                )}
                opacity={0}
                radius={0}
              >
                <Tooltip direction="center" permanent>
                  {formatDistanceForSegment(seg.start, seg.end)}
                </Tooltip>
              </CircleMarker>
            )}
          </React.Fragment>
        );
      })}
    </>
  );
}

export default DistanceMeasure;
