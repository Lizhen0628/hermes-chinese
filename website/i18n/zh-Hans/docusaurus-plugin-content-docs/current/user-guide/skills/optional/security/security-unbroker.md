---
title: "Unbroker — 自动从数据经纪商网站移除你的信息"
sidebar_label: "Unbroker"
description: "自动从数据经纪商网站移除你的信息"
---

{/* 本页面由 website/scripts/generate-skill-docs.py 根据该技能的 SKILL.md 自动生成。请编辑源 SKILL.md，而非本页面。 */}

# Unbroker

自动从数据经纪商网站移除你的信息。

## 技能元数据

| | |
|---|---|
| 来源 | 可选 — 使用 `hermes skills install official/security/unbroker` 安装 |
| 路径 | `optional-skills/security\unbroker` |
| 版本 | `1.0.0` |
| 作者 | SHL0MS (github.com/SHL0MS) |
| 许可证 | MIT |
| 平台 | linux, macos, windows |
| 标签 | `privacy`、`data-broker`、`opt-out`、`ccpa`、`gdpr`、`security`、`doxxing` |
| 相关技能 | [`google-workspace`](/docs/user-guide/skills/bundled/productivity/productivity-google-workspace)、[`agentmail`](/docs/user-guide/skills/optional/email/email-agentmail)、[`himalaya`](/docs/user-guide/skills/bundled/email/email-himalaya)、[`scrapling`](/docs/user-guide/skills/optional/research/research-scrapling)、[`osint-investigation`](/docs/user-guide/skills/optional/research/research-osint-investigation) |

## 参考：完整的 SKILL.md

:::info
以下是 Hermes 在该技能被触发时加载的完整技能定义。这就是技能激活时智能体看到的指令内容。
:::

# unbroker

查找某人的个人信息（姓名、地址、电话、邮箱、亲属）暴露在哪些数据经纪商和人物搜索网站上，
然后将其移除——尽可能自动完成，仅在网站要求 CAPTCHA、政府身份证件、电话或传真时提供人工
引导步骤。可独立管理多个人。它**不会**破解反机器人系统，**不会**在未记录同意的情况下对任何人
采取行动，也**不会**移除公共记录（选民/房产/法院记录）或本人控制的账户。

Python CLI（`scripts/pdd.py`）负责确定性的状态管理——配置、档案 + 同意、经纪商数据库、
层级规划、台账、草稿、报告、**邮件发送（SMTP）、验证链接轮询（IMAP），以及自主操作队列
（`next`）**。你（智能体）使用原生工具进行扫描和表单填写：用 `web_extract` 和
`browser_navigate` 搜索和填写网页表单，用 `cronjob` 进行周期性重新扫描。

## 自主性契约

此技能设计为**免手动**运行。在信息采集（+ 记录同意）之后，恰好有两个合法的人工介入点：
(1) 信息采集对话本身，以及 (2) 运行结束时的一份汇总人工任务摘要（`$PDD tasks`）。在这两者之间：

- **绝不让操作员选择配置。** `$PDD setup --auto` 会自行检测能力并选出最自主的合法配置。
- 当 `autonomy=full`（默认值）时，**绝不在逐个提交前暂停**：采集时记录的同意即为 T0-T2
  退出操作的长期授权。（`autonomy=assisted` 为谨慎的操作员恢复逐次提交确认——需遵守 `next`
  输出中的 `confirm_first` 标记。）
- **绝不因仅限人工的工作而中断运行。** 将其记录
  （`record ... human_task_queued --reason "..."`）并继续；所有内容都会在最终摘要中一次性呈现。
- **将整个运行作为对 `$PDD next <subject>` 的循环来驱动**——它会返回此刻要执行的精确有序操作
  （扫描、轮询验证、重新检查、按父级优先退出、重新排队被阻塞项），以及人工摘要。执行每一项
  操作，记录结果，再次运行 `next`，重复直到 `done_for_now`。然后呈现摘要、报告，并安排定时任务。

自主性永不凌驾的硬性限制：未经记录同意不得行动，不得披露超出 `disclosure_fields` 的信息，
不得绕过 CAPTCHA/反机器人系统，且仅在验证性重新扫描后才可标记 `confirmed_removed`。

## 适用场景

- “从数据经纪商/人物搜索网站移除我（或我家人）的数据。”
- “帮我退出”、“把我从 Spokeo/Whitepages 等网站删除”、“遭遇人肉搜索后进行清理。”
- “设置周期性隐私监控”（经纪商会重新列出个人信息）。
- 检查哪些经纪商仍在暴露某人信息以及原因。

## 前置条件

- `python`（仅标准库；核心引擎无需额外包）。
- **可选升级项**（没有这些技能也能零配置运行；`setup --auto` 会开启它检测到的每一项，从 shell 环境变量**以及 `$HERMES_HOME/.env`** 中读取凭据，因此 Hermes 已为其自身工具加载的密钥无需重新导出即可使用——每一项都会将一类人工任务转换为智能体操作）：
  - **云浏览器（推荐默认）：`BROWSERBASE_API_KEY`。** 只要该密钥存在，`setup --auto` 就会选择它，它就是预期基线：真实的住宅 IP 云浏览器**将软/托管型 CAPTCHA（Cloudflare Turnstile、hCaptcha/reCAPTCHA 复选框）作为正常操作通过**，因此这些数据经纪商保持自动化（T1），而不会变成人工任务。这不是 CAPTCHA“破解”——没有解题服务，没有指纹伪装；只有浏览器确实无法通过的交互式/行为式（"hard"）挑战才会回退为人工任务。没有该密钥时，将使用普通智能体浏览器，软 CAPTCHA 经纪商会降至 T2（人工）。
  - 邮件自动化，两个有凭据或无凭据的选项：
    - **浏览器模式（无需密码）：`setup --email-mode browser`。** 智能体使用 `browser_*` 工具，通过运营者**已登录的网页邮箱**发送退出/CCPA 邮件并打开验证链接。不存储任何内容。这要求 Hermes 指向运营者自己已登录的浏览器，**而非**云浏览器：无头云浏览器（Browserbase）不持有网页邮箱会话，而且本身在网页邮箱和会话绑定的经纪商关卡（例如 PeopleConnect 引导模式）上受 Cloudflare/DataDome 门控。通过 CDP 驱动运营者的真实 Chrome——启动 `chrome --remote-debugging-port=9222 --user-data-dir="$HOME/.hermes/chrome-debug"`（一个专用的调试配置档，登录网页邮箱一次，而非 Default 配置档）并将浏览器工具连接到 `127.0.0.1:9222`。**`$PDD cdp` 会为你启动它**（查找 Chrome/Chromium/Brave/Edge，在专用配置档上以分离方式启动，打印 CDP 端点；`--check` 用于测试，`--print` 用于查看命令）。参见 `references/methods.md` -> "Browser backends: scan vs execute"。如果收件箱无法访问，邮件会退回为草稿。
    - **SMTP/IMAP（存储凭据）：`EMAIL_ADDRESS` + `EMAIL_PASSWORD`**（非主流服务商再加 `EMAIL_SMTP_HOST` / `EMAIL_IMAP_HOST`；gmail/outlook/yahoo/icloud/fastmail 可自动推断）。CLI 通过 `send-email` 发送，并通过 `poll-verification` 读取验证链接。`agentmail` 技能（按经纪商的别名）也算数。
  - Google Sheets 跟踪器：`google-workspace` 技能。
  - `scrapling` 技能，用于隐蔽访问/受 Cloudflare 保护的页面。

## 如何运行

全部通过 `terminal` 工具运行。在本技能目录下：

```bash
PDD="python scripts/pdd.py"
```

引擎将数据存储在 `$PDD_DATA_DIR` 下（默认为 `$HERMES_HOME/unbroker`），权限为
`0600`。通过 `terminal` 运行，**而非** `execute_code`（该沙箱会清理环境变量并遮蔽输出，导致无法读取案卷）。

## 快速参考

| 命令 | 用途 |
|---|---|
| `$PDD setup --auto` | **自主设置**：检测能力，选择最自主的有效配置（无提问） |
| `$PDD doctor` | 就绪检查：配置、经纪商数量以及哪些升级项已开启/可用 |
| `$PDD cdp [--check] [--print] [--port N]` | 启动/检测运营者的 Chrome over CDP，用于第二阶段浏览器 + 网页邮箱（专用调试配置档；发送网页邮箱并清除会话绑定关卡的可可靠方式） |
| `$PDD intake --full-name "..." [--alias ...] [--email ... --phone ...] [--city --state] [--prior-location "City,ST"] --consent` | 创建同意的主体；捕获别名 + 多个邮箱/电话 + 先前位置；打印 `subject_id` |
| `$PDD next <subject>` | **自主循环驱动器**：当前的按序智能体操作 + 人工摘要 + `next_wake_at` |
| `$PDD brokers [--priority crucial]` | 列出人物搜索经纪商数据库（精选 + 实时） |
| `$PDD refresh-brokers` | 拉取最新的 BADBOOL 人物搜索列表**以及 CA 数据经纪商注册表**（当缓存过期时，`next` 会自动重新入队此操作） |
| `$PDD registry [--search NAME]` | 州注册表覆盖范围（已录入 CA 约 545 个；VT/OR/TX 门户已呈现）；DROP/邮件通道，非扫描 |
| `$PDD drop <subject> [--filed]` | **一次性法律杠杆**：一份 CA DROP 请求即可从所有已注册经纪商处删除；`--filed` 会记录它 |
| `$PDD plan <subject> [--priority crucial]` | 按经纪商的层级 + 方法 + `search_vectors` + 要披露的确切字段 |
| `$PDD plan <subject> --batch` | **精简视图**：叠加台账状态，按下一操作（unscanned/found/indirect/blocked/in_progress/done）对经纪商分组，合并所有权集群，**按簇父级优先排列 `found` 并输出定制的 `parent_playbook`**，打印 `next_actions` |
| `$PDD fanout <subject> [--priority crucial] [--size 5]` | 将经纪商分批并行到 `delegate_task` 子智能体（大型运行自动执行；5 个一批——8 个以上会超时） |
| `$PDD record <subject> <broker> <state> [--found true] [--evidence JSON] [--disclosed F --channel C] [--reason "..."]` | 更新台账（经过验证的状态机）；**自动盖上 `next_recheck_at` 时间戳** |
| `$PDD show <subject> <broker>` | 读回某个案件已记录的状态 + 证据 + 披露日志（这样父级可重新验证子智能体的 `found`，而无需重新推导列表 URL） |
| `$PDD send-email <subject> <broker> --listing <url> [--kind ccpa_indirect ...]` | 渲染 + 记录请求（收件人锁定为经纪商自己的地址）。**browser** 模式返回 `compose` 载荷，供通过网页邮箱发送（无需密码）；**programmatic** 模式通过 SMTP 发送 |
| `$PDD verify-link <subject> <broker> --text '<body>'` | **浏览器模式**：从你读取的网页邮箱文本中提取经纪商的验证链接（反钓鱼评分） |
| `$PDD poll-verification <subject> [--broker <id>]` | **编程模式**：轮询 IMAP 获取验证链接（反钓鱼评分）；自动将 `submitted → verification_pending` 推进 |
| `$PDD render-email <subject> <broker> --listing <url>` | 仅生成草稿（未配置邮件模式时的回退方案） |
| `$PDD due <subject>` | 重检窗口已到达的案件（cron 重扫队列） |
| `$PDD tasks <subject>` | 一份合并的人工任务摘要（在运行结束时呈现） |
| `$PDD status <subject>` | Markdown 状态报告 |
| `$PDD report <subject> --sheets` | 用于 Google Sheets 跟踪器的行 |

## 批量操作（两阶段：先全部爬取，再删除）

对于超过几个数据经纪商的情况，请按**map → reduce → act**（映射 → 归并 → 行动）的方式运行，而不是逐家逐个处理：

- **阶段 1 - 发现（只读、并行、幂等）。** 先爬取*每一个*数据经纪商，为每一个记录一个判定（`found` / `not_found` / `indirect_exposure` / `blocked`）。扫描没有副作用，因此可以安全地并行化和重试。在行动*之前*获取完整的暴露图谱，正是它解锁了下面所述的集群去重和优先级排序。**默认：由父智能体直接驱动 `web_extract` 探测** - 大多数人物搜索网站将姓名/电话/地址结果渲染为静态 HTML，`web_extract` 在几秒内即可读取。仅对少数纯 JS 站点升级到 `browser_*`，仅在真正*推理*繁重的工作（大规模同名者/亲属消歧）上使用 `delegate_task` 子智能体。**不要把一个包含一长串数据经纪商的列表交给一个带 browser 工具集的子智能体去爬取** - 实践中这会反复超时（600 秒，每个约 5-6 家经纪商，无摘要），因为浏览器导航开销很重；保留下来的账本写入成本是父智能体 `web_extract` 的 10 倍。`blocked`（DataDome/Cloudflare/`antibot`）的站点*也不是*子智能体该干的活：记录 `blocked` 并将其重新排队，交由隐身/云浏览器（Browserbase）处理。子智能体报告属于自述 - 父智能体在采信之前会重新抓取关键 URL 来确认 `found`（这一点是双向的：它曾发现一个父智能体误判为假阳性的真实刊载记录）。
- **REDUCE - `$PDD plan <subject> --batch`。** 将爬取结果压缩为一个面向阶段的计划：按下一步行动分组，**折叠所有权集群**（一个清除子项的父级删除是**一个**行动，而非 N 个 - 例如一次 Intelius/PeopleConnect 抑制即可覆盖 Truthfinder/Instant Checkmate/US Search/……），并打印 `next_actions`。在任何尚未扫描的内容存在时，`phase` 为 `discover`，否则为 `delete`。
- **阶段 2 - 删除（顺序执行、不可逆）。** 按归并后的分组处理，**先处理父级**：`plan --batch` 将 `found` 分组排序为集群父级优先（子项最多的在前），并输出带有针对每个父级定制且有序步骤的 `parent_playbook` - 遵循该顺序与那些步骤（完整配方见 `references/methods.md` → “Ownership clusters - DO PARENTS FIRST”）。先处理集群父级（跳过已被覆盖的子项），**在每个父级确认后重新扫描其子项**（它们通常会掉落），然后处理独立的刊载记录；对于 `indirect_exposure` 案例，按 CCPA/GDPR 发送删除我的 PII（个人身份信息）的电子邮件（`send-email --kind ccpa_indirect`）；将 `blocked` 延迟到隐身浏览器那一次处理。退出（Opt-out）会遇到 CAPTCHA、邮件验证循环和会话绑定 - 请**一次一个、小心地**处理它们（这与扇出恰好相反），但在 `autonomy=full` 下**不要**为每一次提交都停下来请求许可；在 `assisted` 下，逐次确认。**在数据经纪商同时提供删除和抑制两种方式时，通常优先选择删除**（Spokeo/BeenVerified）- 但遵循记录中的 `deletion.prefer`：**PeopleConnect 是例外**（`prefer: false`），删除你的用户数据会移除你的抑制，且无法阻止公共记录被重新刊载，因此你在此处是抑制并维护。
- **盲式退出（Blind opt-out）是默认做法，而非后备方案。** 在**每一个有可访问移除渠道的站点**上提交退出/删除，**即使某条刊载记录此前未被确认** - 它只将主体自身的标识符披露给数据经纪商自身的官方渠道，因此不违反最小披露原则。两个推论：（1）一个匹配 email+DOB+name 并显示“无结果”的引导式流程，是比任何抓取**更强的 `not_found`**证据 - 该退出流程兼作搜索；（2）当表单对自动化不友好时（高难度 CAPTCHA、Cloudflare/DataDome、滑动验证滑块），**默认使用数据经纪商注明的权利请求邮箱**（仅姓名+州+联系邮箱），而不是记录 `blocked`。CAPTCHA 政策：永远不要破解行为/令牌/滑块验证；在主体自己的退出流程中，可以读取静态的变形文本或普通算术 CAPTCHA，但如果站点在给出正确答案后仍拒绝整个提交，则就此打住（它正对自动化进行指纹识别）。第三方/间接记录是例外 - 仍须在行动前确认它们。逐站点的攻略以及元搜索空操作跳过清单见 `references/site-playbooks.md`；完整政策见 `references/methods.md`。
- **PeopleConnect 删除会擦除抑制（永久规则）。** PeopleConnect 的*删除*会擦除抑制，随后主体会在整个关联集群中被重新刊载。如果出现“Your deletion request for PeopleConnect.us is Complete”（您对 PeopleConnect.us 的删除请求已完成）此类邮件，说明抑制已丢失 -> **重新运行抑制并重新验证** Control 步骤显示为“不可被（suppressed）”。永不要把这个集群停留在一次已完成的删除上（见 `references/brokers/intelius.json`）。

子智能体报告属于自述：父智能体在记录 `found` 之前以及在任何删除之前，都会重新验证关键说法（刊载记录 URL、匹配依据）。

## 过程（自主循环）

1. **初始化（一次，无需询问）。** 运行 `$PDD setup --auto` —— 它会自行检测能力并配置最自主的有效组合（当存在 `EMAIL_*` 凭据时使用程序化邮件，当存在其密钥时使用 Browserbase，当存在该二进制文件时使用 `age` 加密，`autonomy=full`）。然后运行 `$PDD doctor`，并将就绪状态输出**作为信息展示，而不是作为问题**——立即继续推进。提及哪些条件可以解锁更多自动化（例如邮件凭据），但不要等待。
2. **录入 + 授权（唯一的一次人类对话）。** 运行 `$PDD intake ...`，带上 `--consent`（以及 `--consent-method`）。没有授权，引擎会拒绝规划或行动。一次性收集全部信息——姓名/别名、当前与以往城市、邮箱、电话——以免后续不得不回来提问。对于加利福尼亚州的对象，还需阅读 `references/legal/drop.md`：`next` 会呈现一个 `drop_submit` 一次性操作，可一次性从所有已注册数据经纪商（约 545 家）中删除，这是单个最具杠杆作用的动作。归档后，运行 `drop <subject> --filed`。对于非加州对象，注册表通过针对性的 CCPA/GDPR 邮件覆盖（`registry --search`，然后 `send-email`）；无论哪种情况，人物搜索网站都直接处理。
3. **排空队列。** 循环：

   ```
   while true:
     q = $PDD next <subject>
     if q.actions is empty: break
     execute EVERY action in order; record each outcome via $PDD record
   ```

   `next` 会按顺序发出：`refresh_brokers`（陈旧缓存）、`fanout_scan`/`scan_inline`（阶段 1 爬取——见第 4 步）、`poll_verification`（进行中的邮件确认）、`verify_removal`（到期的重新检查）、`optout_web_form`/`optout_email_send`（阶段 2，父级优先，带 playbook 步骤）、`indirect_email_send` 和 `stealth_rescan`。仅限人工的工作永远不会作为动作出现——它累积在 `q.human_digest` 中。在 `autonomy=full` 模式下，不间断地执行动作；在 `assisted` 模式下遵守 `confirm_first`。

4. **扫描（当 `next` 要求时）。** 对于 `fanout_scan`：运行 `$PDD fanout <subject>`，并**针对每个 `batch` 并行生成一个 `delegate_task` 子智能体，传入该 batch 已备好的 `brief`**——不要自己按顺序扫描所有经纪商。对于 `scan_inline`：自己扫描少数几个经纪商。无论哪种方式，每个经纪商都通过 `references/methods.md` 的阶梯（`web_extract` → `site:` 探测 → `browser_navigate` → `scrapling`）处理**每一个** `search_vectors` 条目，404 是 INCONCLUSIVE（而非 `not_found`），当设置了 `antibot` 且没有可用的隐身浏览器时记录为 `blocked`，并且在记录前确认对象与同名者/亲属的区别：

   `$PDD record <subject> <broker> <found|not_found|indirect_exposure|blocked> --found <bool> --evidence '{"listing_urls":[...]}'`。

   父级在信任子智能体的关键 `found` 结论之前会重新验证它们。

5. **退出（当 `next` 要求时）。** 动作会预先排好顺序、父级优先，`steps` 来自每个经纪商记录自身的 `optout.playbook`（字段已验证；像 PeopleConnect、Whitepages、BeenVerified、Spokeo 这样的集群父级拥有精确、实时核验过的配方）。**删除通常优于抑制**：当一个动作带有 `prefer_deletion` 时，完成该记录的 DELETION 通道，而不只是隐藏列表的流程。当它改为带有 `prefer_suppression` 时（**PeopleConnect**——删除会移除你的抑制且无法阻止重新上架），执行抑制流程并持续维护；只在有意清除数据时使用其 Delete 按钮。按方法：

   - **web_form** → 使用 `browser_navigate`/`browser_type`/`browser_click` 驱动 `optout_url`，仅提交 `disclosure_fields`，截图确认页面，然后执行该动作的 `after` 记录命令。playbook 可能以应得删除权的 `send-email` 后续步骤收尾——执行它（完全擦除，而不仅仅是列表抑制）。
   - **email** → `$PDD send-email <subject> <broker> --kind <ccpa|gdpr|generic> --to <addr> --listing <url>` 一步完成记录 + 披露（收件人锁定为经纪商记录声明的地址；`next` 根据居住地选择类型——永远不要为一个不符合条件的人声称 CCPA/GDPR）。在 **browser** 模式下，它返回一个收件人锁定的 `compose` 载荷：通过 `browser_*` 在操作员的 webmail 中创建一条新消息，`compose.to`、`compose.subject`/`compose.body` 完全照搬并发送（无需密码）；在 **programmatic** 模式下，它通过 SMTP 发送。`next` 还会将受人工限制的表单（电话回调/政府 ID）路由到经纪商的删除邮件（若存在）——这就是**救援通道**（经核验的 Whitepages 模式）。仅草拟模式回退到 `render-email` + 一条 digest 条目。
   - **captcha** → 软性/托管的挑战在默认云浏览器上自动解决（照常继续）；只有它无法通过的硬性交互式/行为式挑战才记录为 `blocked`（重新排队等待隐身/操作员浏览器一档处理）。绝不使用打码服务。
   - **phone_callback / account / gov_id / fax / mail / voice (T3)** *没有删除邮件* → 永远不会成为智能体动作；`next` 已将这些路由到 digest。记录它们：`$PDD record <subject> <broker> human_task_queued --reason "..."`。

6. **验证（当 `next` 要求开展时）。** 在 **programmatic** 模式下，`$PDD poll-verification <subject>` 通过 IMAP 查找已到达的确认链接（经反钓鱼评分，自动推进状态）。在 **browser** 模式下，在操作员的 webmail 中打开经纪商的确认邮件并运行 `$PDD verify-link <subject> <broker> --text '<body>'` 来对链接评分。无论哪种方式，**在同一浏览器中打开该链接**（若干经纪商将验证会话绑定到打开它的浏览器），完成该流程，然后记录 `awaiting_processing`。只有验证性重扫显示列表已消失后，才记录 `confirmed_removed`——绝不能仅凭提交流程自身的确认页面。

7. **收尾（每次运行一次）。** 当 `next` 返回没有动作时：如果 `$PDD tasks <subject>`（合并后的人工 digest）非空，则呈现它，然后 `$PDD status <subject>`；如果 Sheets 追踪器开启，通过 `google-workspace` 技能追加 `$PDD report <subject> --sheets` 行。

8. **安排下一次唤醒。** `next` 返回 `next_wake_at`（最早到期的重新检查）。创建一个 `cronjob`，为该对象重新运行本技能的循环（一个类似 *“run the unbroker loop for &lt;subject_id&gt;: `$PDD next` and execute all actions”* 的提示词）。处理窗口、验证轮询和重新出现清扫都流经同一队列，因此案件零人工介入即可持续推进。

## 陷阱

- **绝不披露超出数据经纪商已展示的信息。** 只提交 `disclosure_fields`。引擎绝不会主动提供 SSN/身份证号；你也绝不能。
- **无同意，不操作。** 引擎强制执行此规则；不要为了「调研」第三方而绕过它。
- **`send-email` 具有幂等性且受速率限制。** 它拒绝重新发送已处于 `submitted` 或更后续状态的案件（仅当确实需要重新发送时才使用 `--force`），且 SMTP 发送受 `email_min_interval_seconds`（默认 20 秒）节制，并带有重试/退避机制。不要循环调用它以「确保成功」——成功的 SMTP 交接并不等同于送达；到期队列重扫才是真正的确认。
- **账本写入是加锁的。** 并发运行（定时任务 + 手动）会安全地串行化；如果你看到锁超时，说明另一次运行正在写入——让它完成，不要手动删除 `.lock`。
- **自主运行 ≠ 即兴发挥。** 完全自主意味着在步骤之间不*询问*；它不会放松任何关卡。如果数据经纪商在流程中途要求 META 超出计划的 `disclosure_fields`，停止该案件并将其排队（`human_task_queued --reason`），而不是自行决定披露额外的 PII。
- **不要用问题打断运行。** 配置选择是 `setup --auto` 的职责；仅人类才能完成的工作进入摘要。唯一有理由的中途提问是阻碍扫描的缺失身份信息（例如完全没有城市）——而这本应在接收阶段就收集完毕。
- **对 `pdd.py` 使用 `terminal`，而非 `execute_code`**（密钥擦除 + 输出脱敏会破坏它）。
- **档案默认是明文的**（JSON，在 `HERMES_HOME` 下权限为 `0600`）。如需静态加密，运行 `$PDD setup --encryption age`——它会生成本地的 `age` 密钥并加密档案 + 账本（审计日志只保存字段名，保持明文）。它能防范日常/备份/提交暴露，但不能防范对整个 `HERMES_HOME` 的读取；将 `PDD_AGE_IDENTITY` 设置到独立卷以实现真正的密钥隔离。`$PDD doctor` 显示加密是否*实际*启用（而不仅仅是 `age` 是否已安装）。
- **「从免费搜索中隐藏」 ≠ 已删除。** 只有在核实记录确实消失后，才标记 `confirmed_removed`；在报告中注明付费层级的保留情况。
- **软验证码默认可以通过；不要硬刚硬验证码。** 默认云浏览器将托管/软挑战视为正常操作（这些数据经纪商保持 T1）。对于确实无法通过的硬交互式挑战，记录 `blocked` 并交由隐身/操作员浏览器流程处理——绝不使用第三方验证码解析服务或指纹伪装。
- **数据经纪商页面会变化。** 如果流程中断，用 `$PDD record ... blocked` 记录并标记 `references/brokers/` 中的数据经纪商文件以供重新验证，而不是猜测。
- **提交前验证非字段核实的记录。** `confidence: auto` 的记录来自 BADBOOL 解析（阅读 `optout.notes`/`optout.links`，确认真正的退出 URL）。`confidence: documented` 的记录（若干人物搜索网站）携带正确的已发布退出 URL，但**未**经过字段核实（它们对数据中心 IP 返回 403），因此首次使用时通过操作员的住宅浏览器确认实时流程，然后设置 `last_verified`。字段核实过的精选记录（无 `confidence`，例如集群父级）已完成机制检查，优先采用。

## 验证

- `scripts/run_tests.sh tests/skills/test_unbroker_skill.py`（封闭式；无网络），或使用无依赖运行器 `python tests/skills/test_unbroker_skill.py`。
- 试运行：`$PDD setup --auto && $PDD doctor && SID=$($PDD intake --full-name "Test Person"
  --email t@example.com --consent | python -c 'import sys,json;print(json.load(sys.stdin)["subject_id"])')
  && $PDD next "$SID"`，确认出现就绪摘要以及有序的操作队列。
