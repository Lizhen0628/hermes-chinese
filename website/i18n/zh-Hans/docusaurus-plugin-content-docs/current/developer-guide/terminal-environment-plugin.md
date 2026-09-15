# 终端环境服务商插件

Hermes 通过一组可插拔的**终端后端**来运行 shell 命令。内置后端（local、Docker、Singularity、Modal、Daytona、Vercel Sandbox、SSH）位于核心仓库的 `tools/environments/` 目录下。第三方沙箱厂商则以**插件**形式集成——一个独立的插件仓库安装在 `~/.hermes/plugins/` 下，注册一个后端，用户便可像选择内置后端一样，通过 `config.yaml` 中的 `terminal.backend` 来选用它。

本页面与 [浏览器服务商插件](/developer-guide/browser-provider-plugin)指南相对应——相同的注册流程，相同的作用域语义。

## 服务商控制的内容

注册的后端会自动参与每一个核心界面：

| 界面 | 驱动来源 |
|---|---|
| 命令分发（`terminal`、`execute_code`、文件工具） | `create_environment()` |
| `hermes setup` 后端选择器 | `display_name`、`description`、`setup_instructions()`、`post_setup()` |
| 仪表盘终端后端选择器（探测状态） | `probe()` |
| `hermes status` / `hermes doctor` | `doctor_checks()` |
| 系统提示词环境提示 | `is_remote`、`env_description` |
| 危险命令审批跳过 | `skip_container_guards` |
| 容器路径/cwd 处理 | `is_container` |
| 同步缓存文件路径转换 | `cache_path_base` |
| 从派生的子进程中剥离密钥 | `strip_env_keys` |
| 每会话沙箱隔离（`container_persistent: false`） | `session_isolated_when_nonpersistent` |

在服务商上声明这些标志，便能消除经典的"新后端漏掉了第 N 个分类点"这类 bug——核心会在每个分类点查询注册表，而不是依赖一个硬编码的名称列表。

## 最小服务商

```python title="~/.hermes/plugins/acmebox/__init__.py"
from agent.terminal_env_provider import TerminalEnvironmentProvider


class AcmeBoxEnvironment:
    """Must satisfy the BaseEnvironment duck-typed contract."""

    def __init__(self, cwd, timeout, task_id):
        self.cwd, self.timeout, self.task_id = cwd, timeout, task_id

    def execute(self, command, timeout=None, **kwargs):
        ...  # run the command in the sandbox
        return {"output": "...", "exit_code": 0}

    def cleanup(self):
        ...  # tear down / detach


class AcmeBoxProvider(TerminalEnvironmentProvider):
    name = "acmebox"
    display_name = "AcmeBox"
    is_remote = True          # commands don't run on the host
    is_container = True       # container-style path/cwd semantics

    @property
    def description(self):
        return "Run commands in an AcmeBox cloud sandbox."

    @property
    def cache_path_base(self):
        return "~/.hermes"    # where synced cache files land, or None

    @property
    def strip_env_keys(self):
        return frozenset({"ACMEBOX_TOKEN"})

    def is_available(self):
        import importlib.util, os
        return (
            importlib.util.find_spec("acmebox") is not None
            and bool(os.getenv("ACMEBOX_TOKEN"))
        )

    def create_environment(self, *, cwd, timeout, task_id="default",
                           image=None, container_config=None, **kwargs):
        return AcmeBoxEnvironment(cwd, timeout, task_id)


def register(ctx):
    ctx.register_terminal_environment_provider(AcmeBoxProvider())
```

```yaml title="~/.hermes/plugins/acmebox/plugin.yaml"
name: acmebox
version: 0.1.0
description: AcmeBox cloud sandbox terminal backend
kind: backend
```

启用它、选中它、运行：

```bash
hermes plugins enable acmebox
hermes config set terminal.backend acmebox
```

## 规则

- **保留名称。** 与内置后端名称（`local`、`docker`、`singularity`、`modal`、`managed_modal`、`daytona`、`vercel_sandbox`、`ssh`）冲突的注册会被拒绝。插件是扩展后端集合；它们绝不会遮盖仓库内置的后端。
- **`create_environment` 必须接受 `**kwargs`** 并忽略未知键——这是向前兼容契约，让工厂签名可以演进而不破坏较旧的插件。
- **`is_available()` / `probe()` 必须开销低。** 不得发起网络调用——它们会在需求检查和界面绘制时运行。
- **随处软失败。** 服务商属性若抛出异常，核心会将其视为默认值（例如抛出异常的 `skip_container_guards` 会保持审批层为开启）。不要依赖异常来控制流程。
- **密钥应归入 `strip_env_keys`。** 你的厂商令牌绝不能被模型编写的 shell 命令读取；将其列出便会无条件地从每一个派生的子进程中剥离它，就像内置的 `MODAL_*` / `DAYTONA_API_KEY` 处理方式一样。

## 环境对象契约

`create_environment()` 返回的对象需满足与 `tools.environments.base.BaseEnvironment` 相同的鸭子类型接口：

- `execute(command, timeout=None, ...)` → `{"output": str, "exit_code": int}`
- `cleanup()`——释放资源；在会话销毁 / 空闲回收时调用
- 可选：与内置云端后端对应的持久化钩子

建议继承 `BaseEnvironment`（你会继承共享的文件同步和后台进程基础设施），但并非必需。

## 会话隔离语义

如果你的沙箱是**按名称恢复**的（后端重新附着到一个持久 VM 上），请设置 `session_isolated_when_nonpersistent = True`。当 `terminal.container_persistent: false` 时，每个会话便会获得自己的沙箱标识，而不是共用一个——若没有此项，两个各自独立的临时运行可能附着到同一个运行中的 VM 上，并互相把它删除颠覆。
