#!/usr/bin/env bash
# 每日上游同步：
#   1. 稀疏克隆 NousResearch/hermes-agent 的 website/ 覆盖本仓库 website/
#      （docusaurus.config.ts 除外 —— 其中包含本站专属修改，见 README）
#   2. 抓取官方落地页快照并重新生成中文 landing/index.html
#   3. 刷新文档站 UI 翻译（write-translations + i18n-zh.py）
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
I18N_STATUS="无变化"
(cd website && npx docusaurus write-translations --locale zh-Hans >/dev/null 2>&1) || true
if python3 scripts/i18n-zh.py | grep -qv "更新 0 条"; then
  I18N_STATUS="已刷新"
fi
echo "文档站 UI 翻译：${I18N_STATUS}" >> "$REPORT"

# ---------- 4. 变更清单 ----------
echo "" >> "$REPORT"; echo "## website/ 变更文件" >> "$REPORT"
CHANGES=$(git status --porcelain website/ landing/ | head -100)
if [ -n "$CHANGES" ]; then
  changed="yes"
  {
    echo '```'
    echo "$CHANGES"
    echo '```'
    echo ""
    echo "未翻译文档（新增英文页将回退英文显示）："
    COMM_NEW=$(comm -13 <(cd website/docs && find . -name '*.md' -o -name '*.mdx' | sort) \
                       <(cd website/i18n/zh-Hans/docusaurus-plugin-content-docs/current && find . -name '*.md' -o -name '*.mdx' | sort) | head -30 || true)
    echo '```'; echo "${COMM_NEW:-（无）}"; echo '```'
  } >> "$REPORT"
else
  echo "无。" >> "$REPORT"
fi

echo "changed=$changed" >> "$GITHUB_OUTPUT"
echo "--- 同步报告 ---"; cat "$REPORT"
