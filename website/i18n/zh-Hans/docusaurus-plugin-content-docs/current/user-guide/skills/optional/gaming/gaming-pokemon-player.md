---
title: "Pokemon Player — 通过无头模拟器 + RAM 读取畅玩 Pokemon"
sidebar_label: "Pokemon Player"
description: "通过无头模拟器 + RAM 读取畅玩 Pokemon"
---

{/* 本页面由 website/scripts/generate-skill-docs.py 根据技能的 SKILL.md 自动生成。请编辑源 SKILL.md，而非本页面。 */}

# Pokemon Player

通过无头模拟器 + RAM 读取畅玩 Pokemon。

## 技能元数据

| | |
|---|---|
| 来源 | 可选 — 使用 `hermes skills install official/gaming/pokemon-player` 安装 |
| 路径 | `optional-skills/gaming\pokemon-player` |
| 版本 | `1.0.0` |
| 作者 | Teknium (teknium1)，Hermes Agent |
| 许可证 | MIT |
| 平台 | linux, macos, windows |

## 参考：完整 SKILL.md

:::info
以下是 Hermes 在触发该技能时加载的完整技能定义。这就是技能激活时智能体所看到的指令。
:::

# Pokemon Player

使用 `pokemon-agent` 包通过无头模拟畅玩 Pokemon 游戏。

## 何时使用
- 用户说 "play pokemon"、"start pokemon"、"pokemon game"
- 用户询问 Pokemon Red、Blue、Yellow、FireRed 等
- 用户想观看 AI 玩 Pokemon
- 用户提及 ROM 文件（.gb、.gbc、.gba）

## 启动流程

### 1. 首次设置（克隆、虚拟环境、安装）
仓库位于 GitHub 上的 NousResearch/pokemon-agent。克隆它，然后
搭建 Python 3.10+ 虚拟环境。使用 uv（速度更快，推荐）
创建虚拟环境并以可编辑模式安装该包，附带
pyboy extra。如果 uv 不可用，则回退到 python -m venv + pip。

如果已存在检出（例如 ~/pokemon-agent 且虚拟环境已就绪），
只需 cd 到那里并 source .venv/bin/activate，无需重新克隆。

你还需要一个 ROM 文件。请向用户索取（此前的设置可能
已在检出目录下的 roms/pokemon_red.gb 中备好一个）。
切勿下载或提供 ROM 文件——始终询问用户。

### 2. 启动游戏服务器
在虚拟环境已激活的情况下，从 pokemon-agent 目录内运行
pokemon-agent serve，用 --rom 指向 ROM，用 --port 指定 9876。
使用 & 在后台运行。
若要从存档恢复游戏，添加 --load-state 加上存档名称。
等待 4 秒启动完成，然后用 GET /health 验证。

### 3. 设置实时仪表盘供用户观看
使用通过 localhost.run 的 SSH 反向隧道，让用户可以在
浏览器中查看仪表盘。使用 ssh 连接，将本地端口 9876 转发到
无密钥 localhost.run 端点的远程端口 80
（ssh -R 80:localhost:9876 ssh://nokey@localhost.run）。将输出
重定向到日志文件，等待 10 秒，然后 grep 日志查找 .lhr.life
URL。将 URL 加上 /dashboard/ 后缀交给用户。
隧道 URL 每次都会变化——若重启，请给用户新的地址。

## 保存与读取

### 何时保存
- 每进行 15-20 回合
- 在道馆战、对手遭遇战或风险战斗之前务必保存
- 进入新城镇或地下城之前
- 进行任何你不确定的操作之前

### 如何保存
POST /save，使用描述性名称。好的示例：
before_brock、route1_start、mt_moon_entrance、got_cut

### 如何读取
POST /load，带上存档名称。

### 列出可用存档
GET /saves 返回所有已保存状态。

### 服务器启动时读取
启动服务器时使用 --load-state 标志以自动加载存档。
这比启动后通过 API 加载更快。

## 游戏循环

### 第 1 步：观察 — 检查状态并截图
GET /state 获取位置、HP、战斗、对话信息。
GET /screenshot 并保存到 /tmp/pokemon.png，然后使用 vision_analyze。
务必两者都做——RAM 状态给出数字，视觉给出空间感知。

### 第 2 步：定位
- 屏幕上有对话/文字 → 推进它
- 在战斗中 → 攻击或逃跑
- 队伍受伤 → 前往 Pokemon Center
- 接近目标 → 谨慎导航

### 第 3 步：决策
优先级：对话 > 战斗 > 治疗 > 剧情目标 > 训练 > 探索

### 第 4 步：行动 — 最多移动 2-4 步，然后重新检查
POST /action，使用简短的动作列表（2-4 个动作，而非 10-15 个）。

### 第 5 步：验证 — 每个移动序列后都要截图
截图并使用 vision_analyze 确认你按预期移动到了目标位置。
这是最重要的一步。没有视觉你必然会迷路。

### 第 6 步：记录进度到记忆，使用 PKM: 前缀

### 第 7 步：定期保存

## 动作参考
- press_a — 确认、对话、选择
- press_b — 取消、关闭菜单
- press_start — 打开游戏菜单
- walk_up/down/left/right — 移动一格
- hold_b_N — 按住 B 持续 N 帧（用于加速跳过文字）
- wait_60 — 等待约 1 秒（60 帧）
- a_until_dialog_end — 反复按 A 直到对话结束

## 来自实践经验的关键提示

### 持续使用视觉
- 每移动 2-4 步截图一次
- RAM 状态告诉你位置和 HP，但不告诉你周围有什么
- 悬崖、围栏、招牌、建筑门、NPC——只有通过截图才可见
- 向视觉模型提出具体问题："我北面一格是什么？"
- 被困住时，务必先截图再尝试随机方向

### 传送过渡需要额外等待时间
穿过门或楼梯时，在场景过渡期间屏幕会变黑。
你必须等待其完成。在任何门/楼梯传送之后添加 2-3 个 wait_60
动作。不等待的话，读取到的位置是过时的，你会以为自己仍在旧地图中。

### 建筑出口陷阱
当你走出建筑时，你正好站在门正前方。
如果你向北走，你会直接走回室内。务必先侧移，
向左或向右走 2 格，然后再朝你预定的方向前进。

### 对话处理
第一代文字逐字母缓慢滚动。要加速跳过对话，
按住 B 持续 120 帧然后按 A。按需重复。按住 B 会让
文字以最高速度显示。然后按 A 推进到下一行。
a_until_dialog_end 动作会检查 RAM 对话标志，但该标志
无法捕捉所有文字状态。如果对话似乎卡住，改用
手动 hold_b + press_a 模式并截图验证。

### 悬崖是单向的
悬崖（小悬崖边缘）只能向下（南）跳，绝不能向上
（北）爬。如果向北被悬崖阻挡，你必须向左或向右
寻找绕过它的缺口。使用视觉识别缺口在哪个方向。
明确地向视觉模型提问。

### 导航策略
- 每次移动 2-4 步，然后截图检查位置
- 进入新区域时，立即截图以定位
- 向视觉模型提问"去 [目的地] 该往哪个方向走？"
- 如果尝试 3 次以上仍卡住，截图并完全重新评估
- 不要连续发送 10-15 次移动——你会走过头或卡住

### 从野生战斗中逃跑
在战斗菜单中，RUN 在右下角。从默认光标位置（FIGHT，左上角）
到达它：按下然后按右将光标移到 RUN，然后按 A。
用 hold_b 包裹以加速跳过文字/动画。

### 战斗（FIGHT）
在战斗菜单中，FIGHT 位于左上角（默认光标位置）。
按 A 进入招式选择，再按 A 使用第一个招式。
然后按住 B 加速跳过攻击动画和文字。

## 战斗策略

### 决策树
1. 想捕捉？→ 先削弱然后投掷 Poke Ball
2. 不需要的野生宝可梦？→ 逃跑
3. 属性优势？→ 使用效果绝佳的招式
4. 无优势？→ 使用最强的本系招式
5. HP 低？→ 替换或使用 Potion

### 第一代属性克制表（关键对阵）
- Water 克制 Fire、Ground、Rock
- Fire 克制 Grass、Bug、Ice
- Grass 克制 Water、Ground、Rock
- Electric 克制 Water、Flying
- Ground 克制 Fire、Electric、Rock、Poison
- Psychic 克制 Fighting、Poison（在第一代中占据统治地位！）

### 第一代特性
- Special 属性 = 特殊招式的攻击和防御兼用
- Psychic 属性过于强大（Ghost 招式有 bug）
- 暴击基于 Speed 属性
- Wrap/Bind 阻止对手行动
- Focus Energy bug：降低暴击率而非提升

## 记忆约定
| 前缀 | 用途 | 示例 |
|--------|---------|---------|
| PKM:OBJECTIVE | 当前目标 | 从 Viridian Mart 取包裹 |
| PKM:MAP | 导航知识 | Viridian：商店在东北方 |
| PKM:STRATEGY | 战斗/队伍计划 | 在挑战 Misty 前需要 Grass 属性 |
| PKM:PROGRESS | 里程碑追踪 | 击败对手，前往 Viridian |
| PKM:STUCK | 卡住的情况 | y=28 处的悬崖向右绕行 |
| PKM:TEAM | 队伍备注 | Squirtle Lv6，Tackle + Tail Whip |

## 进度里程碑
- 选择初始宝可梦
- 从 Viridian Mart 送达包裹，获得 Pokedex
- 灰色徽章 — Brock（Rock）→ 使用 Water/Grass
- 蓝色徽章 — Misty（Water）→ 使用 Grass/Electric
- 橙色徽章 — Lt. Surge（Electric）→ 使用 Ground
- 彩虹徽章 — Erika（Grass）→ 使用 Fire/Ice/Flying
- 粉色徽章 — Koga（Poison）→ 使用 Ground/Psychic
- 金色徽章 — Sabrina（Psychic）→ 最难的道馆
- 深红徽章 — Blaine（Fire）→ 使用 Water/Ground
- 绿色徽章 — Giovanni（Ground）→ 使用 Water/Grass/Ice
- 四大天王 → 冠军！

## 停止游戏
1. 通过 POST /save 使用描述性名称保存游戏
2. 用 PKM:PROGRESS 更新记忆
3. 告诉用户："游戏已保存为 [名称]！说 'play pokemon' 即可继续。"
4. 终止服务器和隧道后台进程

## 陷阱
- 切勿下载或提供 ROM 文件
- 未检查视觉前不要发送超过 4-5 个动作
- 走出建筑后务必先侧移再向北走
- 门/楼梯传送后务必添加 wait_60 x2-3
- 通过 RAM 检测对话不可靠——用截图验证
- 在风险遭遇之前保存
- 每次重启隧道时 URL 都会变化
