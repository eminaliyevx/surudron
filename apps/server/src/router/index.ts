import { os } from "../orpc";
import * as ardupilot from "./ardupilot";
import * as drone from "./drone";
import * as serial from "./serial";

export const router = os.router({
  serial,
  ardupilot,
  drone,
});
