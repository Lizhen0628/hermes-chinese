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
 * skills.json 官方约 54 MB，超过 Cloudflare Pages 单文件 25 MiB 限额，
 * 按官方排序（built-in → optional → community）保留前缀裁剪到预算内。
 *
 * 失败降级：下载失败优先沿用 24h 内的本地缓存；否则写空目录回退并告警，
 * 不阻塞构建——与官方 prebuild 的降级策略一致（.gitignore 已排除产物，
 * 每次构建重新生成）。
 */
import { mkdirSync, writeFileSync, existsSync, statSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dns from "node:dns";

// 本地网络 IPv6 路径可能不通（ECONNRESET）；IPv4 优先对 CI 无副作用
dns.setDefaultResultOrder("ipv4first");

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "website", "static", "api");
const BASE = "https://hermes-agent.nousresearch.com/docs/api/";

// Cloudflare Pages 单文件硬限 25 MiB，留出余量取 20 MiB
const SKILLS_BUDGET = 20 * 1024 * 1024;
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

// trim: 超预算时按条目保留前缀裁剪；small: 直接原样落盘
const FILES = [
  { name: "skills.json", trim: SKILLS_BUDGET, fallback: "[]" },
  { name: "skills-meta.json", fallback: "{}" },
  { name: "plugins.json", fallback: "[]" },
  { name: "plugins-meta.json", fallback: "{}" },
  { name: "plugin-stars.json", fallback: "{}" },
  { name: "automation-blueprints-index.json", fallback: "{}" },
  { name: "model-catalog.json", fallback: "{}" },
];

const isFresh = (p) => {
  try {
    // 空回退桩（"[]"/"{}"）不算有效缓存，仍需重试下载
    if (statSync(p).size < 4) return false;
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

// 保留数组前缀使整体序列化不超过预算（官方排序 built-in → optional → community 在前）
function trimSkillsArray(buf, budget) {
  const arr = JSON.parse(buf.toString("utf8"));
  if (!Array.isArray(arr)) return null;
  for (const s of arr) stripMissingDocsPath(s);
  let used = 2; // "[]"
  let end = arr.length;
  for (let i = 0; i < arr.length; i++) {
    used += Buffer.byteLength(JSON.stringify(arr[i]), "utf8") + (i > 0 ? 1 : 0);
    if (used > budget) {
      end = i;
      break;
    }
  }
  return { json: JSON.stringify(arr.slice(0, end)), total: arr.length, kept: end };
}

mkdirSync(outDir, { recursive: true });

let failed = 0;
for (const file of FILES) {
  const out = join(outDir, file.name);
  if (isFresh(out)) {
    console.log(`[catalogs] ${file.name}：24h 内已有缓存，跳过`);
    continue;
  }
  try {
    const buf = await download(file.name);
    if (file.trim) {
      const t = trimSkillsArray(buf, file.trim);
      if (t) {
        writeFileSync(out, t.json);
        console.log(
          `[catalogs] ${file.name}：官方 ${t.total} 条（${(buf.length / 1048576).toFixed(1)} MB）` +
            `→ 保留 ${t.kept} 条（${(t.json.length / 1048576).toFixed(1)} MB，CF Pages 限额内）`,
        );
      } else {
        writeFileSync(out, buf);
        console.log(`[catalogs] ${file.name}：非数组结构，原样落盘`);
      }
    } else {
      writeFileSync(out, buf);
      console.log(`[catalogs] ${file.name}：${(buf.length / 1024).toFixed(1)} KB`);
    }
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
  const skillsMissing = !existsSync(join(outDir, "skills.json"));
  console.warn(
    `[catalogs] ${failed} 个文件拉取失败；` +
      (skillsMissing ? "技能/插件页面数据缺失！" : "已有缓存兜底，页面仍可用"),
  );
}
