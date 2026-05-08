import { ORPCError } from "@orpc/server";
import { env } from "@surudron/env/server";

import { droneRepository } from "./drone.repository";

export const getDroneStreamUrl = async (droneId: string) => {
  try {
    const response = await fetch(
      `http://${env.SERVER_HOST}:${env.MTX_API_PORT}/v3/config/paths/get/${droneId}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      },
    );

    if (!response.ok) {
      return null;
    }

    const webrtcUrl = `http://${env.SERVER_HOST}:${env.WEBRTC_PORT}/${droneId}/whep`;

    return webrtcUrl;
  } catch {
    return null;
  }
};

export const registerDroneStream = async (droneId: string) => {
  const streamUrl = await getDroneStreamUrl(droneId);

  if (streamUrl) {
    return streamUrl;
  }

  const response = await fetch(
    `http://${env.SERVER_HOST}:${env.MTX_API_PORT}/v3/config/paths/add/${droneId}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "publisher",
      }),
    },
  ).catch(() => null);

  if (!response?.ok) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: `Failed to register drone stream ${droneId}`,
    });
  }

  if (!droneRepository.hasActiveStream(droneId)) {
    const isWindows = process.platform === "win32";

    const rtspUrl = `rtsp://${env.SERVER_HOST}:${env.RTSP_PORT}/${droneId}`;

    const inputArgs = isWindows
      ? ["-f", "dshow", "-i", "video=HD USB Camera"]
      : ["-f", "v4l2", "-framerate", "30", "-pixel_format", "mjpeg", "-i", "/dev/video0"];

    const ffmpegArgs = [
      ...inputArgs,
      "-vcodec",
      "libx264",
      "-preset",
      "ultrafast",
      "-tune",
      "zerolatency",
      "-rtsp_transport",
      "tcp",
      "-f",
      "rtsp",
      rtspUrl,
    ];

    const ffmpegProcess = Bun.spawn(["ffmpeg", ...ffmpegArgs], {
      stdin: "ignore",
      onDisconnect: () => {
        droneRepository.removeActiveStream(droneId);
      },
      onExit: () => {
        droneRepository.removeActiveStream(droneId);
      },
    });

    droneRepository.setActiveStream(droneId, ffmpegProcess);
  }

  const CHECK_STREAM_READY_MAX_ATTEMPTS = 20;
  const CHECK_STREAM_READY_INTERVAL = 500;
  let isStreamReady = false;

  for (let i = 0; i < CHECK_STREAM_READY_MAX_ATTEMPTS; i++) {
    try {
      const response = await fetch(
        `http://${env.SERVER_HOST}:${env.MTX_API_PORT}/v3/paths/get/${droneId}`,
      );

      if (response.ok) {
        const data = (await response.json()) as { ready?: boolean };

        if (data.ready) {
          isStreamReady = true;

          break;
        }
      }
    } catch {
      continue;
    }

    await new Promise((resolve) => setTimeout(resolve, CHECK_STREAM_READY_INTERVAL));
  }

  if (!isStreamReady) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: `Stream for drone ${droneId} did not become ready in time`,
    });
  }

  const webrtcUrl = `http://${env.SERVER_HOST}:${env.WEBRTC_PORT}/${droneId}/whep`;

  return webrtcUrl;
};
