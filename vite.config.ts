import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Binds to 0.0.0.0 (not just localhost) so the Home dashboard can be
    // opened from a phone on the same Wi-Fi via the "Network:" URL Vite
    // prints on startup - the "share to mobile" ask, done the cheap way
    // (no QR code, no extra dependency).
    host: true,
    allowedHosts: [
      "a541-2404-8000-1062-169-44eb-8d4c-105c-2716.ngrok-free.app",
    ],
  },
});
