#!/usr/bin/env node
/**
 * 拉取官方目录 JSON，填充技能/插件页面（website/static/api/）。
 *
 * 背景：官方站的 Skills Hub（/skills）、Plugin Catalog（/plugins）、
 * Automation Blueprints 页面在浏览器端懒加载 /docs/api/*.json。这些文件
 * 由官方 prebuild（extract-skills.py / extract-plugins.py 等）生成，依赖
 * hermes-agent 仓库根的 skills/、optional-skills/、plugin-catalog/ 目录，
 * 本仓库只 vendor 了 website/ 跑不了官方脚本，因此直接下载官方已发布的
 * 成品——与官方 prebuild 对 skills-index.json 的处理方式一致。
 *
 * skills.json 全量 10 万条明文 54.5 MB，超 Cloudflare Pages 单文件
 * 25 MiB 限额，因此存为 gzip（~10 MB）；页面加载器用 DecompressionStream
 * 解压，补丁由 scripts/patch-skills-loader.py 在上游同步后重放。
 *
 * 失败降级：下载失败优先沿用 24h 内的本地缓存；否则写空回退并告警，
 * 不阻塞构建——与官方 prebuild 的降级策略一致（.gitignore 已排除产物，
 * 每次构建重新生成）。
 */
import { mkdirSync, writeFileSync, existsSync, statSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dns from "node:dns";
import { gzipSync } from "node:zlib";

// 本地网络 IPv6 路径可能不通（ECONNRESET）；IPv4 优先对 CI 无副作用
dns.setDefaultResultOrder("ipv4first");

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "website", "static", "api");
const BASE = "https://hermes-agent.nousresearch.com/docs/api/";

const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
// 空回退桩（gzip("[]") 仅二十来字节）不算有效缓存，仍需重试下载
const MIN_VALID_BYTES = 1024;

const FILES = [
  { name: "skills-meta.json", fallback: "{}" },
  { name: "plugins.json", fallback: "[]" },
  { name: "plugins-meta.json", fallback: "{}" },
  { name: "plugin-stars.json", fallback: "{}" },
  { name: "automation-blueprints-index.json", fallback: "{}" },
  { name: "model-catalog.json", fallback: "{}" },
];

const isFresh = (p) => {
  try {
    if (statSync(p).size < MIN_VALID_BYTES) return false;
    return Date.now() - statSync(p).mtimeMs < CACHE_MAX_AGE_MS;
  } catch {
    return false;
  }
};

async function download(name) {
  const timeoutMs = name === "skills.json" ? 180_000 : 30_000;
  let lastErr;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const resp = await fetch(BASE + name, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(timeoutMs),
        redirect: "follow",
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      return Buffer.from(await resp.arrayBuffer());
    } catch (err) {
      lastErr = err;
      if (attempt < 2) await new Promise((r) => setTimeout(r, 3000));
    }
  }
  throw lastErr;
}

// docsPath 指向官方生成的技能文档页（docs/user-guide/skills/<docsPath>）。
// 官方上游可能已为新增技能生成了 docsPath，但对应文档页尚未同步进本仓库
// ——此时清空 docsPath，卡片回退展示 "View source" 外链而非 404。
function stripMissingDocsPath(skill) {
  if (!skill.docsPath) return;
  const base = join(root, "website", "docs", "user-guide", "skills", skill.docsPath);
  const exists =
    existsSync(base + ".md") || existsSync(base + ".mdx") || existsSync(join(base, "index.md"));
  if (!exists) skill.docsPath = "";
}

// 全量技能目录以 gzip 落盘（明文超 CF Pages 单文件限额；页面加载器解压）
async function fetchSkillsGz() {
  const out = join(outDir, "skills.json.gz");
  if (isFresh(out)) {
    console.log("[catalogs] skills.json.gz：24h 内已有缓存，跳过");
    return;
  }
  try {
    const buf = await download("skills.json");
    const arr = JSON.parse(buf.toString("utf8"));
    if (!Array.isArray(arr)) throw new Error("skills.json 不是数组");
    let stripped = 0;
    for (const s of arr) {
      const had = s.docsPath;
      stripMissingDocsPath(s);
      if (had && !s.docsPath) stripped++;
    }
    const json = Buffer.from(JSON.stringify(arr), "utf8");
    const gz = gzipSync(json, { level: 9 });
    writeFileSync(out, gz);
    // 旧版裁剪方案的明文产物不再部署
    if (existsSync(join(outDir, "skills.json"))) {
      rmSync(join(outDir, "skills.json"));
      console.log("[catalogs] 已移除旧版明文 skills.json（裁剪方案遗留）");
    }
    console.log(
      `[catalogs] skills.json.gz：官方 ${arr.length} 条，明文 ${(json.length / 1048576).toFixed(1)} MB` +
        ` → gzip ${(gz.length / 1048576).toFixed(1)} MB（CF Pages 限额内）` +
        (stripped ? `；${stripped} 条 docsPath 指向未同步文档页，已改为外链` : ""),
    );
  } catch (err) {
    if (existsSync(out)) {
      console.warn(`[catalogs] skills.json.gz 下载失败（${err.message}），沿用本地缓存`);
    } else {
      writeFileSync(out, gzipSync(Buffer.from("[]"), { level: 9 }));
      console.warn(
        `[catalogs] skills.json.gz 下载失败（${err.message}），写入空回退——技能页面将显示空态`,
      );
    }
  }
}

mkdirSync(outDir, { recursive: true });

await fetchSkillsGz();

let failed = 0;
for (const file of FILES) {
  const out = join(outDir, file.name);
  if (isFresh(out)) {
    console.log(`[catalogs] ${file.name}：24h 内已有缓存，跳过`);
    continue;
  }
  try {
    const buf = await download(file.name);
    writeFileSync(out, buf);
    console.log(`[catalogs] ${file.name}：${(buf.length / 1024).toFixed(1)} KB`);
  } catch (err) {
    failed++;
    if (existsSync(out)) {
      console.warn(`[catalogs] ${file.name} 下载失败（${err.message}），沿用本地缓存`);
    } else {
      writeFileSync(out, file.fallback);
      console.warn(`[catalogs] ${file.name} 下载失败（${err.message}），写入空回退——对应页面将显示空态`);
    }
  }
}

if (failed > 0) {
  console.warn(`[catalogs] ${failed} 个文件拉取失败，详见上方日志`);
}
