#!/usr/bin/env node
/**
 * LLM 自动翻译：把 website/docs 中缺少中文翻译的文档，用 DeepSeek 翻译为简体中文，
 * 写入 website/i18n/zh-Hans/docusaurus-plugin-content-docs/current/ 镜像路径。
 *
 * 与 pi-dev-chinese 相同的思路：
 *   - 官方已有翻译的文档永远不碰（上游 wins）；
 *   - 仅处理「无中文文件」或「英文源已变化且此前由本脚本翻译过」的文档；
 *   - 以 sha256 记录已翻译版本于 sync/translations-state.json，上游同步删除的
 *     自动翻译文件可用 --restore 从 git HEAD 恢复（官方新增翻译时不恢复，官方 wins）；
 *   - 译文做代码围栏守恒 / 长度比例 / frontmatter 健全性校验，失败重试一次，
 *     仍失败则跳过并在报告中标记人工处理。
 *
 * 用法：
 *   node scripts/translate-docs.mjs                 # 翻译待处理文档（受 --max 限制）
 *   node scripts/translate-docs.mjs --restore       # 从 git HEAD 恢复被上游同步覆盖前删除的自动翻译
 *   node scripts/translate-docs.mjs --max 10        # 限制本次最多翻译篇数
 *   node scripts/translate-docs.mjs --dry-run       # 只列出待翻译清单，不调用 API
 *
 * 环境变量：DEEPSEEK_API_KEY（必需）、MAX_DOCS_PER_RUN（可选默认上限）
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  rmdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DOCS_DIR = join(root, "website", "docs");
const ZH_DIR = join(
  root,
  "website",
  "i18n",
  "zh-Hans",
  "docusaurus-plugin-content-docs",
  "current",
);
const STATE_FILE = join(root, "sync", "translations-state.json");
const SITE_URL = "https://chinese.hermes.tools-online.site";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const restoreOnly = args.includes("--restore");
const maxIdx = args.indexOf("--max");
const maxDocs =
  (maxIdx >= 0 ? Number(args[maxIdx + 1]) : 0) ||
  Number(process.env.MAX_DOCS_PER_RUN) ||
  40;

const API_KEY = process.env.DEEPSEEK_API_KEY || "";
const API_URL = "https://api.deepseek.com/chat/completions";
const MODEL = "deepseek-chat";
// 单次调用输出上限 8K token；超过该长度的英文源按标题分块翻译，避免截断
const CHUNK_THRESHOLD = 12000;
const CHUNK_MAX_LEN = 8000;

// 用户侧文档优先于开发者内部文档
const CATEGORY_ORDER = [
  "",
  "getting-started",
  "user-guide",
  "guides",
  "integrations",
  "reference",
  "developer-guide",
];

const SYSTEM_PROMPT = [
  "你是 Hermes Agent（Nous Research 开源 AI 智能体）技术文档的资深翻译。",
  "把用户给出的英文 Markdown 文档整体翻译为简体中文，要求：",
  "1. 只输出译文 Markdown 本身，不要任何解释、前后缀或代码围栏包裹。",
  "2. YAML frontmatter：保留全部键与格式，仅翻译 title、description、keywords 等自然语言值；slug、id 等标识符值保持原样。",
  "3. 代码块（``` 围栏与行内代码）内容保持原样，只可翻译其中的自然语言注释。",
  "4. Markdown 语法、HTML 标签、链接 URL、锚点保持原样；链接文字可翻译。",
  "5. 产品名与专有名词保留英文：Hermes、Hermes Agent、Hermes Desktop、Nous、Nous Research、Nous Portal、MCP、ACP、Skills、Telegram、Discord、Slack、WhatsApp、Signal、Docker、SSH 等。",
  "6. 术语一致：agent=智能体，skill=技能，memory=记忆，subagent=子智能体，gateway=网关，cron=定时任务，sandbox=沙箱，provider=服务商，profile=配置档，session=会话，context=上下文，plugin=插件。",
  "7. 数字、命令、版本号、路径保持原样。",
].join("\n");

function sha256(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function walkMd(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const fp = join(dir, name);
    if (statSync(fp).isDirectory()) {
      out.push(...walkMd(fp));
    } else if (/\.(md|mdx)$/.test(name)) {
      out.push(fp);
    }
  }
  return out;
}

function categoryRank(relPath) {
  const top = relPath.includes("/")
    ? relPath.split("/")[0]
    : "";
  const idx = CATEGORY_ORDER.indexOf(top);
  return (idx === -1 ? CATEGORY_ORDER.length : idx);
}

function loadState() {
  if (existsSync(STATE_FILE)) {
    return JSON.parse(readFileSync(STATE_FILE, "utf8"));
  }
  return {};
}

function saveState(state) {
  mkdirSync(dirname(STATE_FILE), { recursive: true });
  writeFileSync(
    STATE_FILE,
    JSON.stringify(state, null, 2) + "\n",
    "utf8",
  );
}

function gitFileExists(path) {
  try {
    execFileSync("git", ["cat-file", "-e", `HEAD:${path}`], {
      cwd: root,
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

// 按标题把长文档切成 ≤ CHUNK_MAX_LEN 的块；只在代码围栏外切分，超长围栏块内部兜底切分
function splitIntoChunks(source, maxLen = CHUNK_MAX_LEN) {
  const lines = source.split("\n");
  const blocks = [];
  let cur = [];
  let inFence = false;
  const flush = () => {
    if (cur.length) {
      blocks.push(cur.join("\n"));
      cur = [];
    }
  };
  for (const line of lines) {
    if (/^[ \t]*```/.test(line)) inFence = !inFence;
    const atHeading = !inFence && /^#{1,6} /.test(line);
    if (atHeading && cur.join("\n").length >= maxLen * 0.5) {
      flush();
    }
    cur.push(line);
    // 兜底：单个块本身超长（巨型代码块等），在围栏外的任意行边界硬切
    if (!inFence && cur.join("\n").length >= maxLen * 2) {
      flush();
    }
  }
  flush();
  // 贪心合并相邻小块
  const chunks = [];
  for (const block of blocks) {
    const last = chunks[chunks.length - 1];
    if (last && last.length + block.length + 1 <= maxLen) {
      chunks[chunks.length - 1] = last + "\n" + block;
    } else {
      chunks.push(block);
    }
  }
  return chunks;
}

async function callDeepSeek(source, retryNote = "") {
  const userContent = retryNote
    ? `${retryNote}\n\n<document>\n${source}\n</document>`
    : `<document>\n${source}\n</document>`;
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      temperature: 1.3,
      max_tokens: 8192,
      stream: false,
    }),
  });
  if (!res.ok) {
    throw new Error(`DeepSeek API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = await res.json();
  return (data.choices?.[0]?.message?.content || "").trim();
}

// 用 Docusaurus 同款 MDX 编译器做语法校验（去掉 frontmatter 后编译）。
// LLM 译文常在正文里出现裸 < 或 { 破坏 MDX，必须在写入前拦住。
let mdxCompile = null;
async function mdxCompiles(text) {
  try {
    if (mdxCompile === null) {
      const { createRequire } = await import("node:module");
      const require = createRequire(join(root, "website", "package.json"));
      mdxCompile = require("@mdx-js/mdx").compile;
    }
    const withoutFrontmatter = text.replace(/^---\n.*?\n---\n/s, "");
    await mdxCompile(withoutFrontmatter, { outputFormat: "function-body" });
    return null;
  } catch (e) {
    return String(e.message || e).slice(0, 300);
  }
}

function postProcess(text, source) {
  let out = text.trim();
  // 剥离模型偶尔加上的整体围栏
  if (/^```(markdown|md)\s*\n/i.test(out) && out.endsWith("```")) {
    out = out.replace(/^```(markdown|md)\s*\n/i, "").replace(/```$/, "").trim();
  }
  // 剥离客套前缀（如「以下是翻译」）
  if (
    !/^---/.test(out) &&
    /^---/.test(source.trimStart()) &&
    /^(以下是|下面是|好的|当然)/.test(out)
  ) {
    out = out.replace(/^.*\n/, "").trim();
  }
  return out + "\n";
}

function validate(out, source) {
  const errors = [];
  const fences = (t) => (t.match(/^[ \t]*```/gm) || []).length;
  if (fences(out) !== fences(source)) {
    errors.push(`代码围栏数不一致 (${fences(source)} → ${fences(out)})，疑似截断`);
  }
  const ratio = out.length / Math.max(source.length, 1);
  if (ratio < 0.2 || ratio > 1.4) {
    errors.push(`长度比例异常 ${(ratio * 100).toFixed(0)}%`);
  }
  if (/^---/.test(source.trimStart()) && !/^---\s*\n/.test(out)) {
    errors.push("frontmatter 丢失");
  }
  if (/DeepSeek|作为一个AI|as an AI/i.test(out.slice(0, 200))) {
    errors.push("包含模型自述文字");
  }
  return errors;
}

// 分块翻译长文档：逐块调用，拼接后整体校验
async function translateChunked(source, relPath) {
  const chunks = splitIntoChunks(source);
  console.log(`    分块翻译：${chunks.length} 块`);
  const outParts = [];
  for (let i = 0; i < chunks.length; i++) {
    const header = `（这是长文档《${relPath}》的第 ${i + 1}/${chunks.length} 部分，直接输出该部分的中文译文，不要输出其他部分或任何说明。）\n\n<document>\n${chunks[i]}\n</document>`;
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: header },
        ],
        temperature: 1.3,
        max_tokens: 8192,
        stream: false,
      }),
    });
    if (!res.ok) {
      throw new Error(
        `DeepSeek API ${res.status}: ${(await res.text()).slice(0, 200)}`,
      );
    }
    const data = await res.json();
    outParts.push((data.choices?.[0]?.message?.content || "").trim());
  }
  return outParts.join("\n\n");
}

// frontmatter 安全重建：以源文件 frontmatter 为骨架（保证 YAML 合法、键序不变），
// 仅把 title / description / sidebar_label 的译文值用双引号安全包裹后填回。
// LLM 在中文标题里输出裸 ": " 是 YAML 解析爆炸的重灾区，这里从根上杜绝。
const FRONTMATTER_TEXT_KEYS = ["title", "description", "sidebar_label"];

function sanitizeFrontmatter(out, source, relPath) {
  const fmRe = /^---\n([\s\S]*?\n)---\n/;
  const sm = source.match(fmRe);
  const om = out.match(fmRe);
  if (!sm) return out; // 源无 frontmatter → 译文不需要
  if (!om) {
    console.log(`    ${relPath}: 译文丢失 frontmatter`);
    return null;
  }
  const getTranslatedVal = (fm, key) => {
    const re = new RegExp(`^${key}:[ \\t]*(["']?)([\\s\\S]*?)\\1[ \\t]*$`, "m");
    const m = fm.match(re);
    return m ? m[2].trim() : null;
  };
  const lines = sm[1].split("\n").map((line) => {
    const key = line.match(/^([A-Za-z_-]+):/)?.[1];
    if (key && FRONTMATTER_TEXT_KEYS.includes(key)) {
      const val = getTranslatedVal(om[1], key);
      if (val) {
        return `${key}: "${val.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
      }
      return line; // 译文没有给出该键的译文 → 保留源值（英文）
    }
    return line; // 其余键与多行结构一律以源为准
  });
  return `---\n${lines.join("\n")}---\n` + out.slice(om[0].length);
}

async function translateOne(relPath, source) {
  const needsChunking = source.length > CHUNK_THRESHOLD;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const useChunked = needsChunking || attempt >= 3;
      let raw;
      if (useChunked) {
        console.log(`    使用分块模式（第 ${attempt} 次）`);
        raw = await translateChunked(source, relPath);
      } else {
        let retryNote = "";
        if (attempt === 2) {
          retryNote =
            "上一次输出未通过校验（可能是代码围栏不守恒或被截断）。请完整翻译整篇文档，输出必须包含与原文相同数量的 ``` 代码围栏，不得省略任何章节。";
        }
        raw = await callDeepSeek(source, retryNote);
      }
      const out0 = postProcess(raw, source);
      const out = sanitizeFrontmatter(out0, source, relPath);
      if (out === null) {
        console.log(`    校验未通过（第 ${attempt} 次）：frontmatter 丢失`);
        continue;
      }
      let errors = validate(out, source);
      if (errors.length === 0) {
        const mdxError = await mdxCompiles(out);
        if (mdxError) errors = [`MDX 编译失败: ${mdxError}`];
      }
      if (errors.length === 0) return out;
      console.log(`    校验未通过（第 ${attempt} 次）：${errors.join("；")}`);
      if (needsChunking && attempt >= 2) {
        // 大文档分块成本高，重试一次仍失败则放弃本轮，下轮再试
        console.log(`    大文档多次未过，本轮放弃（下轮自动重试）`);
        return null;
      }
    } catch (e) {
      console.log(`    API 调用失败（第 ${attempt} 次）：${e.message}`);
    }
  }
  return null;
}

// ---------------------------------------------------------------- restore
function restore(state) {
  let restored = 0;
  for (const [relPath, meta] of Object.entries(state)) {
    if (meta.status !== "llm") continue;
    const zhPath = join(ZH_DIR, relPath);
    const srcPath = join(DOCS_DIR, relPath);
    const zhInGit = gitFileExists(join(ZH_DIR, relPath).slice(root.length + 1));
    // 英文源仍在、中文翻译被上游同步删掉、且 git 里有历史版本 → 恢复
    if (existsSync(srcPath) && !existsSync(zhPath) && zhInGit) {
      mkdirSync(dirname(zhPath), { recursive: true });
      execFileSync("git", ["checkout", "HEAD", "--", zhPath.slice(root.length + 1)], {
        cwd: root,
      });
      restored++;
    }
  }
  console.log(`[restore] 从 git HEAD 恢复自动翻译 ${restored} 篇`);
  return restored;
}

// ---------------------------------------------------------------- main
async function main() {
  if (!existsSync(DOCS_DIR)) {
    console.error("website/docs 不存在");
    process.exit(1);
  }
  const state = loadState();

  // 必须先恢复再计算 pending：上游 rsync 会删除本仓库的自动翻译文件，
  // 不先恢复会把已翻译文档误判为待翻译（浪费配额且拖慢覆盖速度）。
  restore(state);

  if (restoreOnly) {
    restore(state);
    return;
  }

  // 清理孤儿翻译（英文源已删除且由本脚本产生的）
  let pruned = 0;
  for (const [relPath, meta] of Object.entries(state)) {
    if (meta.status !== "llm") continue;
    if (!existsSync(join(DOCS_DIR, relPath))) {
      const zhPath = join(ZH_DIR, relPath);
      if (existsSync(zhPath)) {
        rmSync(zhPath);
        const parentDir = dirname(zhPath);
        if (parentDir !== ZH_DIR) {
          try {
            rmdirSync(parentDir); // 仅当目录为空时生效
          } catch {}
        }
      }
      delete state[relPath];
      pruned++;
    }
  }
  if (pruned) console.log(`[prune] 清理孤儿翻译 ${pruned} 篇`);

  // 找出待翻译清单
  const pending = [];
  for (const fp of walkMd(DOCS_DIR)) {
    const relPath = fp.slice(DOCS_DIR.length + 1);
    const zhPath = join(ZH_DIR, relPath);
    if (existsSync(zhPath)) continue; // 官方（或已有）翻译 → 不碰
    const src = readFileSync(fp, "utf8");
    pending.push({
      relPath,
      src,
      hash: sha256(src),
      size: src.length,
    });
  }
  pending.sort(
    (a, b) =>
      categoryRank(a.relPath) - categoryRank(b.relPath) ||
      a.relPath.localeCompare(b.relPath),
  );

  console.log(`待翻译文档共 ${pending.length} 篇`);
  if (dryRun) {
    pending.slice(0, 100).forEach((p) =>
      console.log(`  - ${p.relPath} (${(p.size / 1024).toFixed(1)} KB)`),
    );
    return;
  }

  if (!API_KEY) {
    console.error("未设置 DEEPSEEK_API_KEY");
    process.exit(1);
  }

  const batch = pending.slice(0, maxDocs);
  const report = { translated: [], failed: [], restored: 0 };

  for (const item of batch) {
    const kb = (item.size / 1024).toFixed(1);
    console.log(`翻译 ${item.relPath} (${kb} KB) ……`);
    const out = await translateOne(item.relPath, item.src);
    if (out === null) {
      console.log(`  ⚠️ 失败，跳过（保留英文回退）`);
      report.failed.push(item.relPath);
      continue;
    }
    const zhPath = join(ZH_DIR, item.relPath);
    mkdirSync(dirname(zhPath), { recursive: true });
    writeFileSync(zhPath, out, "utf8");
    state[item.relPath] = {
      sha256: item.hash,
      updated: new Date().toISOString(),
      status: "llm",
      model: MODEL,
    };
    saveState(state);
    console.log(`  🤖 完成`);
    report.translated.push(item.relPath);
  }

  saveState(state);

  // 输出报告（供 workflow 写入跟踪 issue）
  const lines = [];
  lines.push(`## 本轮 LLM 自动翻译（DeepSeek）`);
  lines.push("");
  lines.push(`- 待翻译存量：${pending.length} 篇；本轮处理：${batch.length} 篇`);
  lines.push(`- 🤖 翻译成功：${report.translated.length} 篇（含恢复 ${report.restored} 篇）`);
  lines.push(`- ⚠️ 失败待人工：${report.failed.length} 篇`);
  if (report.translated.length) {
    lines.push("");
    lines.push("<details><summary>成功清单</summary>");
    lines.push("");
    lines.push("```");
    report.translated.forEach((p) => lines.push(p));
    lines.push("```");
    lines.push("</details>");
  }
  if (report.failed.length) {
    lines.push("");
    lines.push("**失败清单（下轮自动重试，持续失败需人工翻译）**：");
    lines.push("");
    lines.push("```");
    report.failed.forEach((p) => lines.push(p));
    lines.push("```");
  }
  lines.push("");
  lines.push(`剩余未翻译文档以英文回退显示，列表见 ${SITE_URL}/docs/ 各分类。`);
  writeFileSync(join(root, "sync", "translation-report.md"), lines.join("\n") + "\n");
  console.log(`\n完成：成功 ${report.translated.length}，失败 ${report.failed.length}，剩余 ${pending.length - batch.length}`);
}

main();
