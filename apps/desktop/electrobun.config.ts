import type { ElectrobunConfig } from "electrobun";

const isWindows = process.platform === "win32";
const executableName = isWindows ? "serial.exe" : "serial";

const webBuildDir = "../web/dist" as const;
const serialExecutablePath = `../serial/target/release/${executableName}` as const;

export default {
  app: {
    name: "surudron",
    identifier: "com.surudron.desktop",
    version: "0.0.0",
  },
  runtime: {
    exitOnLastWindowClosed: true,
  },
  build: {
    bun: {
      entrypoint: "src/bun/index.ts",
      minify: true,
      sourcemap: "none",
    },
    copy: {
      [webBuildDir]: "views/mainview",
      [serialExecutablePath]: `bin/${executableName}`,
    },
    watchIgnore: [`${webBuildDir}/**`],
  },
} satisfies ElectrobunConfig;
