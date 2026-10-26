import { defineConfig } from "@trigger.dev/sdk/v3";
import { additionalFiles, aptGet } from "@trigger.dev/build/extensions/core";

export default defineConfig({
  project: "proj_gjqzhpwuipjqsnfghkkw",
  runtime: "node",
  logLevel: "log",
  maxDuration: 3600,
  dirs: ["src/trigger"],
  // process.cwd() = cartella del build, dove additionalFiles copia reel-studio/
  legacyDevProcessCwdBehaviour: false,
  build: {
    extensions: [
      // Reel Studio (montaggio dei reel caricati dall'app /reel): sorgenti + effetti sonori, senza video né node_modules
      additionalFiles({
        files: [
          "reel-studio/package.json",
          "reel-studio/package-lock.json",
          "reel-studio/tsconfig.json",
          "reel-studio/remotion.config.ts",
          "reel-studio/src/**",
          "reel-studio/scripts/**",
          "reel-studio/public/sfx/**",
          // il registro dei progetti (src/projects.generated.ts) importa questi file: servono al bundle Remotion
          "reel-studio/projects/*/edit.json",
        ],
      }),
      // ffmpeg + curl per la pipeline, librerie di sistema per il Chrome headless di Remotion
      aptGet({
        packages: [
          "ffmpeg",
          "curl",
          "ca-certificates",
          "libnss3",
          "libdbus-1-3",
          "libatk1.0-0",
          "libgbm1",
          "libasound2",
          "libxrandr2",
          "libxkbcommon0",
          "libxfixes3",
          "libxcomposite1",
          "libxdamage1",
          "libatk-bridge2.0-0",
          "libpango-1.0-0",
          "libcairo2",
          "libcups2",
        ],
      }),
      {
        name: "reel-studio-install",
        onBuildComplete: async (context) => {
          if (context.target !== "deploy") return;
          context.addLayer({
            id: "reel-studio-deps",
            commands: ["cd reel-studio && npm ci --include=dev --no-audit --no-fund && npx remotion browser ensure"],
          });
        },
      },
    ],
  },
});
