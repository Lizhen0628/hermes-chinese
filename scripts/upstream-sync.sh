#!/usr/bin/env bash
# 每日上游同步：
#   1. 稀疏克隆 NousResearch/hermes-agent 的 website/ 覆盖本仓库 website/
#      （docusaurus.config.ts 除外 —— 其中包含本站专属修改，见 README）
#   2. 抓取官方落地页快照并重新生成中文 landing/index.html
#   3. 刷新文档站 UI 翻译（write-translations + i18n-zh.py）
#   4. 重放 Skills 页面加载器补丁（目录 gzip 化，见 patch-skills-loader.py）
#   5. DeepSeek 自动翻译缺失/变更的文档（恢复被同步覆盖的自动翻译 → 翻译存量）
# 输出：sync-report.md（供跟踪 issue 使用）、changed 输出
set -euo pipefail
cd "$(dirname "$0")/.."

UPSTREAM="https://github.com/NousResearch/hermes-agent.git"
REPORT="sync-report.md"
: > "$REPORT"

changed="no"

# ---------- 1. website/ ----------
rm -rf /tmp/upstream-hermes
git clone --filter=blob:none --sparse --depth 1 "$UPSTREAM" /tmp/upstream-hermes -q
git -C /tmp/upstream-hermes sparse-checkout set website
UP_COMMIT=$(git -C /tmp/upstream-hermes rev-parse --short HEAD)
echo "上游提交：[$UP_COMMIT](https://github.com/NousResearch/hermes-agent/commit/$UP_COMMIT)" >> "$REPORT"

# rsync 覆盖，保留本站专属的 docusaurus.config.ts
rsync -a --delete \
  --exclude '.git/' \
  --exclude 'node_modules/' \
  --exclude 'build/' \
  --exclude '.docusaurus/' \
  --exclude 'docusaurus.config.ts' \
  /tmp/upstream-hermes/website/ website/

# ---------- 2. 落地页快照 ----------
LANDING_STATUS="未变化"
if curl -sSL --fail "https://hermes-agent.nousresearch.com/" -o landing/upstream.html.new; then
  if ! cmp -s landing/upstream.html.new landing/upstream.html; then
    mv landing/upstream.html.new landing/upstream.html
    LANDING_STATUS="已更新"
    if python3 scripts/sync-landing.py; then
      LANDING_STATUS="已更新，中文翻译全部命中"
    else
      LANDING_STATUS="⚠️ 已更新，但部分文案未命中翻译表，landing/index.html 可能残留英文，需人工核对 scripts/sync-landing.py"
    fi
  else
    rm landing/upstream.html.new
  fi
else
  LANDING_STATUS="⚠️ 抓取失败，保留旧快照"
fi
echo "" >> "$REPORT"; echo "落地页：${LANDING_STATUS}" >> "$REPORT"

# ---------- 3. 文档站 UI 翻译刷新 ----------
(cd website && npx docusaurus write-translations --locale zh-Hans >/dev/null 2>&1) || true
if python3 scripts/i18n-zh.py | grep -qv "更新 0 条"; then
  I18N_STATUS="已刷新"
else
  I18N_STATUS="无变化"
fi
echo "文档站 UI 翻译：${I18N_STATUS}" >> "$REPORT"

# ---------- 4. Skills 页面加载器补丁（gzip 目录） ----------
# rsync 会用官方版本覆盖 src/pages/skills/index.tsx，补丁需在每次同步后重放
if python3 scripts/patch-skills-loader.py; then
  LOADER_STATUS="正常"
else
  LOADER_STATUS="⚠️ 补丁失败（上游可能改写了加载器），技能页面将无法加载目录，需人工更新 scripts/patch-skills-loader.py"
fi
echo "Skills 页面加载器补丁：${LOADER_STATUS}" >> "$REPORT"

# ---------- 5. DeepSeek 自动翻译 ----------
# 先恢复被 rsync --delete 删除的自动翻译（上游补了官方翻译的不会被恢复，官方 wins），
# 再翻译缺失/变更的文档（受 MAX_DOCS_PER_RUN 限制，默认 40 篇/轮）。
echo "运行 LLM 自动翻译……"
node scripts/translate-docs.mjs --max "${MAX_DOCS_PER_RUN:-40}" || TRANSLATE_FAILED=1
echo "" >> "$REPORT"
if [ -f sync/translation-report.md ]; then
  cat sync/translation-report.md >> "$REPORT"
else
  echo "LLM 翻译：⚠️ 未生成报告（脚本异常，见 Actions 日志）" >> "$REPORT"
fi

# ---------- 6. 变更清单 ----------
echo "" >> "$REPORT"; echo "## website/ 变更文件" >> "$REPORT"
CHANGES=$(git status --porcelain website/ landing/ sync/ scripts/ | head -100)
if [ -n "$CHANGES" ]; then
  changed="yes"
  {
    echo '```'
    echo "$CHANGES"
    echo '```'
  } >> "$REPORT"
else
  echo "无。" >> "$REPORT"
fi

echo "changed=$changed" >> "$GITHUB_OUTPUT"
echo "--- 同步报告 ---"; cat "$REPORT"
