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
} from "../utils/ddragon.js";

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 800;
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
    const formattedName =
      championName.charAt(0).toUpperCase() +
      championName.slice(1).toLowerCase();
    const champUrl = `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${formattedName}_0.jpg`;
    const HEADER_H = 220;
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

      // Gradient Overlay
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
    } catch (e) {
      console.error("Header error:", e);
    }

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
          } catch {}
        })
      );
    };

    const LEFT_COL_X = 50;
    const START_Y = HEADER_H + 50;

    // Parallelize ALL item sections and spells
    await Promise.all([
      drawItemSection(
        "Starting Items",
        buildData.startingItems,
        LEFT_COL_X,
        START_Y
      ),
      drawItemSection("Boots", [buildData.boots], LEFT_COL_X + 300, START_Y),
      drawItemSection(
        "Core Build",
        buildData.coreItems,
        LEFT_COL_X,
        START_Y + 140,
        80
      ),
      drawItemSection(
        "Situational Items",
        buildData.situationalItems,
        LEFT_COL_X,
        START_Y + 280
      ),
    ]);

    // Summoner Spells (Bottom Left)
    ctx.fillStyle = "#c8aa6e";
    ctx.font = "bold 24px Sans";
    ctx.fillText("Summoner Spells", LEFT_COL_X, START_Y + 400);

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
      drawSpell(spell1, LEFT_COL_X, START_Y + 420),
      drawSpell(spell2, LEFT_COL_X + 80, START_Y + 420),
    ]);

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
