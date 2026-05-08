import { os } from "../../orpc";
import { registerDroneStream } from "./drone.service";

export const stream = os.drone.stream.handler(async ({ input }) => {
  const { droneId } = input.body;

  const webrtcUrl = await registerDroneStream(droneId);

  return {
    data: {
      webrtcUrl,
    },
  };
});
