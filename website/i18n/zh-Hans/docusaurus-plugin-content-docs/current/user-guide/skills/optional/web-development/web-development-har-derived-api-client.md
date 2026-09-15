---
title: "HAR 派生 API 客户端 — 将网站的 XHR 录制为 HAR，并派生出 HTTP 客户端"
sidebar_label: "HAR 派生 API 客户端"
description: "将网站的 XHR 录制为 HAR，并派生出 HTTP 客户端"
---

{/* 本页由 website/scripts/generate-skill-docs.py 从该技能的 SKILL.md 自动生成。请编辑源 SKILL.md，而非此页。 */}

# HAR 派生 API 客户端

将网站的 XHR 录制为 HAR，并派生出 HTTP 客户端。

## 技能元数据

| | |
|---|---|
| 来源 | 可选 — 通过 `hermes skills install official/web-development/har-derived-api-client` 安装 |
| 路径 | `optional-skills/web-development\har-derived-api-client` |
| 版本 | `0.1.0` |
| 作者 | Hermes Agent |
| 许可证 | MIT |
| 平台 | linux、macos、windows |
| 标签 | `Browser`, `HAR`, `API`, `Reverse-Engineering`, `Playwright` |

## 参考：完整 SKILL.md

:::info
以下为 Hermes 在该技能被触发时加载的完整技能定义。这是技能激活时智能体看到的指令。
:::

# HAR 派生 API 客户端

用真实浏览器驱动一次网站，同时将其网络流量录制为 HAR 文件，然后将该 HAR 提炼为网站的私有 JSON API，从而可以直接用普通 HTTP 调用——相比对每次请求都进行浏览器操控，这种方式更便宜、更快速。致谢：此技巧由 Jared Longster 发明，经 Dax（thdxr）推广。它只做捕获与重放；它不会绕过身份验证、破解 CAPTCHA 或规避机器人检测——如果网站需要已登录的会话，你会沿用其 headers/cookies 往下传递，而不会伪造它们。

这些脚本基于标准库加 Playwright：捕获步骤需要 Playwright，派生步骤使用纯标准库，重放步骤只需要 `requests`/`httpx`（或 `curl`）。

涵盖 **每一条 Hermes 浏览器通路**：默认的本地 `browser_navigate` 后端，以及云端/远程后端（Browserbase、Browser-Use、Firecrawl）和任何 `/browser connect` CDP 端点。有两个捕获脚本——一个用于你启动的浏览器，另一个用于你通过 CDP 接入的浏览器——因为 HAR 录制在两种情况下工作方式不同（参见如何运行）。

## 何时使用

- "构建一个用于 &lt;website>" 的 CLI/客户端"——派生其 API，而非脚本化地模拟点击。
- "此网站没有公开 API，但页面明显会拉取 JSON。"
- 你即将对同一查询反复循环 `browser_navigate`——停下来，先派生一次端点。
- 逆向工程自动补全、搜索、信息流或结账的 XHR。
- 你在云端后端（Browserbase / Browser-Use / Firecrawl）上或通过 `/browser connect` 捕获了会话，想在不再重新租用浏览器的情况下拿到 API。

## 前提条件

- Playwright 加一个浏览器二进制（仅捕获步骤）：
  - `pip install playwright` 然后 `playwright install chromium`
  - （如果系统 Playwright 的浏览器已在 `~/.cache/ms-playwright` 下，可直接复用。）
- 重放步骤需要 `requests` 或 `httpx`（标准库 `urllib` 也可用）。
- 无需 API 密钥。客户端所需的任何密钥/令牌就是 HAR 捕获到的那些。
- 对于 CDP 路径（`har_capture_cdp.py`）：需要一个可达的 CDP 端点。在 Hermes 上，
  运行 `/browser connect` 打印当前端点，或读取配置中的 `BROWSER_CDP_URL`
  / `browser.cdp_url`。云端后端会将其暴露为 `cdpUrl`/`connectUrl`。

## 如何运行

脚本位于本技能的 `scripts/` 下，通过 `terminal` 工具调用。
**根据通路选择捕获器**——这是最容易出错的部分：

| 浏览器通路 | Hermes 如何访问它 | 捕获器 |
|---|---|---|
| 本地 `browser_navigate`（默认，agent-browser/Playwright） | 本地启动 | `har_capture.py` |
| Camofox（设置了 `CAMOFOX_URL`） | 本地 REST/CDP | 如果它暴露 CDP 就用 `har_capture_cdp.py`，否则自行驱动 |
| Browserbase / Browser-Use / Firecrawl（云端） | **CDP**（`cdpUrl`） | `har_capture_cdp.py` |
| `/browser connect <url>` / `BROWSER_CDP_URL` | **CDP** | `har_capture_cdp.py` |

经验法则：**如果浏览器是 Hermes *启动*的，就用 `har_capture.py`；如果是通过 CDP *连接*起来的，就用 `har_capture_cdp.py`。** `har_capture.py` 使用 Playwright 的 `record_har_path`，它只在本地拥有的上下文上有效。`har_capture_cdp.py` 通过 `connect_over_cdp()` 接入，并通过 `page.on("request"/"response")` 事件组装出 HAR，因为在已连接的浏览器上无法使用 `record_har_path`。

之后，对于任一通路：

- `har_to_client.py`——将 HAR 过滤为 XHR/fetch/JSON，按端点分组，并打印参数、headers、body 和重放提示（User-Agent / cookie / auth）。

相对于本技能所在目录解析路径。规范循环：

```bash
# 1a. 捕获，本地浏览器（Hermes 启动了它）
python3 scripts/har_capture.py "https://SITE/" out.har \
  --action "fill:input[name=search]:my query" --action "sleep:3" --wait 2

# 1b. 捕获，CDP 浏览器（云端后端或 /browser connect）
#     从 /browser connect 或 BROWSER_CDP_URL 获取端点
python3 scripts/har_capture_cdp.py "ws://HOST/devtools/browser/..." out.har \
  --goto "https://SITE/" --action "fill:input[name=search]:my query" \
  --action "sleep:3" --wait 2

# 2. 派生 — 从 HAR 中读取端点
python3 scripts/har_to_client.py out.har --host SITE --max-body 400

# 3. 重放 — 根据打印出的端点编写一个小型客户端（参见流程）
```

## 快速参考

```
har_capture.py <url> <out.har> [--wait S] [--headed] [--action SPEC ...]
  action SPEC:  fill:SELECTOR:TEXT | press:SELECTOR:KEY | click:SELECTOR
                goto:URL | sleep:SECONDS      （页面加载后按顺序运行）
  当浏览器由 Hermes 启动（本地 browser_navigate 默认）时使用

har_capture_cdp.py <cdp_url> <out.har> [--goto URL] [--wait S] [--action SPEC ...]
  相同的 action SPEC；接入现有 CDP 浏览器且不关闭它
  用于云端后端（Browserbase/Browser-Use/Firecrawl）及 /browser connect

har_to_client.py <in.har> [--host SUBSTR] [--include-static] [--max-body N]
  默认：仅保留 XHR/fetch/JSON；--host 缩小到单一域名
  按端点打印：查询参数、非乏味的请求头、请求体示例、
                       响应状态/内容类型加响应体示例
  打印 "### Replay hints"：浏览器 User-Agent、cookie/auth 存在与否
```

## 流程

0. **根据通路选择捕获器**（参见如何运行表格）。本地启动 → `har_capture.py`；通过 CDP 访问 → `har_capture_cdp.py`。在 Hermes 上，当云端/远程后端处于活动状态时，`/browser connect` 会告诉你 CDP 端点。
1. **找到交互。** 用 `browser_navigate`（或 `--headed` 捕获）打开网站，看要往哪个选择器输入或点哪个，并在 devtools/network 中确认有 JSON XHR 触发。
2. **通过 `terminal` 工具捕获 HAR。** 安排 `--action` 顺序以到达该请求：`fill` 输入框，然后 `sleep` 足够长的时间以等待防抖的 XHR，并且始终在末尾保留 `--wait`，以便迟到的响应能被刷新出来。两个捕获器都会内嵌响应体，因此派生出的客户端能看到真实的载荷结构。
3. **用 `har_to_client.py --host <domain>` 派生。** 读取：方法、URL/路径模板（数字/UUID 段会折叠为 `{id}`）、查询参数、请求体 JSON，以及 `### Replay hints` 块。
4. **编写客户端。** 精确重建该请求——相同的方法、路径、查询参数、请求体。发送网站实际需要的标头：至少要复制重放提示中的 **User-Agent**。如果提示报告了 cookies 或某个 auth/token 标头，也要一并重发。
5. **无浏览器测试。** 用 `terminal` 工具运行该客户端，确认它返回浏览器所看到的相同数据。这正是回报：循环中不再有浏览器。
6. **（可选）封装为 CLI** —— 在派生调用之上写一个小巧的 `argparse` 脚本，例如 `search.py "frank herbert"`。

实操示例（Wikipedia 搜索标题，已派生并实时重放）：

```python
import requests
r = requests.get(
    "https://en.wikipedia.org/w/rest.php/v1/search/title",
    params={"q": "frank herbert", "limit": 5},
    headers={"accept": "application/json",
             "User-Agent": "Mozilla/5.0 ... Chrome/131 Safari/537.36"},  # 来自 HAR
    timeout=15,
)
for p in r.json()["pages"]:
    print(p["title"], "-", p.get("description"))
```

## 常见陷阱

- **默认库的 User-Agent 会被返回 403。** 许多网站（Wikipedia、Cloudflare 前面的 API）会拒绝 `python-requests/x.y`。务必发送重放提示中的浏览器 UA。这是派生客户端在浏览器成功的情况下失败的头号原因。
- **`--action` 失败会在 HAR 刷新之前中止**——你得不到任何文件。如果捕获在选择器上出错，该次运行什么也没产出；修正选择器（用 `--headed` 观察）后重试。不要为一个缺失的 HAR 去调试。
- **服务端渲染的页面没有可派生的 XHR**——`har_to_client.py` 会打印 "No API-looking entries"。数据是在 HTML 中随页面发来的；抓取它，或找到那个确实拉取 JSON 的交互。
- **防抖/输入联想类 XHR 需要真正停顿。** 在 `fill` 之后加上 `--action "sleep:3"`；仅仅输入的话，当 HAR 关闭时请求尚未触发。
- **Auth/session 端点**需要捕获到的 `Cookie`/`Authorization` 标头，而它们会过期。派生客户端的时效取决于该凭据；当它返回 401 时重新捕获。HAR 包含活密钥——将 `out.har` 视为敏感文件，派生后删除它。
- **`record_har_content="embed"` 会让 HAR 变大。** 用 `--max-body` 限制打印内容；对于媒体密集的页面，文件本身可能很大。
- **端点会漂移。** 网站会在无通知的情况下更改私有 API。当客户端出错时，重跑捕获→派生循环，而不是手动修改 URL。
- **捕获器用错 = HAR 为空/不存在。** 在云端/CDP 后端上执行 `har_capture.py` 什么也记录不到（它会启动自己的本地浏览器，而不是你想要的那个）。`har_capture_cdp.py` 需要端点；在 Hermes 上从 `/browser connect` 或 `BROWSER_CDP_URL` 获取。让捕获器与通路相匹配（如何运行表格）。
- **Headless-Chrome UA 是一个弱信号。** 本地/agent-browser 捕获会产生 `HeadlessChrome/...` 的 User-Agent；有些网站会识别出 "Headless" 标记。云端后端（Browserbase/Browser-Use）会发送真实的桌面版 Chrome UA，因此从云端捕获派生的客户端重放起来更可靠。如果某个 headless 派生的客户端在浏览器能够通过时返回 403，在先假设端点变了之前，先把 "Headless" UA 换成一个普通的 Chrome UA 字符串。
- **CDP 捕获不会关闭浏览器。** `har_capture_cdp.py` 接入的是它并不拥有的浏览器，并让它继续运行——对于 Hermes 管理的云端/远程会话而言这是正确的。不要加上关闭操作；让拥有它的后端去回收。

## 验证

针对一个无需 API 密钥的实时网站做端到端证明：

```bash
python3 scripts/har_capture.py "https://en.wikipedia.org/wiki/Main_Page" /tmp/wiki.har \
  --action "fill:input[name=search]:dune messiah" --action "sleep:3" --wait 2
python3 scripts/har_to_client.py /tmp/wiki.har --host wikipedia.org --max-body 200
```

预期派生结果会打印 `GET https://en.wikipedia.org/w/rest.php/v1/search/title`，
带有 `q` 和 `limit` 参数以及 JSON `pages` 响应——然后用流程片段重放它，
并确认相同的标题通过普通 HTTP 被返回。
