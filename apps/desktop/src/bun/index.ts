import { startServer, serialManager } from "@surudron/server";
import { BrowserWindow } from "electrobun/bun";

const getMainViewUrl = () => {
  return "views://mainview/index.html";
};

const server = startServer();

const url = getMainViewUrl();

new BrowserWindow({
  title: "surudron",
  url,
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
