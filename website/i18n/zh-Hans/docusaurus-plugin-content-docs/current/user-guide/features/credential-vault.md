---
title: 密码与登录
description: 智能体为你登录网站、支付和填写地址，却始终不会看到密码。
---

# 密码与登录

说一句 **“登录 GitHub”**，智能体就会替你登录。第一次遇到它没有登录凭据的登录页面时，它会当场通过掩码提示向你询问。之后就直接搞定了。密码在本机加密，直接注入页面；模型永远看不到它们。

无需任何设置。

## 实际效果

**CLI / TUI**

```
🔐 Save login for github.com
   The agent reached a sign-in page with no saved login for this site.
   Type the email / username you sign in with (shown), then Enter.
   ...
   Now the password (hidden). It is encrypted on this machine, bound to
   https://github.com, and filled into the page without the model ever seeing it.
```

**Desktop** —— 一张“保存你的 github.com 登录信息？”卡片，包含标识符字段和掩码密码字段。*保存并登录*会将其存储并继续；*不保存*则告诉智能体本轮不要再询问。

此后，智能体会列出你已保存的登录信息，自行输入标识符，并通过 Hermes 填入密码。它看到的工具结果是 `{filled_fields: 1, origin: "https://github.com"}`；密码同时也会注册到脱敏器中，因此之后读取页面也无法将其回显出来。

## 双重验证码

在密码之后要求输入验证码的网站也以同样方式处理：

- **与登录信息一同保存的身份验证器密钥**（即网站启用 2FA 时显示的“设置密钥”或 `otpauth://` 链接；1Password 和 Bitwarden 中包含 TOTP 种子的条目也算）：Hermes 会生成当前验证码并输入。不会询问任何人。在 **设置 → 密码与登录 → 添加** 中添加密钥，或使用 `hermes vault add`；该条目会显示 *2FA 自动* 徽章。
- **发送到你手机或邮箱的验证码**：你的界面中会出现一个小提示（“github.com 的验证码”），你输入验证码，Hermes 将其填入页面。验证码同样不会进入对话。
- **通行密钥、硬件密钥、应用批准**（“在 Duo 中点按批准”）：无需输入任何内容。智能体会提示你在自己的设备上完成，并等待页面继续。

## 已经在用 1Password 或 Bitwarden？

无需启用任何东西。如果 `op` 或 `bw` 命令行工具已安装并已登录，Hermes 会自动识别它，其网站登录信息便可与本地登录信息一同填入。智能体第一次需要这些登录信息之一时，会要求你用主密码解锁管理器（掩码提示；每个会话一次，闲置 30 分钟）。Hermes 通过管理器的 CLI 的非交互通道（`op signin` 走 stdin，`bw unlock --passwordenv` 走子进程环境变量）将主密码交给它，并且只在内存中保留会话令牌。智能体永远看不到主密码、令牌或任何登录信息。

不想使用检测到的管理器？执行 `hermes vault sources --disable bitwarden`，或使用 **设置 → 密码与登录** 中的开关。

## 支付与填写地址

银行卡和地址的工作方式与登录信息相同：保存一次（**设置 → 密码与登录 → 添加**，或 `hermes vault add`），绑定到结算网站，并且智能体仅在该网站上填入。**每次填写银行卡都会先询问你**，使用与危险命令相同的批准提示；拒绝则不会写入任何内容。无头会话（定时任务、webhook、API 服务器）无法确认，会被拒绝，因此到达结算页面的提示注入可以发出请求，但无法消费。填写地址无需确认。

## 管理已保存的内容

- **Desktop → 设置 → 密码与登录**：已保存的全部内容、检测到的密码管理器（含解锁/锁定）、添加、移除。
- **CLI**：`hermes vault list`、`hermes vault add`、`hermes vault rm <handle>`、`hermes vault sources`。

条目加密存放在 `~/.hermes/vault/` 下（Fernet 密钥 + 保管库文件，均为 `0600`），按配置档划分作用域。标签、网站来源和登录标识符是可见的元数据；密码和银行卡值永远不会离开保管库，除非填入页面。

## 无头会话

定时任务、webhook、API 服务器和 `hermes chat -q` 没有人来回答提示。已保存的本地登录信息在这些场景下仍然可用；已锁定的密码管理器会报告 `unavailable_in_this_session`，缺失的登录信息会报告 `prompt_unavailable`。请先在交互式会话中解锁或保存，或者给 1Password 一个服务账户令牌（`OP_SERVICE_ACCOUNT_TOKEN`）。

```yaml
vault:
  onepassword:
    enabled: false          # opt OUT of a detected manager (default: on when installed)
    account: ""             # `op --account` shorthand; empty = default
    service_account_token_env: OP_SERVICE_ACCOUNT_TOKEN
  bitwarden:
    enabled: false
```

## 这能保证什么，不能保证什么

**能：**密码永远不会通过 Hermes 进入模型的上下文：不会出现在工具结果、日志、会话数据库或任何进程的 CLI 参数中。填入操作通过受监管浏览器会话的直接 CDP socket 进行，除非页面来源与保存的来源完全匹配——在写入前一刻会在页面内再次检查——否则会被拒绝。

**不能：**无法防范页面本身。一旦密码被输入到某个网站，那个网站（及其运行的所有脚本）就拥有了它，和你自己输入时完全一样。在云端浏览器后端上，供应商的浏览器会像其他任何人一样看到页面。来源绑定是防止在错误网站填入的防线，而不是防止正确但已被攻陷的网站。
