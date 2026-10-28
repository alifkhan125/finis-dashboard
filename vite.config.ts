import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/",

  plugins: [react()],

  server: {
    port: 3000,
    host: "0.0.0.0",
    proxy: {
      "/api": {
        target: "http://localhost:6000",
        changeOrigin: true,
        rewrite: (requestPath) => requestPath.replace(/^\/api/, ""),
      },
      "/socket.io": {
        target: "http://localhost:6000",
        changeOrigin: true,
        ws: true,
      },
    },
  },

  preview: {
    port: 3000,
    host: "0.0.0.0",
    allowedHosts: [
      "proconstructiq.com",
      "www.proconstructiq.com",
    ],
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "chart-vendor": ["recharts"],
          "ui-vendor": ["lucide-react"],
        },
      },
    },
  },
});