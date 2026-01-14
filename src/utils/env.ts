/**
 * Environment Utilities
 * ฟังก์ชันสำหรับตรวจสอบ environment และ dev mode
 */

/**
 * ตรวจสอบว่ากำลังรันใน development mode หรือไม่
 * รองรับทั้ง NODE_ENV และ DEV_MODE
 */
export function isDevelopment(): boolean {
  const devMode = process.env.DEV_MODE === "true" || process.env.DEV_MODE === "1";
  const nodeEnvDev = process.env.NODE_ENV === "development";
  return devMode || nodeEnvDev || (!process.env.NODE_ENV && !process.env.DEV_MODE);
}

/**
 * ตรวจสอบว่ากำลังรันบน localhost หรือไม่
 * @returns true ถ้ารันบน localhost, false ถ้ารันบน production host
 */
export function isLocalhost(): boolean {
  const isRender = !!process.env.RENDER;
  const isReplit = !!process.env.REPL_ID || !!process.env.REPL_SLUG;
  const isVercel = !!process.env.VERCEL;
  const isHeroku = !!process.env.DYNO;
  return !isRender && !isReplit && !isVercel && !isHeroku;
}

/**
 * ตรวจสอบว่า host platform คืออะไร
 * @returns ชื่อ platform (Render, Replit, Vercel, Heroku, Localhost)
 */
export function getHostPlatform(): string {
  if (process.env.RENDER) return "Render";
  if (process.env.REPL_ID || process.env.REPL_SLUG) return "Replit";
  if (process.env.VERCEL) return "Vercel";
  if (process.env.DYNO) return "Heroku";
  return "Localhost";
}

/**
 * แสดงข้อมูล environment ทั้งหมด
 * ใช้สำหรับ debug หรือ logging
 */
export function getEnvironmentInfo(): {
  isDevelopment: boolean;
  isLocalhost: boolean;
  hostPlatform: string;
  environment: string;
  tokenSource: string;
} {
  const dev = isDevelopment();
  const local = isLocalhost();
  const platform = getHostPlatform();
  
  // Detect token source
  let tokenSource = "TOKEN";
  if (process.env.TOKEN) {
    tokenSource = "TOKEN";
  } else if (dev && process.env.TOKEN_TEST) {
    tokenSource = "TOKEN_TEST";
  } else if (!dev && process.env.TOKEN_PROD) {
    tokenSource = "TOKEN_PROD";
  }
  
  return {
    isDevelopment: dev,
    isLocalhost: local,
    hostPlatform: platform,
    environment: dev ? "DEVELOPMENT" : "PRODUCTION",
    tokenSource: tokenSource,
  };
}

/**
 * ตรวจสอบว่า guild ID นี้อยู่ในรายการ dev guilds หรือไม่
 */
export function isDevGuild(guildId: string | null): boolean {
  if (!guildId) return false;
  
  const devConfig = process.env.DEV_GUILD_IDS || process.env.DEV_GUILD_ID || "";
  const devGuildIds = devConfig
    ? devConfig
        .split(",")
        .map((id) => id.trim())
        .filter((id) => id !== "")
    : [];
  
  return devGuildIds.includes(guildId);
}

/**
 * ตรวจสอบว่าควรอนุญาตให้คำสั่งทำงานใน guild นี้หรือไม่
 * ใน development mode จะอนุญาตเฉพาะ dev guilds เท่านั้น
 */
export function canRunInGuild(guildId: string | null): boolean {
  if (!isDevelopment()) {
    // Production mode: อนุญาตทุก guild
    return true;
  }
  
  // Development mode: อนุญาตเฉพาะ dev guilds
  return isDevGuild(guildId);
}
