import dotenv from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname as dn } from "node:path";

// Load env vars from .env (or .env.example as fallback)
const __dirname = dn(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env");
const envExamplePath = resolve(__dirname, "../.env.example");

// Try .env first, then fallback to .env.example
dotenv.config({ path: envPath });
dotenv.config({ path: envExamplePath });

// Suppress discord.js deprecation warning about 'ready' -> 'clientReady'
process.removeAllListeners("warning");
process.on("warning", (warning) => {
  if (
    warning.name === "DeprecationWarning" &&
    warning.message.includes("clientReady")
  ) {
    return; // Ignore this specific warning
  }
  console.warn(warning);
});

import { Client, IntentsBitField } from "discord.js";
import { CommandKit } from "commandkit";
import { keepAlive } from "./utils/keepAlive.js";

const dirname = __dirname;

const client = new Client({
  intents: [IntentsBitField.Flags.Guilds],
});

// Detect environment
// Support both NODE_ENV and DEV_MODE
const devMode = process.env.DEV_MODE === "true" || process.env.DEV_MODE === "1";
const nodeEnvDev = process.env.NODE_ENV === "development";
const isDevelopment =
  devMode || nodeEnvDev || (!process.env.NODE_ENV && !process.env.DEV_MODE);
const environment = isDevelopment ? "DEVELOPMENT" : "PRODUCTION";

// Detect host/platform
const isRender = !!process.env.RENDER;
const isReplit = !!process.env.REPL_ID || !!process.env.REPL_SLUG;
const isVercel = !!process.env.VERCEL;
const isHeroku = !!process.env.DYNO;
const isLocalhost = !isRender && !isReplit && !isVercel && !isHeroku;

let hostInfo = "Unknown";
if (isRender) hostInfo = "Render (Production)";
else if (isReplit) hostInfo = "Replit";
else if (isVercel) hostInfo = "Vercel";
else if (isHeroku) hostInfo = "Heroku";
else hostInfo = "Localhost (Development)";

// Display environment info
console.log("\n" + "=".repeat(60));
console.log(`[Bot] 🚀 Starting Bot...`);
console.log(`[Bot] 📍 Host: ${hostInfo}`);
console.log(`[Bot] 🔧 Environment: ${environment}`);
console.log(
  `[Bot] 🏠 Running on: ${isLocalhost ? "LOCALHOST" : "PRODUCTION HOST"}`
);

if (isDevelopment) {
  console.log(
    `[Bot] ⚠️  Running in DEVELOPMENT mode - commands will be limited to dev guilds only!`
  );
} else {
  console.log(`[Bot] ✅ Running in PRODUCTION mode - commands will be global`);
}

if (isLocalhost && !isDevelopment) {
  console.warn(
    `[Bot] ⚠️  WARNING: Running on localhost but NODE_ENV is not 'development'!`
  );
  console.warn(
    `[Bot] ⚠️  Consider setting NODE_ENV=development or DEV_MODE=true for local testing`
  );
}

if (!isLocalhost && isDevelopment) {
  console.warn(
    `[Bot] ⚠️  WARNING: Running on production host (${hostInfo}) but in DEVELOPMENT mode!`
  );
  console.warn(`[Bot] ⚠️  This is unusual - make sure this is intentional`);
}

console.log("=".repeat(60) + "\n");

// Get dev guild IDs from environment for instant command updates
const devConfig = process.env.DEV_GUILD_IDS || process.env.DEV_GUILD_ID || "";
const devGuildIds = devConfig
  ? devConfig
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id !== "")
  : [];

if (isDevelopment && devGuildIds.length === 0) {
  console.warn(
    `[Bot] ⚠️  WARNING: Running in DEVELOPMENT mode but no DEV_GUILD_IDS specified!`
  );
  console.warn(
    `[Bot] ⚠️  Commands will be registered globally and may conflict with production bot!`
  );
  console.warn(
    `[Bot] ⚠️  Please set DEV_GUILD_IDS in your .env file for local testing.`
  );
} else {
  console.log(
    `[Bot] Dev Guild IDs: ${
      devGuildIds.length > 0
        ? devGuildIds.join(", ")
        : "None (using global commands)"
    }`
  );
}

// Get token based on environment
// Priority: TOKEN > TOKEN_PROD/TOKEN_TEST (based on NODE_ENV)
let token = process.env.TOKEN;
let tokenSource = "TOKEN";

if (!token) {
  // If TOKEN is not set, try TOKEN_PROD or TOKEN_TEST based on environment
  if (isDevelopment) {
    token = process.env.TOKEN_TEST;
    if (token) {
      tokenSource = "TOKEN_TEST";
      console.log(`[Bot] 🔑 Using TOKEN_TEST for development mode`);
    }
  } else {
    token = process.env.TOKEN_PROD;
    if (token) {
      tokenSource = "TOKEN_PROD";
      console.log(`[Bot] 🔑 Using TOKEN_PROD for production mode`);
    }
  }
} else {
  console.log(`[Bot] 🔑 Using TOKEN (explicit token set)`);
}

// Show token info (masked for security)
if (token) {
  const maskedToken =
    token.length > 10
      ? `${token.substring(0, 4)}...${token.substring(token.length - 4)}`
      : "***";
  console.log(`[Bot] 🔐 Token Source: ${tokenSource}`);
  console.log(`[Bot] 🔐 Token Preview: ${maskedToken}`);
}

// Validate token
if (!token || typeof token !== "string" || token.trim() === "") {
  console.error("[Error] Discord bot token is missing or invalid!");
  if (isDevelopment) {
    console.error("[Error] Please set TOKEN or TOKEN_TEST in your .env file");
  } else {
    console.error("[Error] Please set TOKEN or TOKEN_PROD in your .env file");
  }
  process.exit(1);
}

new CommandKit({
  client,
  eventsPath: `${dirname}/events`,
  commandsPath: `${dirname}/commands`,
  devGuildIds,
});

import { getAllChampionNames } from "./utils/ddragon.js";

// Start keep-alive server for UptimeRobot
keepAlive();

// Pre-warm cache
console.log("[System] Pre-warming DDragon cache...");
getAllChampionNames()
  .then((names) => {
    console.log(`[System] Cached ${names.length} champions`);
    client.login(token);
  })
  .catch((err) => {
    console.error("[System] Failed to pre-warm cache:", err);
    client.login(token);
  });
