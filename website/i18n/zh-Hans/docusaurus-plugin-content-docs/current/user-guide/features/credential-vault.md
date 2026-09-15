---
title: "密码与登录"
description: "智能体替你登录网站、付款、填写地址，全程不会看到密码。"
---

# 密码与登录

说一句 **“登录 GitHub”**，智能体就会替你登录。第一次遇到它没有凭据的登录页面时，它会在原地、通过一个掩码提示框向你询问。此后便可畅通无阻。密码在本机加密存储，并直接注入页面；模型永远看不到它们。

无需任何设置。

## 实际使用是什么样

**CLI / TUI**

```
🔐 Save login for github.com
   The agent reached a sign-in page with no saved login for this site.
   Type the email / username you sign in with (shown), then Enter.
   ...
   Now the password (hidden). It is encrypted on this machine, bound to
   https://github.com, and filled into the page without the model ever seeing it.
```

**Desktop** —— 一张“保存你的 github.com 登录？”卡片，包含一个标识符输入框和一个掩码密码输入框。*保存并登录* 会将其存下并继续；*不保存* 则告诉智能体本轮不要再询问。

在那之后，智能体会列出你已保存的登录项，自行输入标识符，并通过 Hermes 填入密码。它看到的工具结果为 `{filled_fields: 1, origin: "https://github.com"}`；同时密码也会注册到脱敏器中，因此后续读取页面时无法回显它。

## 二次验证码

密码之后还需要验证码的网站，处理方式相同：

- **验证器密钥随登录项一同保存**（网站开启 2FA 时显示的“设置密钥”或 `otpauth://` 链接；1Password 和 Bitwarden 中包含 TOTP 随机种子的条目也算）：Hermes 会生成当前验证码并填入。不会询问任何人。可在 **Settings → Passwords & Logins → Add** 或 `hermes vault add` 中添加密钥；该条目会显示 *2FA 自动* 徽章。
- **发送到你手机或邮箱的验证码**：你的界面会出现一个小提示（“github.com 的验证码”），你输入验证码，Hermes 将其填入页面。验证码同样不会进入对话。
- **通行密钥、硬件密钥、App 审批**（“在 Duo 中点按批准”）：无需输入任何内容。智能体会告知你在设备上完成，并等待页面继续。

## 已经在用 1Password 或 Bitwarden？

无需开启任何东西。如果 `op` 或 `bw` 命令行工具已安装并登录，Hermes 会自动识别它，其网站登录项便可与本地登录项一同填写。智能体第一次需要其中一个登录项时，会要求你用主密码解锁该管理器（掩码提示框；每会话一次，空闲 30 分钟后过期）。Hermes 通过其非交互通道将主密码交给该管理器的 CLI（在 stdin 上执行 `op signin`，在子进程环境中使用 `bw unlock --passwordenv`），并且只在内存中保留会话令牌。智能体永远看不到主密码、令牌或任何登录项。

不想使用检测到的管理器？运行 `hermes vault sources --disable bitwarden`，或使用 **Settings → Passwords & Logins** 中的开关。

## 付款与填写地址

卡片和地址的处理方式与登录项相同：保存一次（**Settings → Passwords & Logins → Add**，或 `hermes vault add`），绑定到结算网站，且仅由智能体在该网站上填写。**每次填入卡片都会先询问你**，使用与危险命令相同的审批提示；拒绝则不会写入任何内容。无头会话（定时任务、Webhook、API 服务器）无法确认，因此会被拒绝，这样即使提示注入到达了结算页面也只会询问，而无法扣款。填写地址无需确认。

## 管理已保存的内容

- **Desktop → Settings → Passwords & Logins**：所有已保存项、检测到的密码管理器及其解锁/锁定、Add、Remove。
- **CLI**：`hermes vault list`、`hermes vault add`、`hermes vault rm <handle>`、`hermes vault sources`。

条目以加密形式存于 `~/.hermes/vault/` 下（Fernet 密钥 + vault 文件，二者权限均为 `0600`），按配置档隔离。标签、站点来源和登录标识符是可见的元数据；密码和卡片值永不离开 vault，只进页面。

## 无头会话

定时任务、Webhook、API 服务器及 `hermes chat -q` 无人应答提示。已保存的本地登录项在这些场景下仍可使用；已锁定的密码管理器会报告 `unavailable_in_this_session`，缺失的登录项则报告 `prompt_unavailable`。请先在交互式会话中解锁或保存，或给 1Password 提供一个服务账户令牌（`OP_SERVICE_ACCOUNT_TOKEN`）。

```yaml
vault:
  onepassword:
    enabled: false          # opt OUT of a detected manager (default: on when installed)
    account: ""             # `op --account` shorthand; empty = default
    service_account_token_env: OP_SERVICE_ACCOUNT_TOKEN
  bitwarden:
    enabled: false
```

## 这保证了什么、又不保证什么

**能保证：** 密码绝不会通过 Hermes 进入模型的上下文：不会出现在工具结果、日志、会话数据库或任何进程的 CLI 参数中。填入操作经由受监管浏览器会话的直接 CDP 套接字进行，并且仅当页面来源与已保存来源完全匹配时才会执行，写入前还会在页面内再次检查。

**不能保证：** 防范页面本身。密码一旦输入某个网站，该网站（以及它运行的任何脚本）就拿到了它，和你在浏览器里亲手输入时一样。在云端浏览器后端上，服务商的浏览器如同其他浏览器一样能看到页面。来源绑定是防止填错站点的防线，而非防范被入侵的正确站点。
