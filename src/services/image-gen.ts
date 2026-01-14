import { createCanvas, loadImage } from "@napi-rs/canvas";
import { AttachmentBuilder } from "discord.js";
import axios from "axios";
import {
  getLatestVersion,
  getItemImageUrl,
  getChampionImageUrl,
  getSummonerSpellImageUrl,
  getRuneImageUrl,
  getRuneData,
  getChampionData,
} from "../utils/ddragon.js";

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 1000; // Increased height for 4-row layout
const PADDING = 30;

/**
 * Generate a visual build summary image
 */
export async function generateBuildImage(
  championName: string,
  buildData: any, // Pass full build object
  version: string,
  stats: { winRate: string; pickRate: string; role: string }
): Promise<AttachmentBuilder | null> {
  try {
    const startTime = Date.now();
    console.log(`[ImageGen] 🎨 Starting generation for ${championName}...`);
    const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
    const ctx = canvas.getContext("2d");

    // -- Background --
    const gradient = ctx.createLinearGradient(
      0,
      0,
      CANVAS_WIDTH,
      CANVAS_HEIGHT
    );
    gradient.addColorStop(0, "#11131f");
    gradient.addColorStop(1, "#0a0b12");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // -- Header --
    // Sanitize champion name for URL (remove spaces, special chars)
    const formattedName = championName.replace(/\s+/g, "").replace(/[^a-zA-Z0-9]/g, "");
    if (!formattedName) {
      console.error(`[ImageGen] ❌ Invalid champion name: "${championName}"`);
      return null;
    }
    
    const champUrl = `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${formattedName}_0.jpg`;
    const HEADER_H = 220;
    let headerImageLoaded = false;
    
    try {
      const champImg = await loadImage(champUrl);
      const w = CANVAS_WIDTH;
      // Crop center
      const sy = (champImg.height - (HEADER_H * champImg.width) / w) / 2;
      ctx.drawImage(
        champImg,
        0,
        sy,
        champImg.width,
        (HEADER_H * champImg.width) / w,
        0,
        0,
        w,
        HEADER_H
      );
      headerImageLoaded = true;
    } catch (error: any) {
      // If champion image fails to load (403, 404, etc.), it might mean champion doesn't exist
      const errorMsg = error?.message || String(error);
      if (errorMsg.includes("403") || errorMsg.includes("404") || errorMsg.includes("rejected")) {
        console.error(`[ImageGen] ❌ Champion image not found (403/404): ${champUrl}`);
        console.error(`[ImageGen] ❌ This might mean the champion "${championName}" doesn't exist or build data is invalid`);
        return null; // Return null to indicate failure
      }
      // For other errors, log but continue (might be network issue)
      console.warn(`[ImageGen] ⚠️  Failed to load champion image: ${errorMsg}`);
      // Continue without image
    }

    // Gradient Overlay (always draw, even if image failed)
    const w = CANVAS_WIDTH;
    const headerGradient = ctx.createLinearGradient(0, 0, 0, HEADER_H);
    headerGradient.addColorStop(0, "rgba(17, 19, 31, 0.4)");
    headerGradient.addColorStop(1, "#11131f");
    ctx.fillStyle = headerGradient;
    ctx.fillRect(0, 0, w, HEADER_H);

    // Title
    ctx.save();
    ctx.shadowColor = "black";
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#f0e6d2";
    ctx.font = "bold 64px Sans";
    ctx.fillText(championName, PADDING + 20, 110);

    ctx.font = "30px Sans";
    ctx.fillStyle = "#a09b8c";
    ctx.fillText(
      `${stats.role}  |  Win: ${stats.winRate}  |  Pick: ${stats.pickRate}`,
      PADDING + 24,
      160
    );
    ctx.restore();

    // -- Layout Helper --
    const SEPARATOR_X = 600;

    // Draw Vertical Separator
    ctx.strokeStyle = "#3c3c41";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(SEPARATOR_X, HEADER_H + 20);
    ctx.lineTo(SEPARATOR_X, CANVAS_HEIGHT - 20);
    ctx.stroke();

    // ================= LEFT PANEL: ITEMS =================
    const drawItemSection = async (
      title: string,
      items: number[],
      x: number,
      y: number,
      scale = 64
    ) => {
      if (!items || items.length === 0) return;
      ctx.fillStyle = "#c8aa6e";
      ctx.font = "bold 24px Sans";
      ctx.fillText(title, x, y);

      const cy = y + 20;
      const GAP = 12;

      // Parallel Load
      await Promise.all(
        items.map(async (id, index) => {
          const cx = x + index * (scale + GAP);
          const url = getItemImageUrl(version, id);
          if (!url || !url.startsWith("http")) {
            console.warn(`[ImageGen] ⚠️  Invalid item URL for item ${id}: ${url}`);
            return;
          }
          try {
            const img = await loadImage(url);
            // Shadow
            ctx.save();
            ctx.shadowColor = "black";
            ctx.shadowBlur = 5;
            ctx.drawImage(img, cx, cy, scale, scale);
            ctx.restore();
            // Border
            ctx.strokeStyle = "#5c5b57";
            ctx.lineWidth = 1;
            ctx.strokeRect(cx, cy, scale, scale);
          } catch (error: any) {
            const errorMsg = error?.message || String(error);
            if (errorMsg.includes("403") || errorMsg.includes("404")) {
              console.warn(`[ImageGen] ⚠️  Item image not found (403/404): ${url}`);
            }
            // Continue without this item image
          }
        })
      );
    };

    const LEFT_COL_X = 50;
    const ITEM_Y_START = HEADER_H + 40;
    const COL_WIDTH = 270; // Width per column in the layout grid

    // Define sections with their positions
    // Layout: 2x2 Grid for Items
    // Row 1: Starter (Left), Early (Right)
    // Row 2: Core (Left), Full Build (Right)
    // Wait, user image shows all in one column?
    // User image shows:
    // Starter Items
    // [Items]
    // Early Items
    // [Items]
    // Core Items
    // [Items]
    // Full Build
    // [Items]
    // All in one vertical stack?
    // Re-checking user image...
    // The user image shows:
    // Left side: Items (User uploaded image 2)
    // Starter Items -> Early Items -> Core Items -> Full Build
    // All vertically stacked on the left side.

    // Let's implement vertical stack on the left side as per Mobalytics standard

    // Vertical spacing
    const SECTION_GAP = 100;

    await Promise.all([
      // 1. Starter Items
      drawItemSection(
        "Starter Items",
        buildData.startingItems,
        LEFT_COL_X,
        ITEM_Y_START
      ),
      // 2. Early Items
      drawItemSection(
        "Early Items",
        buildData.earlyItems,
        LEFT_COL_X,
        ITEM_Y_START + SECTION_GAP
      ),
      // 3. Core Items
      drawItemSection(
        "Core Items",
        buildData.coreItems,
        LEFT_COL_X,
        ITEM_Y_START + SECTION_GAP * 2,
        64 // scale
      ),
      // 4. Full Build (was Situational)
      drawItemSection(
        "Full Build",
        buildData.situationalItems,
        LEFT_COL_X,
        ITEM_Y_START + SECTION_GAP * 3.5 // Give more space for Core if needed
      ),
    ]);

    // Summoner Spells (Bottom Left)
    ctx.fillStyle = "#c8aa6e";
    ctx.font = "bold 24px Sans";
    ctx.fillText("Summoner Spells", LEFT_COL_X, ITEM_Y_START + 500);

    const [spell1, spell2] = await Promise.all([
      getSummonerSpellImageUrl(version, buildData.summonerSpell1),
      getSummonerSpellImageUrl(version, buildData.summonerSpell2),
    ]);

    const drawSpell = async (url: string, x: number, y: number) => {
      const img = await loadImage(url);
      ctx.drawImage(img, x, y, 64, 64);
      ctx.strokeStyle = "#c8aa6e";
      ctx.strokeRect(x, y, 64, 64);
    };

    await Promise.all([
      drawSpell(spell1, LEFT_COL_X, ITEM_Y_START + 530),
      drawSpell(spell2, LEFT_COL_X + 80, ITEM_Y_START + 530),
    ]);

    // Boots (Next to Starter)
    await drawItemSection(
      "Boots",
      [buildData.boots],
      LEFT_COL_X + 300, // Offset to right of Starter
      ITEM_Y_START
    );

    // ================= RIGHT PANEL: RUNES =================
    const RUNE_START_X = SEPARATOR_X + 50;
    const RUNE_START_Y = HEADER_H + 40;

    ctx.fillStyle = "#c8aa6e";
    ctx.font = "bold 32px Sans";
    ctx.fillText("Runes", RUNE_START_X + 200, RUNE_START_Y);

    const runeData = await getRuneData(version);
    const activePerks = new Set(buildData.perks || []);

    // Helper: Draw Rune Icon
    const drawRune = async (
      url: string,
      x: number,
      y: number,
      size: number,
      active: boolean,
      isKeystone = false
    ) => {
      try {
        const img = await loadImage(url);
        ctx.save();
        if (!active) {
          ctx.globalAlpha = 0.2;
          ctx.filter = "grayscale(100%)";
        } else {
          ctx.globalAlpha = 1.0;
          if (isKeystone) {
            ctx.shadowColor = "#c8aa6e";
            ctx.shadowBlur = 10;
          }
        }
        const drawSize = active && isKeystone ? size + 10 : size;
        const offset = active && isKeystone ? -5 : 0;
        ctx.drawImage(img, x + offset, y + offset, drawSize, drawSize);

        // Ring for active normal runes
        if (active && !isKeystone) {
          ctx.beginPath();
          ctx.arc(x + size / 2, y + size / 2, size / 2 + 4, 0, Math.PI * 2);
          ctx.strokeStyle = "#c8aa6e";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        ctx.restore();
      } catch {}
    };

    // Primary Tree
    const primaryTree = runeData.find(
      (t: any) => t.id === buildData.runesPrimary
    );
    if (primaryTree) {
      const PX = RUNE_START_X;
      const PY = RUNE_START_Y + 50;

      const tasks: Promise<void>[] = [];

      // Tree Icon (add to tasks)
      tasks.push(
        drawRune(
          `https://ddragon.leagueoflegends.com/cdn/img/${primaryTree.icon}`,
          PX + 60,
          PY,
          48,
          true
        )
      );

      let rowY = PY + 70;

      for (const slot of primaryTree.slots) {
        const runes = slot.runes;
        const size = 48;
        const gap = 20;
        const totalW = runes.length * size + (runes.length - 1) * gap;
        const startX = PX + (200 - totalW) / 2;
        const currentRowY = rowY;

        tasks.push(
          ...runes.map(async (rune: any, i: number) => {
            const isActive = activePerks.has(rune.id);
            await drawRune(
              `https://ddragon.leagueoflegends.com/cdn/img/${rune.icon}`,
              startX + i * (size + gap),
              currentRowY,
              size,
              isActive,
              i === 0 && currentRowY === PY + 70
            );
          })
        );

        rowY += 65;
      }
      await Promise.all(tasks);
    }

    // Secondary Tree
    const secondaryTree = runeData.find(
      (t: any) => t.id === buildData.runesSecondary
    );
    if (secondaryTree) {
      const SX = RUNE_START_X + 260;
      const SY = RUNE_START_Y + 50;

      const tasks: Promise<void>[] = [];

      // Tree Icon (add to tasks)
      tasks.push(
        drawRune(
          `https://ddragon.leagueoflegends.com/cdn/img/${secondaryTree.icon}`,
          SX + 60,
          SY,
          48,
          true
        )
      );

      let rowY = SY + 70;

      for (let s = 1; s < secondaryTree.slots.length; s++) {
        const slot = secondaryTree.slots[s];
        const runes = slot.runes;
        const size = 40;
        const gap = 15;
        const totalW = runes.length * size + (runes.length - 1) * gap;
        const startX = SX + (200 - totalW) / 2;
        const currentRowY = rowY;

        tasks.push(
          ...runes.map(async (rune: any, i: number) => {
            const isActive = activePerks.has(rune.id);
            await drawRune(
              `https://ddragon.leagueoflegends.com/cdn/img/${rune.icon}`,
              startX + i * (size + gap),
              currentRowY,
              size,
              isActive
            );
          })
        );
        rowY += 65;
      }
      await Promise.all(tasks);
    }

    // Shards (3x3 Grid)
    // Hardcoded Standard Shard Rows for Visualization
    const SHARD_ROWS = [
      // Row 1: Adaptive, Attack Speed, Haste
      [5008, 5005, 5007],
      // Row 2: Adaptive, Move Speed, Health Scaling (Generic options)  - Standardizing to Adaptive, Armor, MR for simplicity/commonality if exact row data unknown
      // Actually, let's use the most common S15 options: Adaptive, MS, Health
      [5008, 5010, 5001], // 5010=MS, 5001=HealthScaling
      // Row 3: Health, Armor, MR (Defensive) or Tenacity
      // Let's use standard Defensive Row: Health, Armor, MR
      [5001, 5002, 5003],
    ];

    // Mappings for Icon URLs
    const SHARD_ICONS: Record<number, string> = {
      5008: "StatModsAdaptiveForceIcon.png",
      5005: "StatModsAttackSpeedIcon.png",
      5007: "StatModsCDRScalingIcon.png",
      5010: "StatModsMovementSpeedIcon.png",
      5001: "StatModsHealthScalingIcon.png",
      5002: "StatModsArmorIcon.png",
      5003: "StatModsMagicResIcon.png",
      5011: "StatModsTenacityIcon.png",
    };

    const activeShards =
      buildData.perks?.length > 6
        ? buildData.perks.slice(-3)
        : [5008, 5008, 5002]; // Default fallback

    const SHARD_Y = RUNE_START_Y + 320;
    const SHARD_X_CENTER = RUNE_START_X + 260 + 84; // Center under Secondary

    ctx.font = "16px Sans";
    ctx.fillStyle = "#777";
    // ctx.fillText('Stat Mods', SHARD_X_CENTER - 30, SHARD_Y - 20);

    // ctx.fillText('Stat Mods', SHARD_X_CENTER - 30, SHARD_Y - 20);
    const shardTasks: Promise<void>[] = [];

    for (let rowidx = 0; rowidx < 3; rowidx++) {
      const rowIds = SHARD_ROWS[rowidx];
      const selectedId = activeShards[rowidx] || rowIds[0]; // Default to first if mapping mismatch

      const SIZE = 32;
      const GAP = 20;
      const ROW_WIDTH = 3 * SIZE + 2 * GAP;
      const START_X = SHARD_X_CENTER - ROW_WIDTH / 2;
      const cy = SHARD_Y + rowidx * (SIZE + GAP);

      shardTasks.push(
        ...rowIds.map(async (id, i) => {
          const cx = START_X + i * (SIZE + GAP);
          const isActive = id === selectedId;

          // Draw Background Circle (Sync)
          // Note: Canvas draw calls inside async might race for layer order if overlapping.
          // But shards don't overlap.
          // HOWEVER, context state (fillStyle) IS shared.
          // CRITICAL: We cannot share global context state in parallel async functions if they set styles!
          // We must save/restore or ensure atomic operations.
          // `ctx.save()` helps, but `ctx.fillStyle = ...` followed by `ctx.fill()` must handle concurrency?
          // Node-canvas is effectively synchronous in JS execution, but if we await `loadImage`,
          // the context state might be changed by another "thread" (another promise continuation)?
          // NO. JS is single threaded.
          // Between `await loadImage` and `ctx.drawImage`, no other JS code runs unless we yield.
          // But if `Promise.all` runs multiple tasks:
          // Task A: await load (yields)
          // Task B: await load (yields)
          // Task A: resumes, sets fillStyle, draws.
          // Task B: resumes, sets fillStyle, draws.
          // It is SAFE because they don't interleave IN THE MIDDLE of synchronous blocks.
          // AS LONG AS we don't await BETWEEN setting style and drawing.

          // My code below does:
          // Canvas operations (Sync) -> then await loadImage -> then drawImage.
          // The Sync part runs immediately for all tasks before any await returns?
          // No, `activeShards loop` runs sync.
          // Be careful.
          // `ctx.beginPath` ... `ctx.fill`
          // If Task A sets path, then Task B sets path...
          // Wait. `tasks.map(async...)`
          // Loop runs, creates Promises.
          // Inside Promise:
          // `ctx.beginPath` runs immediately? Yes if not awaited before.
          // BUT `loadImage` is often at start or specific point.
          // My previous code: `drawRune` had `loadImage` at top.
          // So `ctx` operations happened AFTER load.
          // Safe.
          // But here, I have background circle drawing.
          // If I put background drawing BEFORE await, it runs for all shards sequentially (safe).
          // Then await image.
          // Then draw image.
          // Correct.

          // Draw Background Circle (Immediate)
          ctx.beginPath();
          ctx.arc(cx + SIZE / 2, cy + SIZE / 2, SIZE / 2 + 4, 0, Math.PI * 2);
          ctx.fillStyle = "#1e2328";
          ctx.fill();

          if (isActive) {
            ctx.strokeStyle = "#c8aa6e"; // Gold/Blue for selected
            ctx.lineWidth = 2;
            ctx.stroke();
          } else {
            ctx.strokeStyle = "#3c3c41";
            ctx.lineWidth = 1;
            ctx.stroke();
          }

          // Draw Icon (Async)
          try {
            const iconName = SHARD_ICONS[id] || "StatModsAdaptiveForceIcon.png";
            const url = `https://ddragon.leagueoflegends.com/cdn/img/perk-images/StatMods/${iconName}`;
            const img = await loadImage(url);

            ctx.save();
            if (!isActive) {
              ctx.globalAlpha = 0.3;
              ctx.filter = "grayscale(100%)";
            }
            // Center icon in circle
            ctx.drawImage(img, cx + 4, cy + 4, SIZE - 8, SIZE - 8);
            ctx.restore();
          } catch (e) {
            // Fallback dot
            ctx.beginPath();
            ctx.arc(cx + SIZE / 2, cy + SIZE / 2, 6, 0, Math.PI * 2);
            ctx.fillStyle = isActive ? "#c8aa6e" : "#555";
            ctx.fill();
          }
        })
      );
    }
    await Promise.all(shardTasks);

    const elapsed = Date.now() - startTime;
    console.log(`[ImageGen] ✅ Image generated in ${elapsed}ms`);
    const buffer = await canvas.encode("png");
    return new AttachmentBuilder(buffer, { name: "build-summary.png" });
  } catch (error) {
    console.error("Image generation failed:", error);
    return null;
  }
}

/**
 * Generate a visual counter matchup image
 */
export async function generateCounterImage(
  championName: string,
  bestMatchups: { name: string; winRate: string; games: string }[],
  worstMatchups: { name: string; winRate: string; games: string }[],
  version: string
): Promise<AttachmentBuilder | null> {
  try {
    const startTime = Date.now();
    console.log(`[ImageGen] 🎨 Starting counter image generation for ${championName}...`);
    
    const COUNTER_CANVAS_WIDTH = 1400;
    const COUNTER_CANVAS_HEIGHT = 1000;
    const COUNTER_PADDING = 40;
    
    const canvas = createCanvas(COUNTER_CANVAS_WIDTH, COUNTER_CANVAS_HEIGHT);
    const ctx = canvas.getContext("2d");

    // -- Background --
    const gradient = ctx.createLinearGradient(
      0,
      0,
      COUNTER_CANVAS_WIDTH,
      COUNTER_CANVAS_HEIGHT
    );
    gradient.addColorStop(0, "#1a1b26");
    gradient.addColorStop(1, "#0f1016");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, COUNTER_CANVAS_WIDTH, COUNTER_CANVAS_HEIGHT);

    // -- Header --
    const formattedName = championName.replace(/\s+/g, "").replace(/[^a-zA-Z0-9]/g, "");
    if (!formattedName) {
      console.error(`[ImageGen] ❌ Invalid champion name: "${championName}"`);
      return null;
    }
    
    const champUrl = `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${formattedName}_0.jpg`;
    const HEADER_H = 200;
    
    try {
      const champImg = await loadImage(champUrl);
      const w = COUNTER_CANVAS_WIDTH;
      const sy = (champImg.height - (HEADER_H * champImg.width) / w) / 2;
      ctx.drawImage(
        champImg,
        0,
        sy,
        champImg.width,
        (HEADER_H * champImg.width) / w,
        0,
        0,
        w,
        HEADER_H
      );
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      if (errorMsg.includes("403") || errorMsg.includes("404") || errorMsg.includes("rejected")) {
        console.error(`[ImageGen] ❌ Champion image not found (403/404): ${champUrl}`);
        return null;
      }
      console.warn(`[ImageGen] ⚠️  Failed to load champion image: ${errorMsg}`);
    }

    // Gradient Overlay
    const headerGradient = ctx.createLinearGradient(0, 0, 0, HEADER_H);
    headerGradient.addColorStop(0, "rgba(26, 27, 38, 0.5)");
    headerGradient.addColorStop(1, "#1a1b26");
    ctx.fillStyle = headerGradient;
    ctx.fillRect(0, 0, COUNTER_CANVAS_WIDTH, HEADER_H);

    // Title
    ctx.save();
    ctx.shadowColor = "black";
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#f0e6d2";
    ctx.font = "bold 52px Sans";
    ctx.fillText(`${championName} Counter`, COUNTER_PADDING + 20, 90);
    ctx.font = "22px Sans";
    ctx.fillStyle = "#a09b8c";
    ctx.fillText("Who to pick / Who counters you", COUNTER_PADDING + 20, 125);
    ctx.restore();

    // -- Content Area --
    const contentY = HEADER_H + COUNTER_PADDING;
    const contentHeight = COUNTER_CANVAS_HEIGHT - contentY - COUNTER_PADDING;
    const columnWidth = (COUNTER_CANVAS_WIDTH - COUNTER_PADDING * 3) / 2;
    const separatorX = COUNTER_PADDING + columnWidth + COUNTER_PADDING;

    // Draw Vertical Separator
    ctx.strokeStyle = "#3c3c41";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(separatorX, contentY);
    ctx.lineTo(separatorX, COUNTER_CANVAS_HEIGHT - COUNTER_PADDING);
    ctx.stroke();

    // -- Section Titles with icons --
    // Easy Matchups Title (Green) - You Win
    ctx.save();
    ctx.font = "bold 30px Sans";
    ctx.fillStyle = "#4ade80";
    // Draw green circle icon
    ctx.beginPath();
    ctx.arc(COUNTER_PADDING + 16, contentY + 22, 12, 0, Math.PI * 2);
    ctx.fill();
    // Draw checkmark
    ctx.strokeStyle = "#1a1b26";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(COUNTER_PADDING + 10, contentY + 22);
    ctx.lineTo(COUNTER_PADDING + 15, contentY + 27);
    ctx.lineTo(COUNTER_PADDING + 24, contentY + 17);
    ctx.stroke();
    ctx.fillText("Easy Matchups", COUNTER_PADDING + 38, contentY + 30);
    ctx.font = "16px Sans";
    ctx.fillStyle = "#a09b8c";
    ctx.fillText("(You counter them)", COUNTER_PADDING + 38, contentY + 52);
    ctx.restore();
    
    // Hard Matchups Title (Red) - You Lose
    ctx.save();
    ctx.font = "bold 30px Sans";
    ctx.fillStyle = "#f87171";
    // Draw red circle icon
    ctx.beginPath();
    ctx.arc(separatorX + COUNTER_PADDING + 16, contentY + 22, 12, 0, Math.PI * 2);
    ctx.fill();
    // Draw X
    ctx.strokeStyle = "#1a1b26";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(separatorX + COUNTER_PADDING + 10, contentY + 16);
    ctx.lineTo(separatorX + COUNTER_PADDING + 22, contentY + 28);
    ctx.moveTo(separatorX + COUNTER_PADDING + 22, contentY + 16);
    ctx.lineTo(separatorX + COUNTER_PADDING + 10, contentY + 28);
    ctx.stroke();
    ctx.fillText("Hard Matchups", separatorX + COUNTER_PADDING + 38, contentY + 30);
    ctx.font = "16px Sans";
    ctx.fillStyle = "#a09b8c";
    ctx.fillText("(They counter you)", separatorX + COUNTER_PADDING + 38, contentY + 52);
    ctx.restore();

    // -- Champion Images and Names --
    const championSize = 85;
    const championSpacing = 125;
    const startY = contentY + 60;
    const maxChampions = 10;
    const championsPerRow = 2;

    // Get champion data to map names correctly
    const championData = await getChampionData(version);
    
    // Helper function to find correct champion name from DDragon data
    const findChampionName = (name: string): string | null => {
      // First try exact match
      if (championData[name]) {
        return name;
      }
      
      // Try case-insensitive match
      const lowerName = name.toLowerCase();
      for (const key in championData) {
        if (key.toLowerCase() === lowerName) {
          return key;
        }
      }
      
      // Try matching by display name
      for (const key in championData) {
        const champ = championData[key];
        if (champ.name && champ.name.toLowerCase() === name.toLowerCase()) {
          return key; // Return the ID (key)
        }
      }
      
      // Try fuzzy matching (remove spaces, special chars)
      const normalized = name.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
      for (const key in championData) {
        const keyNormalized = key.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
        if (keyNormalized === normalized) {
          return key;
        }
        // Also check display name
        const champ = championData[key];
        if (champ.name) {
          const champNormalized = champ.name.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
          if (champNormalized === normalized) {
            return key;
          }
        }
      }
      
      return null;
    };

    // Pre-load all champion images with name mapping
    const loadChampionImage = async (championName: string): Promise<any> => {
      try {
        // Find correct champion ID from DDragon data
        const championId = findChampionName(championName);
        if (!championId) {
          console.warn(`[ImageGen] ⚠️  Could not find champion "${championName}" in DDragon data`);
          return null;
        }
        
        // Use champion ID directly for image URL (DDragon format: champion ID.png)
        // Don't use getChampionImageUrl as it sanitizes, we need exact ID
        const champImageUrl = `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${championId}.png`;
        if (champImageUrl && champImageUrl.startsWith("http")) {
          try {
            const img = await loadImage(champImageUrl);
            console.log(`[ImageGen] ✅ Loaded image for "${championName}" -> "${championId}"`);
            return img;
          } catch (error: any) {
            const errorMsg = error?.message || String(error);
            if (errorMsg.includes("403") || errorMsg.includes("404")) {
              console.warn(`[ImageGen] ⚠️  Image not found (403/404) for "${championName}" (ID: "${championId}"): ${champImageUrl}`);
            } else {
              console.warn(`[ImageGen] ⚠️  Failed to load image for "${championName}" (ID: "${championId}"): ${errorMsg}`);
            }
            return null;
          }
        } else {
          console.warn(`[ImageGen] ⚠️  Invalid image URL for "${championName}" (ID: "${championId}")`);
          return null;
        }
      } catch (error: any) {
        console.warn(`[ImageGen] ⚠️  Error loading image for "${championName}": ${error?.message || String(error)}`);
        return null;
      }
    };

    // Load all images in parallel
    const easyList = bestMatchups.slice(0, maxChampions);
    const hardList = worstMatchups.slice(0, maxChampions);
    
    const easyImages = await Promise.all(
      easyList.map(champ => loadChampionImage(champ.name))
    );
    const hardImages = await Promise.all(
      hardList.map(champ => loadChampionImage(champ.name))
    );

    // Helper function to draw champion with pre-loaded image
    const drawChampion = (
      x: number,
      y: number,
      champion: { name: string; winRate: string },
      index: number,
      isEasy: boolean,
      champImg: any
    ) => {
      const rankNum = index + 1;
      
      // Draw circle background with colored border for top 3
      ctx.save();
      ctx.beginPath();
      ctx.arc(x + championSize / 2, y + championSize / 2, championSize / 2 + 4, 0, Math.PI * 2);
      if (rankNum <= 3) {
        // Gold, Silver, Bronze borders for top 3
        const borderColors = ["#FFD700", "#C0C0C0", "#CD7F32"];
        ctx.strokeStyle = borderColors[rankNum - 1];
        ctx.lineWidth = 4;
        ctx.stroke();
      }
      ctx.fillStyle = isEasy ? "rgba(74, 222, 128, 0.15)" : "rgba(248, 113, 113, 0.15)";
      ctx.fill();
      ctx.restore();
      
      if (champImg) {
        // Draw champion image (circular)
        ctx.save();
        ctx.beginPath();
        ctx.arc(x + championSize / 2, y + championSize / 2, championSize / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(champImg, x, y, championSize, championSize);
        ctx.restore();
      } else {
        // Fallback: draw placeholder circle
        ctx.save();
        ctx.beginPath();
        ctx.arc(x + championSize / 2, y + championSize / 2, championSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = "#3c3c41";
        ctx.fill();
        ctx.strokeStyle = isEasy ? "#4ade80" : "#f87171";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }

      // Draw rank badge on top-left of champion image
      ctx.save();
      const badgeSize = 28;
      const badgeX = x - 5;
      const badgeY = y - 5;
      
      // Badge background with color based on rank
      ctx.beginPath();
      ctx.arc(badgeX + badgeSize / 2, badgeY + badgeSize / 2, badgeSize / 2, 0, Math.PI * 2);
      if (rankNum === 1) {
        ctx.fillStyle = "#FFD700"; // Gold
      } else if (rankNum === 2) {
        ctx.fillStyle = "#C0C0C0"; // Silver
      } else if (rankNum === 3) {
        ctx.fillStyle = "#CD7F32"; // Bronze
      } else {
        ctx.fillStyle = "#4a4a4a"; // Gray for others
      }
      ctx.fill();
      
      // Draw rank number
      ctx.font = "bold 16px Sans";
      ctx.fillStyle = rankNum <= 3 ? "#000000" : "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(rankNum.toString(), badgeX + badgeSize / 2, badgeY + badgeSize / 2);
      ctx.restore();

      // Draw champion name below image
      ctx.save();
      ctx.font = "bold 16px Sans";
      ctx.fillStyle = "#f0e6d2";
      ctx.textAlign = "center";
      const nameY = y + championSize + 20;
      const centerX = x + championSize / 2;
      let displayName = champion.name;
      const maxNameWidth = championSize + 40;
      ctx.font = "bold 16px Sans";
      if (ctx.measureText(displayName).width > maxNameWidth) {
        while (ctx.measureText(displayName + "...").width > maxNameWidth && displayName.length > 0) {
          displayName = displayName.slice(0, -1);
        }
        displayName += "...";
      }
      ctx.fillText(displayName, centerX, nameY);
      ctx.restore();
      
      // Draw win rate below champion name
      ctx.save();
      ctx.font = "bold 18px Sans";
      ctx.textAlign = "center";
      const winRateText = champion.winRate || "N/A";
      const displayWinRate = winRateText && winRateText !== "N/A" 
        ? (winRateText.includes("%") ? winRateText : winRateText + "%")
        : "N/A";
      const winRateY = nameY + 22;
      
      // Draw win rate text with color
      ctx.fillStyle = isEasy ? "#4ade80" : "#f87171";
      ctx.fillText(displayWinRate, centerX, winRateY);
      ctx.restore();
    };

    // Draw Easy Matchups (left column)
    easyList.forEach((champ, i) => {
      const row = Math.floor(i / championsPerRow);
      const col = i % championsPerRow;
      const x = COUNTER_PADDING + col * (championSize + 140);
      const y = startY + row * championSpacing;
      drawChampion(x, y, champ, i, true, easyImages[i]);
    });

    // Draw Hard Matchups (right column)
    hardList.forEach((champ, i) => {
      const row = Math.floor(i / championsPerRow);
      const col = i % championsPerRow;
      const x = separatorX + COUNTER_PADDING + col * (championSize + 140);
      const y = startY + row * championSpacing;
      drawChampion(x, y, champ, i, false, hardImages[i]);
    });

    const elapsed = Date.now() - startTime;
    console.log(`[ImageGen] ✅ Counter image generated in ${elapsed}ms`);
    const buffer = await canvas.encode("png");
    return new AttachmentBuilder(buffer, { name: "counter-matchups.png" });
  } catch (error) {
    console.error("[ImageGen] Counter image generation failed:", error);
    return null;
  }
}
