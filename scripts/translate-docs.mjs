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

async function translateOne(relPath, source) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const retryNote =
        attempt === 2
          ? "上一次输出未通过校验（可能是代码围栏不守恒或被截断）。请完整翻译整篇文档，输出必须包含与原文相同数量的 ``` 代码围栏，不得省略任何章节。"
          : "";
      const raw = await callDeepSeek(source, retryNote);
      const out = postProcess(raw, source);
      const errors = validate(out, source);
      if (errors.length === 0) return out;
      console.log(`    校验未通过（第 ${attempt} 次）：${errors.join("；")}`);
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
  report.restored = restore(state);

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
