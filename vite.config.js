import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import menuHandler from "./api/menu.js";

function menuApiPlugin() {
  return {
    name: "menu-api-plugin",
    configureServer(server) {
      server.middlewares.use("/api/menu", async (req, res) => {
        try {
          await menuHandler(req, res);
        } catch (err) {
          console.error("[API Menu Error]:", err);
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: String(err) }));
        }
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use("/api/menu", async (req, res) => {
        try {
          await menuHandler(req, res);
        } catch (err) {
          console.error("[API Menu Error]:", err);
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: String(err) }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), menuApiPlugin()],
  server: {
    host: "0.0.0.0",
    port: 3000,
  },
  preview: {
    host: "0.0.0.0",
    port: 3000,
  },
});
