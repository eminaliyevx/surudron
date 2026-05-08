import { os } from "../../orpc";
import { connect, disconnect, subscribe } from "./ardupilot.service";

export const sse = os.ardupilot.sse.handler(async function* ({ signal }) {
  const abortSignal = signal ?? new AbortController().signal;

  connect();

  try {
    for await (const data of subscribe(abortSignal)) {
      yield { data };
    }
  } finally {
    disconnect();
  }
});
