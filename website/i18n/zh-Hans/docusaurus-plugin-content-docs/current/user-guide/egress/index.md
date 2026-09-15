---
title: "出口代理"
sidebar_position: 1
---

# 出口代理

用于远程终端沙箱的可选出站凭据注入防火墙。沙箱始终只持有不透明的代理令牌；真实的 API 密钥永远不会离开主机。

- [iron-proxy](./iron-proxy) — 来自 [ironsh/iron-proxy](https://github.com/ironsh/iron-proxy) 的单二进制 TLS 拦截代理，按需惰性安装并由 `hermes egress` 管理。
