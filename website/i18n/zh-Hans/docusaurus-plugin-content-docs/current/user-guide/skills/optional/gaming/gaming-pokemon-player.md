---
title: "Pokemon Player —— 通过无头模拟器 + RAM 读取玩 Pokemon"
sidebar_label: "Pokemon Player"
description: "通过无头模拟器 + RAM 读取玩 Pokemon"
---

{/* 本页由 website/scripts/generate-skill-docs.py 根据技能的 SKILL.md 自动生成。请编辑源文件 SKILL.md，而非此页面。 */}

# Pokemon Player

通过无头模拟器 + RAM 读取玩 Pokemon。

## 技能元数据

| | |
|---|---|
| Source | Optional —— 使用 `hermes skills install official/gaming/pokemon-player` 安装 |
| Path | `optional-skills/gaming\pokemon-player` |
| Version | `1.0.0` |
| Author | Teknium (teknium1), Hermes Agent |
| License | MIT |
| Platforms | linux, macos, windows |

## 参考：完整的 SKILL.md

:::info
以下是 Hermes 在此技能被触发时加载的完整技能定义。当技能处于激活状态时，这就是智能体看到的指令内容。
:::

# Pokemon Player

使用 `pokemon-agent` 包通过无头模拟玩 Pokemon 游戏。

## 何时使用
- 用户说 "play pokemon"、"start pokemon"、"pokemon game"
- 用户询问 Pokemon Red、Blue、Yellow、FireRed 等
- 用户想观看 AI 玩 Pokemon
- 用户提到 ROM 文件（.gb、.gbc、.gba）

## 启动流程

### 1. 首次设置（克隆、venv、安装）
仓库是 GitHub 上的 NousResearch/pokemon-agent。克隆它，然后
设置 Python 3.10+ 虚拟环境。使用 uv（速度更快，优先选择）
创建 venv 并以可编辑模式安装包，附加 pyboy extra。
如果 uv 不可用，则回退到 python -m venv + pip。

如果已存在检出副本（例如 ~/pokemon-agent 且有现成的 venv），
直接 cd 到那里并 source .venv/bin/activate，而不是重新克隆。

你还需要一个 ROM 文件。向用户索要他们的 ROM（之前的设置可能
已经在检出的 roms/pokemon_red.gb 中现有一个）。
绝不下载或提供 ROM 文件——始终询问用户。

### 2. 启动游戏服务器
在激活 venv 的情况下，于 pokemon-agent 目录内运行
pokemon-agent serve，用 --rom 指向 ROM，--port 指定为 9876。
用 & 在后台运行。
如需从已保存的游戏恢复，添加 --load-state 并指定存档名。
等待 4 秒启动完成，然后用 GET /health 验证。

### 3. 设置实时仪表板供用户观看
使用通过 localhost.run 的 SSH 反向隧道，让用户可以在浏览器中
查看仪表板。使用 ssh 连接，将本地端口 9876 转发到无密钥的
localhost.run 端点的远程端口 80
（ssh -R 80:localhost:9876 ssh://nokey@localhost.run）。将输出
重定向到日志文件，等待 10 秒，然后在日志中 grep 查找 .lhr.life
URL。将 URL 后附加 /dashboard/ 后交给用户使用。
隧道 URL 每次都会变化——如果重启了，请给用户新的 URL。

## 保存与加载

### 何时保存
- 每 15-20 回合的游戏进程
- 在道馆战斗、对手遭遇或高风险战斗之前，务必保存
- 进入新城镇或地下城之前
- 对任何不确定的操作之前

### 如何保存
POST /save 并带上一个描述性名字。好的示例：
before_brock、route1_start、mt_moon_entrance、got_cut

### 如何加载
POST /load 并带上存档名。

### 列出可用存档
GET /saves 返回所有已保存状态。

### 服务器启动时加载
启动服务器时使用 --load-state 标志可自动加载存档。
这比启动后通过 API 加载更快。

## 游戏循环

### 第 1 步：观察——检查状态并截图
GET /state 获取位置、HP、战斗、对话。
GET /screenshot 并保存到 /tmp/pokemon.png，然后使用 vision_analyze。
始终两者都做——RAM 状态给出数字，视觉给出空间感知。

### 第 2 步：定位
- 屏幕上有对话/文字 → 推进它
- 在战斗中 → 战斗或逃跑
- 队伍受伤 → 前往宝可梦中心
- 接近目标 → 小心导航

### 第 3 步：决策
优先级：对话 > 战斗 > 治疗 > 剧情目标 > 训练 > 探索

### 第 4 步：行动——最多移动 2-4 步，然后重新检查
POST /action 并带一个简短的动作列表（2-4 个动作，不是 10-15 个）。

### 第 5 步：验证——每次移动序列后截图
截图并使用 vision_analyze 确认你移动到了预期的位置。
这是最重要的一步。没有视觉，你一定会迷路。

### 第 6 步：将进度以 PKM: 前缀记录到记忆

### 第 7 步：定期保存

## 动作参考
- press_a —— 确认、对话、选择
- press_b —— 取消、关闭菜单
- press_start —— 打开游戏菜单
- walk_up/down/left/right —— 移动一格
- hold_b_N —— 按住 B 键 N 帧（用于加速阅读文字）
- wait_60 —— 等待约 1 秒（60 帧）
- a_until_dialog_end —— 反复按 A 直到对话结束

## 来自经验的关键提示

### 持续使用视觉
- 每移动 2-4 步就截图一次
- RAM 状态告诉你位置和 HP，但不会告诉你周围有什么
- 台阶、栏杆、标志、建筑门、NPC——只有通过截图才能看到
- 向视觉模型提出具体问题："我正北边一格是什么？"
- 遇到困难时，始终在尝试随机方向之前先截图

### 传送切换需要额外的等待时间
当走过门或楼梯时，画面在地图切换期间会渐隐至黑色。
你必须等待其完成。在任何门/楼梯传送后添加 2-3 个 wait_60
动作。不等待的话，位置读数会是过时的，你会以为自己还在旧地图。

### 离开建筑陷阱
当你离开建筑时，你会出现在门的正前方。
如果你向北走，你会立刻回到里面。务必先侧移
向左或向右走 2 格，然后按你的意图方向前进。

### 对话处理
第 1 代文字会逐字缓慢滚动。要加速对话，
按住 B 120 帧然后按 A。根据需要重复。按住 B 会以最大速度
显示文字。然后按 A 推进到下一行。
a_until_dialog_end 动作会检查 RAM 对话标志，但该标志
并不能捕获所有文字状态。如果对话似乎卡住，改用手动
hold_b + press_a 模式，并通过截图验证。

### 台阶是单向的
台阶（小悬崖边缘）只能跳下（向南），永远无法
爬上（向北）。如果向北被台阶挡住，你必须向左或向右
找到绕过的缺口。使用视觉识别缺口在哪个方向。
明确地询问视觉模型。

### 导航策略
- 每次移动 2-4 步，然后截图检查位置
- 进入新区域时，立即截图以定位
- 向视觉模型询问 "到 [目的地] 该往哪个方向走？"
- 如果卡住 3 次以上，截图并彻底重新评估
- 不要连续输入 10-15 次移动——你会越过或卡住

### 从野生战斗中逃跑
在战斗菜单中，RUN 在右下角。从默认光标位置
（FIGHT，左上角）到达它：按下再按右将光标移到 RUN，
然后按 A。用 hold_b 包裹以加速文本/动画。

### 战斗（FIGHT）
在战斗菜单中 FIGHT 在左上角（默认光标位置）。
按 A 进入招式选择，再按 A 使用第一个招式。
然后按住 B 加速攻击动画和文本。

## 战斗策略

### 决策树
1. 想捕捉？→ 先削弱然后扔精灵球
2. 不需要的野生宝可梦？→ 逃跑
3. 有属性优势？→ 使用效果绝佳的招式
4. 没有优势？→ 使用最强的本系招式
5. HP 低？→ 换人或使用药水

### 第 1 代属性相克表（关键对位）
- 水克火、地面、岩石
- 火克草、虫、冰
- 草克水、地面、岩石
- 电克水、飞行
- 地面克火、电、岩石、毒
- 超能力克格斗、毒（在第 1 代具有统治力！）

### 第 1 代特性
- 特殊数值同时是特殊招式的攻击和防御
- 超能力属性过于强大（幽灵招式有 bug）
- 暴击基于速度数值
- 捆绑/紧束使对手无法行动
- 聚气 bug：降低暴击率而不是提高它

## 记忆约定
| 前缀 | 用途 | 示例 |
|--------|---------|---------|
| PKM:OBJECTIVE | 当前目标 | Get Parcel from Viridian Mart |
| PKM:MAP | 导航知识 | Viridian: mart is northeast |
| PKM:STRATEGY | 战斗/队伍计划 | Need Grass type before Misty |
| PKM:PROGRESS | 里程碑追踪 | Beat rival, heading to Viridian |
| PKM:STUCK | 卡住的情况 | Ledge at y=28 go right to bypass |
| PKM:TEAM | 队伍笔记 | Squirtle Lv6, Tackle + Tail Whip |

## 进度里程碑
- 选择初始宝可梦
- 从 Viridian Mart 递送 Parcel，获得 Pokedex
- 灰色徽章——Brock（岩石）→ 使用水/草
- 蓝色徽章——Misty（水）→ 使用草/电
- 橙色徽章——Lt. Surge（电）→ 使用地面
- 彩虹徽章——Erika（草）→ 使用火/冰/飞行
- 粉红徽章——Koga（毒）→ 使用地面/超能力
- 金色徽章——Sabrina（超能力）→ 最难的场馆
- 深红徽章——Blaine（火）→ 使用水/地面
- 绿色徽章——Giovanni（地面）→ 使用水/草/冰
- 四天王 → 冠军！

## 停止游玩
1. 通过 POST /save 用描述性名字保存游戏
2. 用 PKM:PROGRESS 更新记忆
3. 告诉用户："Game saved as [name]! Say 'play pokemon' to resume."
4. 关闭服务器和隧道的后台进程

## 陷阱
- 绝不下载或提供 ROM 文件
- 检查视觉之前不要发送超过 4-5 个动作
- 离开建筑后向北走之前务必先侧移
- 门/楼梯传送后务必添加 wait_60 x2-3
- 通过 RAM 检测对话不可靠——用截图验证
- 在高风险遭遇之前保存
- 每次重启隧道时 URL 都会变化
