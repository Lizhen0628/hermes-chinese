# 应用声明

当某个插件的 MCP 服务器面向某个桌面应用时，它需要声明那是哪个应用，以及该服务器对该应用有何依赖。核心会在主机上评估该声明，并据此对该服务器的工具，以及任何指名该应用的技能，进行门控。解析器仅导入标准库和 `hermes_platform`。

相关词汇定义位于 `hermes_platform/declaration.py`。一个声明由数据加策略构成，从纯映射（已解码的 YAML、JSON、字典字面量 —— 解析器从不会接触文件）解析而来：

```python
from hermes_platform import declaration

decl = declaration.parse_declaration(
    "my-server",
    raw_app={"linux": {"presence": "executable", "location": "/opt/my-app/server"}},
    raw_requires={"app": True},
    where="my-plugin/plugin.yaml",   # 用于错误信息中的人类可读标签
)
declaration.register("my-server", decl)
```

`register(server_name, decl)` 会在一个进程本地注册表中，以所配置的服务器名称存储一条声明。加载器集成是另外的工作；核心不会自动读取插件 YAML。

未注册的 MCP 服务器保留其仅连接检查。显式指名了未注册服务器的技能会被隐藏。`clear()` 会移除所有注册，它并非常规的按插件卸载操作。注册是进程级的，而非按 `配置档` 作用域。

## `app` — 如何在各个操作系统上找到该应用

```yaml
app:
  win32:
    presence: executable
    location: "%ProgramFiles%/Vendor/Vendor App/McpServer/Server.exe"
    version: { kind: uninstall_registry, display_name_prefix: "Vendor App" }
    liveness:
      kind: server_json
      path: "%LOCALAPPDATA%/Vendor/Vendor App/McpServer/server.json"
      pid_key: pid
      url_key: http
      token_key: token
      endpoint_path: /mcp
  darwin:
    presence: bundle
    location: /Applications/Vendor.app
    version: { kind: plist }
```

| 字段 | 类型 | 规则 | 映射到 `AppDef` |
|---|---|---|---|
| `<os>` | `win32` \| `darwin` \| `linux` | 至少一个；未知键为错误 | `AppDef.os_family` |
| `presence` | `executable` \| `bundle` | 每个操作系统必填 | `.presence` |
| `location` | str | 必填；在 Windows 上以盘符根为起点（`C:\\...`），或者以 `~` / `%VAR%` / `$VAR` 开头；拒绝 UNC 路径，以免存在性检查涉及网络；不得含有 `..` 路径段或 URL scheme；在查找时展开 | `.location` |
| `version.kind` | `pe_resource` \| `plist` \| `uninstall_registry` \| `none` | 默认为 `none`；`pe_resource`/`uninstall_registry` 仅用于 `win32`，`plist` 仅用于 `darwin` | `.version_kind` |
| `version.display_name_prefix` | str | 当使用 `uninstall_registry` 时必填 | `.version_arg` |
| `liveness.kind` | `server_json` \| `none` | 默认为 `none` | `.liveness_kind` |
| `liveness.path` | str | 当使用 `server_json` 时必填 | `.liveness_path` |
| `liveness.pid_key` / `url_key` / `token_key` | str | 默认为 `pid` / `http` / `token` | `.liveness_*_key` |
| `liveness.endpoint_path` | str | 默认为 `/mcp`；用于 `initialize` 的路径，绝不使用文件中的那一个 | `.endpoint_path` |

当 `requires.app` 为 true 时，`app:` 中缺失的操作系统会产生 `unsupported_os`。

## `requires` — 服务器在被提供之前需要什么

```yaml
requires:
  app: true
  min_version: "2.3.0"
```

| 字段 | 类型 | 规则 |
|---|---|---|
| `app` | bool | 为 true 时，`app:` 必须存在，且该服务器依据应用存在性进行门控 |
| `min_version` | str | 需要 `app: true`；点分数字；每个适用的 `app.<os>` 都必须声明一个真实的 `version.kind`；按段进行数值比较，段中的非数字字符会被丢弃（`2.3.0.12594` ≥ `2.3.0`；预发布后缀不参与排序） |

`requires.app: true` 而没有 `app:` 块会引发 `DeclarationError`。

## 可用性：每个读取者都使用的唯一评估

`hermes_platform/resolver/availability.py::availability(decl) -> Availability`

```
Availability(
  state:   available | installed_not_running | missing_app | version_too_old
         | unsupported_os | no_requirements,
  version: str | None,       # 存在时，为检查所得的版本
  path:    str | None,       # 找到或查找该应用的位置
  min_version: str | None,   # 来自 requires
)
```

- `no_requirements`：没有 `requires.app`；应用门控通过，但连接检查仍然适用。
- `unsupported_os`：有 `requires.app` 但没有 `app.<当前 os>` 块。零 I/O。
- `missing_app`：`locate` 在 `location` 处未找到任何内容。
- `version_too_old`：版本低于最低要求，或无法读取。
- `available`：存在，版本可接受或未作要求。
- `installed_not_running`：保留词汇；此评估器永远不会产生该状态。

评估使用 `locate` 和可选的版本检查。它不会探测服务器、启动应用或建立连接。工具注册表保留其现有的可用性缓存。

## 两道门控

- **MCP `check_fn`**（`tools/mcp_tool_handlers.py::_make_check_fn`）：连接存活，并且，当为该服务器注册了带 `requires.app` 的声明时，`availability(decl).offerable`。返回一个普通 `bool`，因为注册表会缓存 `bool(fn())`。
- **技能 `requires_apps:` frontmatter**（`agent/skill_utils.py::skill_matches_apps`）：每个名称都通过 `declaration.lookup` 解析；未知名称会隐藏该技能（默认拒绝）。与 `environments:` 一样，是在提供阶段的过滤器。
