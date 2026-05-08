import { orpc } from "@/client";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { Maximize, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  droneId: string;
  setShowCamera: (show: boolean) => void;
}

export default function DroneVideoModal({ droneId, setShowCamera }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [visible, setVisible] = useState(false); // animation state

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      el.requestFullscreen?.();
    }
  }, []);

  // Animate in on mount
  useEffect(() => {
    setVisible(true);
  }, []);

  const closeModal = () => {
    setVisible(false);
    setTimeout(() => setShowCamera(false), 200); // match duration
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const active = document.activeElement;

      const isTyping =
        active instanceof HTMLElement &&
        (active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          active.isContentEditable);

      if (!isTyping && e.key.toLowerCase() === "f") {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleFullscreen]);

  const { mutate: startStream } = useMutation(
    orpc.drone.stream.mutationOptions({
      onSuccess: (res) => {
        const { webrtcUrl } = res.data;
        connectWebRTC(webrtcUrl);
      },
      onError: (err) => {
        console.error("Failed to start stream:", err);
        setIsLoading(false);
      },
    })
  );

  const connectWebRTC = async (webrtcUrl: string) => {
    const pc = new RTCPeerConnection();
    pcRef.current = pc;

    pc.addTransceiver("video", { direction: "recvonly" });
    pc.addTransceiver("audio", { direction: "recvonly" });

    pc.ontrack = (ev) => {
      if (videoRef.current && ev.streams?.[0]) {
        const video = videoRef.current;
        video.srcObject = ev.streams[0];
        video.play().catch((err) => {
          console.error("Video failed to play:", err);
        });
        video.onplaying = () => setIsLoading(false);
        video.onloadeddata = () => setIsLoading(false);
        setTimeout(() => setIsLoading(false), 5000);
      }
    };

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const response = await fetch(webrtcUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/sdp",
        },
        body: offer.sdp,
      });

      if (!response.ok) {
        throw new Error(`MediaMTX returned status ${response.status}`);
      }

      const answer = await response.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answer });
    } catch (error) {
      console.error("Failed to establish WebRTC connection:", error);
      setIsLoading(false);
    }
  };

  const initializedDroneId = useRef<string | null>(null);

  useEffect(() => {
    if (initializedDroneId.current === droneId) {
      return;
    }
    initializedDroneId.current = droneId;

    setIsLoading(true);
    startStream({ body: { droneId } });

    return () => {
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [droneId, startStream]);

  return (
    <div className="pointer-events-auto fixed inset-0 z-[999] flex items-center justify-center">
      {/* Overlay */}
      <button
        aria-label="Close modal"
        className={`absolute inset-0 bg-black/10 backdrop-blur-sm transition-opacity duration-200 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={closeModal}
        type="button"
      />

      {/* Video container */}
      <div
        className={`relative z-20 aspect-video w-[80vw] max-w-5xl transform rounded-md bg-black shadow-lg transition-all duration-200 ${
          visible ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
        ref={containerRef}
      >
        {/* Loader */}
        {isLoading && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-600 border-t-blue-500" />
          </div>
        )}

        {/* Video */}
        <video
          autoPlay
          className={`absolute inset-0 h-full w-full object-cover transition-opacity ${
            isLoading ? "opacity-0" : "opacity-100"
          }`}
          muted
          playsInline
          ref={videoRef}
        />

        {/* Fullscreen button */}
        <Button
          className="absolute right-3 bottom-3 z-40 bg-black/40 text-white hover:bg-black/70"
          onClick={toggleFullscreen}
          size="icon"
          variant="ghost"
        >
          <Maximize className="h-4 w-4" />
        </Button>

        {/* Close button */}
        <Button
          className="absolute top-3 right-3 z-40 bg-black/40 text-white hover:bg-black/70"
          onClick={closeModal}
          size="icon"
          variant="ghost"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
