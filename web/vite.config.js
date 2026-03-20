import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Enable polling watch for environments where the file system watcher
// is unreliable (WSL on Windows, network mounts, etc.). This forces Vite
// to poll for changes so the dev server reloads automatically.
export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      usePolling: true,
      interval: 100,
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{js,jsx}"],
  },
});
