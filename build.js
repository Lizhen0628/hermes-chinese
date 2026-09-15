#!/usr/bin/env node
/**
 * 构建脚本：组装 dist/ 部署目录
 *
 *   dist/
 *   ├── index.html + css/ js/ font/ assets/   ← 中文落地页（landing/）
 *   └── docs/                                  ← Docusaurus zh-Hans 构建产物（website/）
 *
 * 用法：node build.js [--skip-docs]
 *   --skip-docs  跳过 Docusaurus 构建，直接复用 website/build（调试落地页用）
 */
import { execSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const dist = resolve(root, "dist");
const website = resolve(root, "website");
const websiteBuild = join(website, "build");
const landing = resolve(root, "landing");

const skipDocs = process.argv.includes("--skip-docs");

function log(msg) {
  console.log(`[build] ${msg}`);
}

function dirSizeMB(p) {
  const walk = (d) => {
    let total = 0;
    for (const name of readdirSync(d)) {
      const fp = join(d, name);
      const st = statSync(fp);
      total += st.isDirectory() ? walk(fp) : st.size;
    }
    return total;
  };
  return (walk(p) / 1024 / 1024).toFixed(1);
}

// 1. Docusaurus 文档构建（仅 zh-Hans locale）
if (!skipDocs) {
  log("构建 Docusaurus 文档（--locale zh-Hans）……");
  execSync("npx docusaurus build --locale zh-Hans", {
    cwd: website,
    stdio: "inherit",
  });
} else {
  log("跳过 Docusaurus 构建（--skip-docs）");
}
if (!existsSync(websiteBuild)) {
  console.error("[build] website/build 不存在，Docusaurus 构建失败？");
  process.exit(1);
}

// 2. 组装 dist/
log("组装 dist/ ……");
rmSync(dist, { recursive: true, force: true });
mkdirSync(join(dist, "docs"), { recursive: true });

// 落地页 → dist/
for (const entry of ["index.html", "zh.css", "css", "js", "font", "assets"]) {
  const src = join(landing, entry);
  if (!existsSync(src)) {
    console.error(`[build] 缺少落地页资源：landing/${entry}`);
    process.exit(1);
  }
  cpSync(src, join(dist, entry), { recursive: true });
}

// 文档站 → dist/docs/（Docusaurus baseUrl 为 /docs/）
cpSync(websiteBuild, join(dist, "docs"), { recursive: true });

// 文档站自带 404，同时作为整站 404（其资源引用为 /docs/ 绝对路径，任意路径下均可用）
const docs404 = join(dist, "docs", "404.html");
if (existsSync(docs404)) {
  cpSync(docs404, join(dist, "404.html"));
}

// sitemap：文档站生成的 sitemap 提升到根目录，并把落地页插入为第一条
const siteUrl = "https://chinese.hermes.tools-online.site";
const sitemapPath = join(websiteBuild, "sitemap.xml");
if (existsSync(sitemapPath)) {
  let xml = readFileSync(sitemapPath, "utf8");
  // 移除 /docs/search：robots.txt 禁止抓取该页，不应同时出现在 sitemap
  xml = xml.replace(/<url><loc>[^<]*\/docs\/search<\/loc>[^]*?<\/url>/, "");
  // 落地页作为第一条，优先级最高
  const landingEntry =
    `<url><loc>${siteUrl}/</loc>` +
    `<changefreq>weekly</changefreq><priority>1.0</priority></url>`;
  xml = xml.replace(/<urlset([^>]*)>/, `<urlset$1>${landingEntry}`);
  writeFileSync(join(dist, "sitemap.xml"), xml);
} else {
  console.error("[build] 警告：website/build/sitemap.xml 不存在，跳过 sitemap");
}

// robots.txt
writeFileSync(
  join(dist, "robots.txt"),
  `User-agent: *\nAllow: /\nDisallow: /docs/search\n\nSitemap: ${siteUrl}/sitemap.xml\n`,
);

log(`完成：dist/ 共 ${dirSizeMB(dist)} MB`);
log("本地预览：npx serve dist");
