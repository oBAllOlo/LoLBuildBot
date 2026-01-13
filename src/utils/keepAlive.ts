/**
 * Keep-Alive Server
 * สร้าง HTTP server เพื่อให้ UptimeRobot ping ได้
 * ป้องกันไม่ให้ bot sleep บน Render/Replit free tier
 */

import { createServer } from "node:http";

// Replit ใช้ PORT จาก environment variable อัตโนมัติ
// Render ก็ใช้ PORT จาก environment variable
const PORT = process.env.PORT || 8080;

export function keepAlive() {
  const server = createServer((req, res) => {
    // Set CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(200);
      res.end();
      return;
    }

    // Log the incoming ping
    const timestamp = new Date().toLocaleTimeString();
    console.log(
      `[KeepAlive] 📡 Ping received at ${timestamp} (from: ${
        req.headers["user-agent"] || "Unknown"
      })`
    );

    // Simple response
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("I'm still running! Bot is alive! 🤖");
  });

  server.listen(PORT, () => {
    console.log(`[KeepAlive] ✅ Server running on port ${PORT}`);
    console.log(`[KeepAlive] 📡 Ready for UptimeRobot pings!`);
  });

  // Handle errors
  server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE") {
      console.error(`[KeepAlive] ⚠️  Port ${PORT} is already in use`);
    } else {
      console.error(`[KeepAlive] ❌ Error:`, error);
    }
  });

  return server;
}
