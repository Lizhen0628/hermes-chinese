#!/usr/bin/env python3
"""Skills 页面加载器补丁：目录数据源切换为 gzip 全量文件。

官方 skills.json 明文 54.5 MB 超 Cloudflare Pages 单文件 25 MiB 限额，
本站部署全量 gzip（scripts/fetch-catalogs.mjs 生成 skills.json.gz），
页面加载器需随之用 DecompressionStream 解压。上游同步（rsync）会用官方
版本覆盖 website/src/pages/skills/index.tsx，因此补丁须在每次同步后重放
（upstream-sync.sh 调用）。

幂等：检测到 skills.json.gz 标记即跳过。上游若改写加载器代码导致精确
匹配失败，以非零码退出并在同步报告中告警，需人工更新匹配串。
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "website" / "src" / "pages" / "skills" / "index.tsx"

OLD_URL = 'const SKILLS_URL = "/docs/api/skills.json";'
NEW_URL = 'const SKILLS_URL = "/docs/api/skills.json.gz";'

OLD_FETCH = '''          fetch(SKILLS_URL).then((r) => {
            if (!r.ok) throw new Error(`skills.json HTTP ${r.status}`);
            return r.json();
          }),'''
NEW_FETCH = '''          fetch(SKILLS_URL).then((r) => {
            if (!r.ok) throw new Error(`skills.json.gz HTTP ${r.status}`);
            // 目录以 gzip 存储：官方全量 10 万条明文 54.5 MB 超 CF Pages
            // 单文件 25 MiB 限额，压缩后 ~10 MB（scripts/fetch-catalogs.mjs 生成）。
            let body = r.body;
            if (body) {
              body = body.pipeThrough(new DecompressionStream("gzip"));
            }
            return new Response(body).text().then((t) => JSON.parse(t));
          }),'''


def main() -> int:
    text = TARGET.read_text(encoding="utf-8")
    if "skills.json.gz" in text:
        print("[patch-skills-loader] 已打过补丁，跳过")
        return 0
    for label, old in (("SKILLS_URL 常量", OLD_URL), ("目录加载器", OLD_FETCH)):
        n = text.count(old)
        if n != 1:
            print(
                f"[patch-skills-loader] ⚠️ {label} 精确匹配失败（count={n}），"
                f"上游可能已改写 src/pages/skills/index.tsx，需人工更新本脚本匹配串"
            )
            return 1
    text = text.replace(OLD_URL, NEW_URL).replace(OLD_FETCH, NEW_FETCH)
    TARGET.write_text(text, encoding="utf-8")
    print("[patch-skills-loader] 已切换为 gzip 目录加载（skills.json.gz + DecompressionStream）")
    return 0


if __name__ == "__main__":
    sys.exit(main())
