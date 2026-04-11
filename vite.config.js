import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  base: "/",
  plugins: [
    react(),
    {
      name: "notebooks-passthrough",
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (req.url === "/notebooks" || req.url === "/notebooks/") {
            req.url = "/notebooks/index.html";
          }
          next();
        });
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
