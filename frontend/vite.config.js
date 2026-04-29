import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // ЗАДЪЛЖИТЕЛНО за Windows Docker (bridge network)
    // Без това Vite слуша само на 127.0.0.1 вътре в контейнера
    // и е недостъпен от хоста
    host: "0.0.0.0",
    port: 5173,

    proxy: {
      // /api заявките се препращат към backend контейнера
      // "backend" е името на сервиза в docker-compose.yml
      "/api": {
        target: "http://backend:5000",
        changeOrigin: true,
      },
    },
  },
});
