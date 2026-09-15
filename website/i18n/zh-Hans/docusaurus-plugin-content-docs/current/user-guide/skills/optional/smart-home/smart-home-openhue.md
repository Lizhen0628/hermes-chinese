---
title: "Openhue — 通过 OpenHue CLI 控制 Philips Hue 灯、场景和房间"
sidebar_label: "Openhue"
description: "通过 OpenHue CLI 控制 Philips Hue 灯、场景和房间"
---

{/* 本页由 website/scripts/generate-skill-docs.py 根据技能的 SKILL.md 自动生成。请编辑源 SKILL.md，而不是本页。 */}

# Openhue

通过 OpenHue CLI 控制 Philips Hue 灯、场景和房间。

## 技能元数据

| | |
|---|---|
| Source | Optional — install with `hermes skills install official/smart-home/openhue` |
| Path | `optional-skills/smart-home\openhue` |
| Version | `1.0.1` |
| Author | community |
| License | MIT |
| Platforms | linux, macos, windows |
| Tags | `Smart-Home`, `Hue`, `Lights`, `IoT`, `Automation` |

## 参考：完整的 SKILL.md

:::info
以下是 Hermes 在触发此技能时加载的完整技能定义。这就是技能激活时智能体看到的指令内容。
:::

# OpenHue CLI

通过 Hue Bridge 在终端中控制 Philips Hue 灯和场景。

## 前置条件

```bash
# Linux（预构建二进制文件 —— 发布版提供的是 tarball，而非裸二进制文件）
curl -sL "https://github.com/openhue/openhue-cli/releases/latest/download/openhue_Linux_x86_64.tar.gz" \
  | tar -xz -C /tmp openhue \
  && install -m 0755 /tmp/openhue ~/.local/bin/openhue
# （在 ARM64 上使用 openhue_Linux_arm64.tar.gz）

# macOS
brew install openhue/cli/openhue-cli
```

首次运行需要按下 Hue Bridge 上的按钮进行配对。桥接器必须位于同一局域网内。

## 何时使用

- “打开/关闭灯”
- “调暗客厅的灯”
- “设置场景”或“电影模式”
- 控制特定的 Hue 房间、区域或单个灯泡
- 调整亮度、颜色或色温

## 常用命令

### 列出资源

```bash
openhue get light       # 列出所有灯
openhue get room        # 列出所有房间
openhue get scene       # 列出所有场景
```

### 控制灯

```bash
# 打开/关闭
openhue set light "Bedroom Lamp" --on
openhue set light "Bedroom Lamp" --off

# 亮度（0-100）
openhue set light "Bedroom Lamp" --on --brightness 50

# 色温（从暖到冷：153-500 mirek）
openhue set light "Bedroom Lamp" --on --temperature 300

# 颜色（按名称或十六进制）
openhue set light "Bedroom Lamp" --on --color red
openhue set light "Bedroom Lamp" --on --rgb "#FF5500"
```

### 控制房间

```bash
# 关闭整个房间
openhue set room "Bedroom" --off

# 设置房间亮度
openhue set room "Bedroom" --on --brightness 30
```

### 场景

```bash
openhue set scene "Relax" --room "Bedroom"
openhue set scene "Concentrate" --room "Office"
```

## 快速预设

```bash
# 就寝（昏暗暖光）
openhue set room "Bedroom" --on --brightness 20 --temperature 450

# 工作模式（明亮冷光）
openhue set room "Office" --on --brightness 100 --temperature 250

# 电影模式（昏暗）
openhue set room "Living Room" --on --brightness 10

# 全部关闭
openhue set room "Bedroom" --off
openhue set room "Office" --off
openhue set room "Living Room" --off
```

## 注意事项

- 桥接器必须与运行 Hermes 的机器位于同一局域网内
- 首次运行需要物理按下 Hue Bridge 上的按钮以完成授权
- 颜色仅支持具备颜色功能的灯泡（不支持仅白光型号）
- 灯和房间名称区分大小写 —— 使用 `openhue get light` 查看确切名称
- 非常适合搭配定时任务进行定时照明（例如就寝时调暗、起床时调亮）
