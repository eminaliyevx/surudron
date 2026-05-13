import { startServer, serialManager } from "@surudron/server";
import { BrowserWindow } from "electrobun/bun";

const server = startServer();

new BrowserWindow({
  title: "SuruDron",
  url: "views://mainview/index.html",
  frame: {
    width: 1280,
    height: 820,
    x: 120,
    y: 120,
  },
});

process.on("exit", () => {
  serialManager.stop();

  server.stop(true);
});

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));
