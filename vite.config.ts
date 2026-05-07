import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      "a541-2404-8000-1062-169-44eb-8d4c-105c-2716.ngrok-free.app",
    ],
  },
});
