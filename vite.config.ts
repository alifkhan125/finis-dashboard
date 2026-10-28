import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.API_PROXY_TARGET || 'http://localhost:6000';
  const proxy = {
    '/api': {
      target,
      changeOrigin: true,
      rewrite: (requestPath: string) => requestPath.replace(/^\/api/, ''),
    },
    '/socket.io': { target, changeOrigin: true, ws: true },
  };
  return {
  base: "/",

  plugins: [react()],

  server: {
    port: 3000,
    host: "0.0.0.0",
    proxy,
  },

  preview: {
    proxy,
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
  };
});
