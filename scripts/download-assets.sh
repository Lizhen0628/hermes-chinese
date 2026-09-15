#!/bin/bash
# 下载落地页所需的官方静态资源到 landing/ 目录（幂等：已存在则跳过）
set -e
cd "$(dirname "$0")/../landing"
ORIGIN="https://hermes-agent.nousresearch.com"
WB="https://web-assets.nousresearch.com/nousnet-web"
HA="https://hermes-assets.nousresearch.com"

fetch() { # fetch <url> <dest>
  local url="$1" dest="$2"
  if [ -s "$dest" ]; then echo "skip $(du -h "$dest" | cut -f1) $dest"; return; fi
  mkdir -p "$(dirname "$dest")"
  curl -sSL --fail "$url" -o "$dest" && echo "ok    $dest" || echo "FAIL  $url"
}

# CSS（Next.js 构建产物）
fetch "$ORIGIN/_next/static/chunks/0~..gmu634h~d.css" css/app.css
fetch "$ORIGIN/_next/static/chunks/04yc5urihmp~2.css" css/extra-1.css
fetch "$ORIGIN/_next/static/chunks/0pios051-721d.css" css/landing.css

# 字体（同源 /font/ 路径）
for f in Rules/RulesVariable.woff2 Rules/RulesGothicCnd-Light.woff2 Rules/RulesGothicCnd-Regular.woff2 \
         Rules/RulesGothicCnd-Medium.woff2 Rules/RulesGothicCmp-Regular.woff2 Rules/RulesGothicCmp-Medium.woff2 \
         Rules/RulesGothicCmp-Semibold.woff2 AeonikFonoProTRIAL/AeonikFonoProTRIAL-Regular.woff2 \
         CourierPrime/CourierPrime-Regular.woff2; do
  fetch "$ORIGIN/font/$f" "font/$(basename $f)"
done
fetch "$ORIGIN/_next/static/media/Sigurd_Variable-s.p.092~ec~icx8ri.woff2" font/Sigurd_Variable.woff2

# 图片（web-assets CDN）
for f in hero.c87b289b1aa7e809.webp cloud.b97b7160bc3045b0.svg copy.13392da62cc1f9c5.svg \
         desktop.76858853418a86e0.svg apple.a299ab092fe65f67.svg windows.dfe0c85d9355c0db.svg \
         linux.5ae20c4d9cb64aa0.svg features.9b96dc7b3f77a80c.svg globe.ff6807a629518358.svg \
         platform-art.f5a1f4d8bf7f337a.webp feature-connect.3de66c3dcd817e73.webp \
         feature-memory.f2a586f7a2ce02ce.webp feature-automation.ebc2f15d427478a2.webp \
         feature-delegate.e9bc31cd923cfa8c.webp feature-search.1ac082adce6078b7.webp \
         feature-sandbox.08ca50ee89c595b7.webp portal-art.4fc19cfb0cdaa444.svg \
         footer.888d2567d8e5d179.webp desktop-preview.b4791dcc492810da.webp \
         hermes-og-image-blue.62cadc1481af4bbe.png; do
  dest="assets/landing/$f"
  [ "$f" = "hermes-og-image-blue.62cadc1481af4bbe.png" ] && dest="assets/$f"
  fetch "$WB/img/landing/$f" "$dest"
done
fetch "$WB/assets/hermes-landing/teams/hermes-wing.6ee276e9bff5a166.svg" assets/landing/hermes-wing.svg
fetch "$WB/assets/hermes-landing/teams/nous-girl.66f8944c40c50f8c.svg" assets/landing/nous-girl.svg
fetch "$WB/assets/hermes-landing/nous-portal-badge.17acea7b147e40b5.svg" assets/landing/nous-portal-badge.svg
fetch "$WB/assets/hermes-landing/nous-girl-badge.57892048f67f4848.svg" assets/landing/nous-girl-badge.svg
fetch "$WB/assets/hermes-landing/hermes-agent-badge.fcd9ed0a6930ee56.svg" assets/landing/hermes-agent-badge.svg

# 桌面演示视频 + favicon
fetch "$HA/hermes-desktop.mp4" assets/hermes-desktop.mp4
fetch "$ORIGIN/favicon.ico" assets/favicon.ico
fetch "$ORIGIN/icon.png" assets/icon.png
echo "--- done ---"
du -sh assets font css

# CSS 内的字体路径本地化（url(/font/...) 与 url(../media/...) → 相对 landing/css/ 的路径）
sed -i '' 's|url(/font/|url(../font/|g' css/*.css 2>/dev/null || sed -i 's|url(/font/|url(../font/|g' css/*.css
sed -i '' 's|url(../media/Sigurd[^)]*)|url(../font/Sigurd_Variable.woff2)|g' css/*.css 2>/dev/null || sed -i 's|url(../media/Sigurd[^)]*)|url(../font/Sigurd_Variable.woff2)|g' css/*.css
