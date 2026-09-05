import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  server: { strictPort: true, watch: { usePolling: true, interval: 500 } },
});
