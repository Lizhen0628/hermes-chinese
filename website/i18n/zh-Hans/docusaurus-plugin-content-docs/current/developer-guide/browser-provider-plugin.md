---
sidebar_position: 13
title: "浏览器服务商插件"
description: "如何为 Hermes Agent 构建云浏览器后端插件"
---

# 构建浏览器服务商插件

浏览器服务商插件注册一个**云浏览器后端**，用于服务云模式下的 `browser_*` 工具调用（导航、点击、截图……）。内置服务商 —— Browserbase、Browser Use 和 Firecrawl —— 都以插件形式发布于 `plugins/browser/<name>/` 下。你可以在它们旁边放置一个目录来添加新服务商，或覆盖某个内置服务商。

:::tip
浏览器后端是 Hermes 支持的若干种**后端插件**之一。其他后端（各有自己的 ABC）包括 [Web 搜索服务商插件](/developer-guide/web-search-provider-plugin)（此 ABC 有意与其保持一致）、[图像生成](/developer-guide/image-gen-provider-plugin)、[视频生成](/developer-guide/video-gen-provider-plugin)、[记忆服务商](/developer-guide/memory-provider-plugin)、[上下文引擎](/developer-guide/context-engine-plugin)、[密钥来源](/developer-guide/secret-source-plugin) 和 [模型服务商](/developer-guide/model-provider-plugin)。通用的工具/钩子/CLI 插件见 [构建 Hermes 插件](/developer-guide/plugins)。
:::

## 各部分如何协同工作

浏览器服务商**并不**实现浏览功能。它实现的是**会话生命周期**：创建远程浏览器会话、交回一个 CDP websocket URL，并拆除会话。Hermes 自己的浏览器技术栈（`agent-browser` + `tools/browser_tool.py`）会连接到你所返回的任意 CDP URL，并从那里驱动页面 —— 每个服务商都能免费获得完整的 `browser_*` 工具集。

当前生效的服务商由 `config.yaml` 中的 `browser.cloud_provider` 选择；`tools/browser_tool.py` 中的分发器是一次纯粹的注册表查找，没有任何针对具体服务商的条件判断。

## 发现机制

Hermes 在三个位置扫描浏览器后端：

1. **内置** —— `<repo>/plugins/browser/<name>/`（以 `kind: backend` 自动加载）
2. **用户** —— `~/.hermes/plugins/browser/<name>/`（通过 `plugins.enabled` 或 `hermes plugins enable <name>` 选择性启用）
3. **Pip** —— 声明了 `hermes_agent.plugins` 入口点的包

每个插件的 `register(ctx)` 会调用 `ctx.register_browser_provider(...)`，将实例放入 `agent/browser_registry.py` 中的注册表。

## 目录结构

```
plugins/browser/my-backend/
├── __init__.py     # register() 入口点
├── provider.py     # BrowserProvider 子类
└── plugin.yaml     # 带有 kind: backend 和 provides_browser_providers 的清单
```

`plugin.yaml`：

```yaml
name: browser-my-backend
version: 1.0.0
description: "My cloud browser backend. Requires MY_BACKEND_API_KEY."
author: you
kind: backend
provides_browser_providers:
  - my-backend
```

`__init__.py`：

```python
from plugins.browser.my_backend.provider import MyBackendProvider


def register(ctx) -> None:
    ctx.register_browser_provider(MyBackendProvider())
```

## BrowserProvider ABC

实现 `agent.browser_provider.BrowserProvider`。包括标识在内共三个生命周期方法：

```python
from agent.browser_provider import BrowserProvider


class MyBackendProvider(BrowserProvider):
    @property
    def name(self) -> str:
        return "my-backend"          # the browser.cloud_provider config value

    @property
    def display_name(self) -> str:
        return "My Backend"          # shown in `hermes tools`

    def is_available(self) -> bool:
        """Cheap check only — env var present, dep importable.
        NO network calls: runs at tool-registration time and on every
        `hermes tools` paint."""
        return bool(os.environ.get("MY_BACKEND_API_KEY"))

    def create_session(self, task_id: str) -> dict:
        """Create a remote browser session; return the session-metadata contract."""
        session = my_api.create_browser(...)
        return {
            "session_name": f"my-backend-{task_id}",  # unique agent-browser session name
            "bb_session_id": session.id,              # provider session ID (for cleanup)
            "cdp_url": session.cdp_ws_url,            # CDP websocket URL
            "features": {"stealth": True},            # feature flags you enabled
        }

    def close_session(self, session_id: str) -> bool:
        """Terminate by provider session ID. Log-and-return-False on error —
        never raise, so the dispatcher's cleanup loop keeps moving."""
        ...

    def emergency_cleanup(self, session_id: str) -> None:
        """Best-effort teardown from atexit/signal handlers. Must not raise."""
        ...
```

### 会话元数据契约

`create_session()` 至少必须返回 `session_name`、`bb_session_id`、`cdp_url` 和 `features`。有两个值得了解的怪癖：

- **`bb_session_id` 是一个历史遗留的键名**，为保持与 `tools/browser_tool.py` 的向后兼容而逐字保留 —— 无论使用哪家厂商，它都存放*你的*服务商的会话 ID。不要重命名它。
- `create_session()` **可以抛出异常** —— 缺少凭据时抛 `ValueError`，网络/API 失败时抛 `RuntimeError`。分发器会将这些错误呈现给用户。这与 `close_session`/`emergency_cleanup` 不同，后两者绝不能抛异常。

可选的 `external_call_id` 键用于支持托管网关计费。

### `get_setup_schema()` —— `hermes tools` 选择器中的一行

覆盖此方法，即可作为一等选项出现在 Browser Automation 选择器中，并带有 API 密钥提示和安装钩子：

```python
def get_setup_schema(self) -> dict:
    return {
        "name": "My Backend",
        "badge": "paid",
        "tag": "Cloud browser with stealth and proxies",
        "env_vars": [
            {"key": "MY_BACKEND_API_KEY",
             "prompt": "My Backend API key",
             "url": "https://mybackend.example"},
        ],
        "post_setup": "agent_browser",   # ensures local Chromium is installed (agent-browser itself resolves via npx)
    }
```

按照项目对工具后端的标准：如果一个后端无法通过 `hermes tools` 被选择和配置，那它就不算完成 ——“手动设置这个环境变量”不是一种集成。

## 用户如何配置

```yaml
browser:
  cloud_provider: my-backend
```

## 参考实现

`plugins/browser/` 下的三个内置服务商是标准范例，复杂性递增：`firecrawl`（最简单）、`browser_use` 和 `browserbase`（带有 stealth/proxy/keep-alive 功能标志，并在付费功能不可用时优雅降级）。复制最接近的一个即可。

## 检查清单

- [ ] `name` 为小写且稳定（它是用户要写的配置值）
- [ ] `is_available()` 不进行任何网络调用
- [ ] `create_session()` 返回完整的元数据契约（`bb_session_id` 键名保持不变）
- [ ] `close_session()` / `emergency_cleanup()` 绝不抛出异常
- [ ] `get_setup_schema()` 暴露你的环境变量，以便 `hermes tools` 能配置该后端
- [ ] `plugin.yaml` 声明了 `kind: backend` + `provides_browser_providers`
