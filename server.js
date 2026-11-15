// server.ts
import express from "express";
import dotenv from "dotenv";
import path2 from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";

// lib/lametricStore.ts
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
var RECORD_SIZE = 16;
var LaMetricLocalStore = class {
  constructor() {
    this.indexBuf = null;
    this.entryCount = 0;
    this.catalog = [];
    this.shardFds = /* @__PURE__ */ new Map();
    this.stats = {
      ready: false,
      totalIcons: 0,
      pngCount: 0,
      gifCount: 0,
      totalPayloadBytes: 0,
      updatedAt: null
    };
    this.lastProbeTime = 0;
    this.dataDir = path.resolve(process.cwd(), "data", "lametric");
  }
  resolveDataDir() {
    const cwdPath = path.resolve(process.cwd(), "data", "lametric");
    if (fs.existsSync(path.join(cwdPath, "index.bin"))) return cwdPath;
    return this.dataDir;
  }
  reload() {
    const dir = this.resolveDataDir();
    const indexPath = path.join(dir, "index.bin");
    const catalogPath = path.join(dir, "catalog.json.gz");
    const manifestPath = path.join(dir, "manifest.json");
    if (!fs.existsSync(indexPath) || !fs.existsSync(catalogPath)) {
      return false;
    }
    try {
      for (const fd of this.shardFds.values()) {
        try {
          fs.closeSync(fd);
        } catch {
        }
      }
      this.shardFds.clear();
      const indexBuf = fs.readFileSync(indexPath);
      const entryCount = Math.floor(indexBuf.length / RECORD_SIZE);
      const gzBuf = fs.readFileSync(catalogPath);
      const rawJson = zlib.gunzipSync(gzBuf).toString("utf8");
      const rawItems = JSON.parse(rawJson);
      const catalog = rawItems.map((r) => ({
        id: r.id,
        title: r.t,
        isGif: r.y === 1,
        category: r.c
      }));
      let pngCount = 0;
      let gifCount = 0;
      for (const item of catalog) {
        if (item.isGif) gifCount++;
        else pngCount++;
      }
      let totalPayloadBytes = 0;
      let updatedAt = null;
      if (fs.existsSync(manifestPath)) {
        try {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
          totalPayloadBytes = manifest.totalPayloadBytes || 0;
          updatedAt = manifest.updatedAt || null;
        } catch {
        }
      }
      this.dataDir = dir;
      this.indexBuf = indexBuf;
      this.entryCount = entryCount;
      this.catalog = catalog;
      this.stats = {
        ready: entryCount > 0,
        totalIcons: catalog.length || entryCount,
        pngCount,
        gifCount,
        totalPayloadBytes,
        updatedAt
      };
      return true;
    } catch (err) {
      console.warn("[LaMetricLocalStore] Failed to load local library:", err);
      return false;
    }
  }
  ensureLoaded() {
    if (this.indexBuf && this.entryCount > 0) return true;
    const now = Date.now();
    if (now - this.lastProbeTime < 5e3) return false;
    this.lastProbeTime = now;
    return this.reload();
  }
  getStats() {
    this.ensureLoaded();
    return this.stats;
  }
  getIconById(targetId) {
    if (!this.ensureLoaded() || !this.indexBuf || this.entryCount === 0) {
      return null;
    }
    let lo = 0;
    let hi = this.entryCount - 1;
    let foundIdx = -1;
    while (lo <= hi) {
      const mid = lo + hi >>> 1;
      const midId = this.indexBuf.readUInt32LE(mid * RECORD_SIZE);
      if (midId === targetId) {
        foundIdx = mid;
        break;
      }
      if (midId < targetId) lo = mid + 1;
      else hi = mid - 1;
    }
    if (foundIdx === -1) return null;
    const base = foundIdx * RECORD_SIZE;
    const shard = this.indexBuf.readUInt16LE(base + 4);
    const mediaType = this.indexBuf.readUInt8(base + 6);
    const offset = this.indexBuf.readUInt32LE(base + 8);
    const length = this.indexBuf.readUInt32LE(base + 12);
    if (length <= 0) return null;
    let fd = this.shardFds.get(shard);
    if (fd === void 0) {
      const shardPath = path.join(this.dataDir, `pack_${String(shard).padStart(2, "0")}.bin`);
      if (!fs.existsSync(shardPath)) return null;
      fd = fs.openSync(shardPath, "r");
      this.shardFds.set(shard, fd);
    }
    const outBuf = Buffer.allocUnsafe(length);
    const bytesRead = fs.readSync(fd, outBuf, 0, length, offset);
    if (bytesRead <= 0) return null;
    const contentType = mediaType === 2 ? "image/gif" : mediaType === 3 ? "image/webp" : "image/png";
    return {
      buffer: bytesRead === length ? outBuf : outBuf.subarray(0, bytesRead),
      contentType
    };
  }
  searchCatalog(options) {
    this.ensureLoaded();
    const qRaw = (options.q || "").trim().toLowerCase().replace(/^#/, "");
    const typeFilter = options.type || "all";
    const pageSize = Math.max(1, Math.min(120, Number(options.pageSize) || 48));
    const page = Math.max(1, Number(options.page) || 1);
    let filtered = this.catalog;
    if (typeFilter === "gif") {
      filtered = filtered.filter((i) => i.isGif);
    } else if (typeFilter === "png") {
      filtered = filtered.filter((i) => !i.isGif);
    }
    if (qRaw) {
      const isNumeric = /^\d+$/.test(qRaw);
      const exactIdMatches = [];
      const otherMatches = [];
      for (const item of filtered) {
        const idStr = String(item.id);
        if (isNumeric && idStr === qRaw) {
          exactIdMatches.push(item);
        } else if (idStr.includes(qRaw) || item.title.toLowerCase().includes(qRaw)) {
          otherMatches.push(item);
        }
      }
      filtered = exactIdMatches.length > 0 ? [...exactIdMatches, ...otherMatches] : otherMatches;
    }
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize).map((it) => ({
      id: it.id,
      title: it.title,
      type: it.isGif ? "gif" : "png",
      category: it.category
    }));
    return {
      ready: this.stats.ready,
      stats: this.stats,
      total,
      page: safePage,
      pageSize,
      totalPages,
      items
    };
  }
};
var lametricStore = new LaMetricLocalStore();

// server.ts
dotenv.config();
var __filename = fileURLToPath(import.meta.url);
var __dirname = path2.dirname(__filename);
var app = express();
function getPort() {
  const portArgIndex = process.argv.indexOf("--port");
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    return parseInt(process.argv[portArgIndex + 1], 10);
  }
  if (process.env.NODE_ENV !== "production") {
    return 3e3;
  }
  return Number(process.env.PORT) || 3e3;
}
var PORT = getPort();
app.use(express.json());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-target-url, x-target-method");
  res.header("Access-Control-Allow-Private-Network", "true");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});
app.all(
  "/api/proxy-device",
  express.raw({ type: ["application/octet-stream", "application/*", "*/*"], limit: "20mb" }),
  async (req, res) => {
    let targetUrl = req.headers["x-target-url"] || req.query.url;
    if (!targetUrl) {
      return res.status(400).json({ error: "\u7F3A\u5C11\u76EE\u6807\u8BBE\u5907\u5730\u5740 (x-target-url \u6807\u5934\u6216 url \u53C2\u6570)" });
    }
    targetUrl = targetUrl.trim();
    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      targetUrl = "http://" + targetUrl;
    }
    try {
      const parsed = new URL(targetUrl);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return res.status(400).json({ error: "\u4EC5\u652F\u6301 HTTP / HTTPS \u534F\u8BAE" });
      }
      const method = req.headers["x-target-method"] || req.method || "GET";
      const forwardHeaders = {};
      if (req.headers["content-type"]) {
        forwardHeaders["Content-Type"] = req.headers["content-type"];
      }
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8e3);
      const hasBody = !["GET", "HEAD"].includes(method.toUpperCase());
      const deviceRes = await fetch(targetUrl, {
        method: method.toUpperCase(),
        headers: forwardHeaders,
        body: hasBody ? req.body : void 0,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const responseBuffer = await deviceRes.arrayBuffer();
      res.status(deviceRes.status);
      const ct = deviceRes.headers.get("content-type");
      if (ct) res.setHeader("Content-Type", ct);
      res.setHeader("x-proxied-by", "neoclock-express");
      return res.send(Buffer.from(responseBuffer));
    } catch (err) {
      const isTimeout = err.name === "AbortError" || err.message?.includes("aborted");
      console.warn(`[Proxy-Device Error] ${targetUrl}:`, err.message);
      return res.status(502).json({
        error: isTimeout ? "\u8FDE\u63A5\u8BBE\u5907\u8D85\u65F6 (8\u79D2)\uFF0C\u8BF7\u68C0\u67E5\u8BBE\u5907 IP \u662F\u5426\u6B63\u786E\u4E14\u5728\u7EBF" : `\u8FDE\u63A5\u8BBE\u5907\u5931\u8D25: ${err.message}`,
        targetUrl
      });
    }
  }
);
app.get("/api/ping-device", async (req, res) => {
  let target = (req.query.url || "").trim();
  if (!target) return res.status(400).json({ reachable: false, error: "\u7F3A\u5C11 IP \u6216 URL" });
  if (!target.startsWith("http://") && !target.startsWith("https://")) {
    target = "http://" + target;
  }
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const r = await fetch(target, { method: "GET", signal: controller.signal });
    clearTimeout(timeout);
    return res.json({
      reachable: true,
      status: r.status,
      latencyMs: Date.now() - start,
      target
    });
  } catch (err) {
    return res.json({
      reachable: false,
      error: err.message,
      latencyMs: Date.now() - start,
      target
    });
  }
});
app.get("/api/lametric-icons", (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q : "";
  const typeParam = req.query.type === "gif" || req.query.type === "png" ? req.query.type : "all";
  const page = Number(req.query.page) || 1;
  const pageSize = Number(req.query.pageSize) || 48;
  const result = lametricStore.searchCatalog({ q, type: typeParam, page, pageSize });
  res.json(result);
});
app.get("/api/lametric-icon/:id", async (req, res) => {
  const rawId = (req.params.id || "").trim();
  const match = rawId.match(/(\d{1,10})/);
  if (!match) {
    return res.status(400).json({ error: "\u65E0\u6548\u7684 LaMetric \u56FE\u6807 ID\uFF0C\u5E94\u4E3A\u7EAF\u6570\u5B57\uFF08\u5982 230\uFF09" });
  }
  const cleanId = match[1];
  const numericId = Number(cleanId);
  const localIcon = lametricStore.getIconById(numericId);
  if (localIcon) {
    res.setHeader("Content-Type", localIcon.contentType);
    res.setHeader("X-LaMetric-Source", "local-library");
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.send(localIcon.buffer);
  }
  const remoteUrl = `https://developer.lametric.com/content/apps/icon_thumbs/${cleanId}`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8e3);
    const upstream = await fetch(remoteUrl, {
      method: "GET",
      headers: {
        "Accept": "image/gif,image/png,image/webp,image/*,*/*",
        "User-Agent": "NeoClock-Studio/1.0"
      },
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: upstream.status === 404 ? `\u672A\u627E\u5230 ID \u4E3A ${cleanId} \u7684 LaMetric \u56FE\u6807` : `LaMetric \u670D\u52A1\u5668\u8FD4\u56DE HTTP ${upstream.status}`
      });
    }
    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    const arrBuf = await upstream.arrayBuffer();
    res.setHeader("Content-Type", contentType);
    res.setHeader("X-LaMetric-Source", "upstream");
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.send(Buffer.from(arrBuf));
  } catch (err) {
    const isTimeout = err.name === "AbortError" || err.message?.includes("aborted");
    return res.status(502).json({
      error: isTimeout ? `\u62C9\u53D6 LaMetric \u56FE\u6807 #${cleanId} \u8D85\u65F6` : `\u62C9\u53D6 LaMetric \u56FE\u6807\u5931\u8D25: ${err.message}`
    });
  }
});
var getGenAIClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
};
var generateFallbackAnimation = (prompt, requestedFrames = 6) => {
  const count = Math.min(8, Math.max(4, requestedFrames));
  const lower = prompt.toLowerCase();
  if (lower.includes("\u706B") || lower.includes("fire") || lower.includes("flame") || lower.includes("burn")) {
    const palette2 = {
      ".": "#000000",
      "B": "#8B4513",
      // Wood log brown
      "R": "#FF1A26",
      // Outer red flame
      "O": "#FF7700",
      // Mid orange flame
      "Y": "#FFD700",
      // Core golden yellow
      "W": "#FFFBE8"
      // Spark white/pale yellow
    };
    const frames2 = [];
    for (let f = 0; f < count; f++) {
      const grid = [];
      for (let r = 0; r < 8; r++) {
        let rowStr = "";
        for (let c = 0; c < 32; c++) {
          const isCampfireArea = c >= 11 && c <= 20;
          if (!isCampfireArea) {
            rowStr += ".";
          } else {
            const height = 7 - r;
            const centerDist = Math.abs(c - 15.5);
            const flicker = Math.sin(f * 1.6 + c * 0.9) * 1.7 + Math.cos(f * 2.3 + r) * 1.1;
            const maxH = Math.max(1, 6 - centerDist * 0.9 + flicker);
            if (r === 7 && c >= 12 && c <= 19) {
              rowStr += "B";
            } else if (r === 6 && c >= 13 && c <= 18) {
              rowStr += "R";
            } else if (height <= maxH) {
              if (centerDist <= 1.2 && height <= 3) {
                rowStr += "Y";
              } else if (centerDist <= 2.2) {
                rowStr += "O";
              } else {
                rowStr += "R";
              }
            } else if (height === Math.floor(maxH + 1) && (f + c) % 3 === 0) {
              rowStr += "W";
            } else {
              rowStr += ".";
            }
          }
        }
        grid.push(rowStr);
      }
      frames2.push(grid);
    }
    const colorFrames2 = frames2.map((fr) => fr.map((row) => row.split("").map((ch) => ch === "." ? "" : palette2[ch] || "")));
    return {
      title: "\u6D41\u5149\u8DC3\u52A8\u7BDD\u706B (Multi-Color Campfire)",
      recommendedFps: 6,
      palette: palette2,
      frames: frames2,
      colorFrames: colorFrames2
    };
  }
  if (lower.includes("\u5FC3") || lower.includes("heart") || lower.includes("love") || lower.includes("pulse")) {
    const palette2 = {
      ".": "#000000",
      "R": "#E60012",
      // Heart ruby red
      "P": "#FF4081",
      // Outer glow pink
      "W": "#FFFFFF",
      // Heart highlight white
      "C": "#00E5FF",
      // Cyan pulse wave
      "G": "#00FF88"
      // Green lead dot
    };
    const frames2 = [];
    for (let f = 0; f < count; f++) {
      const pulse = f % 2 === 0;
      const heart = [
        "................................",
        pulse ? "..PP...PP......................." : "................................",
        pulse ? ".PRRR.PRRP......................" : "...PP...PP......................",
        pulse ? ".PRWRPPRRP......................" : "..PRRPPRRP......................",
        pulse ? "..PRRRRRRP......................" : "...PRRRRRP......................",
        pulse ? "...PRRRRP......................." : "....PRRRP.......................",
        pulse ? "....PRRP........................" : ".....PRP........................",
        "................................"
      ];
      const offset = f * 3 % 15;
      for (let r = 0; r < 8; r++) {
        const chars = heart[r].split("");
        for (let c = 16; c < 32; c++) {
          const ecgCol = c - 16;
          if (ecgCol === offset) {
            if (r === 2 || r === 5) chars[c] = "G";
            if (r === 3 || r === 4) chars[c] = "C";
          } else if (r === 4 && ecgCol >= 0 && ecgCol < 16) {
            chars[c] = "C";
          }
        }
        heart[r] = chars.join("");
      }
      frames2.push(heart);
    }
    const colorFrames2 = frames2.map((fr) => fr.map((row) => row.split("").map((ch) => ch === "." ? "" : palette2[ch] || "")));
    return {
      title: "\u8D5B\u535A\u5168\u5F69\u673A\u68B0\u5FC3\u8DF3 (Neon Heart Pulse)",
      recommendedFps: 6,
      palette: palette2,
      frames: frames2,
      colorFrames: colorFrames2
    };
  }
  const palette = {
    ".": "#000000",
    "Y": "#FFE600",
    // Pac-man yellow
    "R": "#FF0033",
    // Ghost red body
    "W": "#FFFFFF",
    // Ghost eye white
    "B": "#0044FF",
    // Ghost pupil blue
    "C": "#00E5FF",
    // Ghost cyan
    "O": "#FFA500"
    // Food pellet orange
  };
  const frames = [];
  for (let f = 0; f < count; f++) {
    const grid = [];
    const shift = f * 4 % 24;
    for (let r = 0; r < 8; r++) {
      let row = "";
      for (let c = 0; c < 32; c++) {
        const pacX = shift + 4;
        const dist = Math.sqrt((c - pacX) ** 2 + (r - 3.5) ** 2);
        if (dist <= 3) {
          const isMouth = f % 2 === 1 && c >= pacX && Math.abs(r - 3.5) <= 1.2;
          row += isMouth ? "." : "Y";
        } else if (c >= pacX - 9 && c <= pacX - 5 && r >= 1 && r <= 6) {
          if ((r === 2 || r === 3) && (c === pacX - 8 || c === pacX - 6)) {
            row += "W";
          } else if (r === 3 && (c === pacX - 8 || c === pacX - 6)) {
            row += "B";
          } else {
            row += f % 2 === 0 ? "R" : "C";
          }
        } else if (r === 3 && c > pacX + 2 && (c - pacX) % 3 === 0) {
          row += "O";
        } else {
          row += ".";
        }
      }
      grid.push(row);
    }
    frames.push(grid);
  }
  const colorFrames = frames.map((fr) => fr.map((row) => row.split("").map((ch) => ch === "." ? "" : palette[ch] || "")));
  return {
    title: "\u5168\u5F69\u50CF\u7D20\u7535\u73A9\u5403\u8C46\u4EBA (Multi-Color Arcade Pac-Man)",
    recommendedFps: 6,
    palette,
    frames,
    colorFrames
  };
};
app.get("/api/model-status", (_req, res) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY);
  res.json({
    connected: hasKey,
    model: "gemini-2.5-flash",
    provider: "Google Gemini AI",
    status: hasKey ? "online" : "no_key"
  });
});
app.post("/api/generate-pixel-animation", async (req, res) => {
  const startTime = Date.now();
  try {
    const { prompt, frameCount = 6 } = req.body;
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Prompt is required" });
    }
    const numFrames = Math.min(8, Math.max(4, Number(frameCount) || 6));
    const ai = getGenAIClient();
    if (!ai) {
      console.warn("GEMINI_API_KEY not found. Using algorithmic generator.");
      const fallback = generateFallbackAnimation(prompt, numFrames);
      return res.json({
        ...fallback,
        isRealAI: false,
        model: "algorithmic-fallback",
        latencyMs: Date.now() - startTime
      });
    }
    const systemInstruction = `You are an elite retro 8x32 RGB LED matrix pixel artist and animator for the ESP32-S3 Pixel Clock.
The display matrix has EXACTLY 8 rows and 32 columns (Width = 32, Height = 8, 256 RGB pixels total).
You must generate a smooth, continuous looping pixel animation consisting of exactly ${numFrames} frames based on the user's prompt.

CRITICAL DESIGN REQUIREMENT:
- CANNOT BE MONOCHROME! MUST BE RICH MULTI-COLOR RGB PIXEL ART!
- Define a color palette of at least 4 to 8 distinct, vibrant HEX colors (#RRGGBB) specifically matching the prompt theme.
- Map each color to a unique single-character key (e.g. 'R' for #FF1A26, 'Y' for #FFD700, 'O' for #FF7700, 'G' for #00FF66, 'C' for #00E5FF, 'W' for #FFFFFF, 'B' for #8B4513, 'P' for #E040FB).
- '.' MUST ALWAYS represent unlit/background black (#000000).
- In each frame, use the palette characters to draw vibrant figures, highlights, shadows, and animated details across all 8 rows and 32 columns.
- Each frame MUST have EXACTLY 8 strings of EXACTLY 32 characters.
- Recommended FPS between 4 and 10.`;
    const candidateModels = ["gemini-2.5-flash", "gemini-3.1-flash-lite", "gemini-3.8-flash"];
    let lastError = null;
    let successfulModel = "";
    let parsed = null;
    for (const modelName of candidateModels) {
      try {
        console.log(`[Gemini] Attempting multi-color generation with model ${modelName} for: "${prompt}"...`);
        const response = await ai.models.generateContent({
          model: modelName,
          contents: `Design a vivid MULTI-COLOR (not monochrome!) 8x32 pixel animation with ${numFrames} sequential looping frames for: "${prompt}"`,
          config: {
            systemInstruction,
            temperature: 0.7,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: {
                  type: Type.STRING,
                  description: "Vivid title of the multi-color animation in Chinese or English"
                },
                recommendedFps: {
                  type: Type.INTEGER,
                  description: "Recommended playback FPS (between 4 and 10)"
                },
                palette: {
                  type: Type.ARRAY,
                  description: "Palette mapping single character keys to RGB hex colors. MUST contain 3 to 8 distinct colors.",
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      key: { type: Type.STRING, description: "Single character key, e.g. R, Y, G, O, W, B" },
                      color: { type: Type.STRING, description: "Hex color string e.g. #FF1A26" }
                    },
                    required: ["key", "color"]
                  }
                },
                frames: {
                  type: Type.ARRAY,
                  description: `Array of ${numFrames} frames. Each frame has 8 strings of 32 characters.`,
                  items: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.STRING
                    }
                  }
                }
              },
              required: ["title", "recommendedFps", "palette", "frames"]
            }
          }
        });
        const textOutput = response.text;
        if (textOutput) {
          parsed = JSON.parse(textOutput);
          successfulModel = modelName;
          console.log(`[Gemini] Multi-color generation succeeded with model ${modelName} in ${Date.now() - startTime}ms`);
          break;
        }
      } catch (err) {
        console.warn(`[Gemini] Model ${modelName} failed or unavailable:`, err.message || err);
        lastError = err;
      }
    }
    if (!parsed || !parsed.frames || parsed.frames.length === 0) {
      throw lastError || new Error("All Gemini models failed to generate response");
    }
    const paletteMap = { ".": "#000000" };
    if (Array.isArray(parsed.palette)) {
      for (const item of parsed.palette) {
        if (item.key && item.color) {
          paletteMap[item.key] = item.color.startsWith("#") ? item.color : `#${item.color}`;
        }
      }
    } else if (parsed.palette && typeof parsed.palette === "object") {
      Object.assign(paletteMap, parsed.palette);
    }
    if (Object.keys(paletteMap).length <= 2) {
      paletteMap["#"] = "#E60012";
      paletteMap["R"] = "#FF1A26";
      paletteMap["Y"] = "#FFD700";
      paletteMap["O"] = "#FF7700";
      paletteMap["G"] = "#00FF66";
      paletteMap["C"] = "#00E5FF";
      paletteMap["W"] = "#FFFFFF";
    }
    const sanitizedFrames = [];
    const colorFrames = [];
    for (const frame of parsed.frames) {
      const rows = [];
      const colorRows = [];
      for (let r = 0; r < 8; r++) {
        let rowStr = frame && frame[r] ? String(frame[r]) : ".".repeat(32);
        if (rowStr.length < 32) {
          rowStr = rowStr.padEnd(32, ".");
        } else if (rowStr.length > 32) {
          rowStr = rowStr.substring(0, 32);
        }
        rows.push(rowStr);
        const colorCells = [];
        for (let c = 0; c < 32; c++) {
          const char = rowStr[c];
          const hex = char === "." || !paletteMap[char] ? "" : paletteMap[char];
          colorCells.push(hex);
        }
        colorRows.push(colorCells);
      }
      sanitizedFrames.push(rows);
      colorFrames.push(colorRows);
    }
    return res.json({
      title: parsed.title || prompt,
      recommendedFps: parsed.recommendedFps || 6,
      palette: paletteMap,
      frames: sanitizedFrames,
      colorFrames,
      isRealAI: true,
      model: successfulModel,
      latencyMs: Date.now() - startTime
    });
  } catch (err) {
    console.error("Error in /api/generate-pixel-animation:", err);
    const fallback = generateFallbackAnimation(req.body?.prompt || "pixel animation", 6);
    return res.json({
      ...fallback,
      isRealAI: false,
      model: "fallback-cache",
      error: err.message,
      latencyMs: Date.now() - startTime
    });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: "0.0.0.0",
        allowedHosts: true,
        cors: true
      },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path2.resolve(__dirname, "dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path2.resolve(__dirname, "dist", "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on port ${PORT} (dev server on http://0.0.0.0:${PORT})`);
  });
}
startServer();
