---
title: "Unbroker — 自动从数据经纪商网站移除你的信息"
sidebar_label: "Unbroker"
description: "自动从数据经纪商网站移除你的信息"
---

{/* 本页面由 website/scripts/generate-skill-docs.py 从该技能的 SKILL.md 自动生成。请编辑源文件 SKILL.md，而非此页面。 */}

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

## 参考：完整 SKILL.md

:::info
以下是 Hermes 在触发此技能时加载的完整技能定义。这就是技能激活时智能体看到的指令内容。
:::

# unbroker

找出某人的个人信息(姓名、地址、电话、电子邮件、亲属)在数据经纪商和人物搜索网站上暴露的位置，然后将其移除——尽可能自动完成，仅在网站要求 CAPTCHA、政府身份证件、电话或传真时才需要人工引导步骤。可独立管理多个人。它**不会**绕过反机器人系统，**不会**在未经记录同意的情况下对任何人采取行动，也**不会**移除公开记录(选民/财产/法院)或该人自己控制的账户。

Python CLI(`scripts/pdd.py`)持有确定性状态——配置、档案 + 同意、经纪商数据库、层级规划、账簿、草稿、报告、**电子邮件发送(SMTP)、验证链接轮询(IMAP),以及自主操作队列(`next`)**。你(智能体)使用原生工具进行扫描和表单填写：用 `web_extract` 和 `browser_navigate` 进行搜索和填写网页表单，用 `cronjob` 进行周期性重新扫描。

## 自主性契约

此技能设计为**无人值守**运行。在信息采集(+ 记录同意)之后，恰好只有两个合法的人工接触点：(1)信息采集对话本身，以及 (2)运行结束时的一份合并人工任务摘要(`$PDD tasks`)。在这两者之间：

- **绝不让操作者选择配置。** `$PDD setup --auto` 会检测能力并自行挑选最自主的有效配置。
- **当 `autonomy=full`(默认值)时，绝不在单条提交前暂停**:信息采集时记录的同意即为 T0-T2 退出的长期授权。(`autonomy=assisted` 为谨慎的操作者恢复逐次提交确认——请遵循 `next` 输出中的 `confirm_first` 标志。)
- **绝不因仅限人工的工作而中断运行。** 记录下来(`record ... human_task_queued --reason "..."`)然后继续;这些内容都会在最终摘要中一次性呈现。
- **将整个运行作为对 `$PDD next <subject>` 的循环驱动**——它返回此刻应采取的确切有序操作(扫描、轮询验证、复查、父母优先退出、重新排队受阻项),外加人工摘要。执行每个操作，记录结果，重新运行 `next`，重复直到 `done_for_now`。然后呈现摘要、报告，并安排定时任务。

自主性绝不凌驾的硬性限制：未记录同意不得行动;不得超出 `disclosure_fields` 披露;不得绕过 CAPTCHA/反机器人系统;仅在有验证性重新扫描后才能标记 `confirmed_removed`。

## 何时使用

- "从数据经纪商/人物搜索网站移除我(或我家人)的数据。"
- "帮我退出"、"从 Spokeo/Whitepages 等删除我"、"在人肉搜索(doxxing)之后清理。"
- "设置周期性的隐私监控"(经纪商会重新列出人物信息)。
- 检查哪些经纪商仍在暴露某人信息以及原因。

## 前置条件

- `python`（仅使用标准库；核心引擎无需额外软件包）。
- **可选升级项**（没有这些项技能也能零配置工作；`setup --auto` 会开启它检测到的每一项，
  从 shell 环境 **以及从 `$HERMES_HOME/.env`** 读取凭据，因此 Hermes 已为其自身工具加载的密钥
  无需重新导出即可获取——每一项都会将一类人工任务转化为智能体操作）：
  - **云浏览器（推荐默认）：`BROWSERBASE_API_KEY`。** 只要存在该密钥，`setup --auto` 就会选择它，
    它就是预期的基线：真实的住宅 IP 云浏览器**将软性/托管型 CAPTCHA（Cloudflare Turnstile、
    hCaptcha/reCAPTCHA 复选框）清除视为正常操作**，因此那些数据经纪商能保持自动化（T1），
    而不会变成人工任务。这不是 CAPTCHA“破解”——没有破解服务，没有指纹伪造；只有浏览器确实
    无法通过的交互式/行为式（“硬”）挑战才会回退为人工任务。没有该密钥时，将使用普通智能体浏览器，
    软性 CAPTCHA 经纪商会降级为 T2（人工）。
  - 电子邮件自动化，两个无需凭据或另一种选项：
    - **浏览器模式（无需密码）：`setup --email-mode browser`。** 智能体通过运营者**已登录的 webmail**
      使用 `browser_*` 工具发送退出/CCPA 邮件并打开验证链接。不存储任何内容。这要求 Hermes
      指向运营者自己已登录的浏览器，而**不是**云浏览器：无头云浏览器（Browserbase）不持有 webmail
      会话，它本身在 webmail 和会话绑定的经纪商门禁（例如 PeopleConnect 引导模式）上受 Cloudflare/DataDome
      限制。通过 CDP 驱动运营者的真实 Chrome——启动
      `chrome --remote-debugging-port=9222 --user-data-dir="$HOME/.hermes/chrome-debug"`（一个专用
      调试配置档，只需登录一次 webmail，而非 Default 配置档），并将浏览器工具连接到 `127.0.0.1:9222`。
      **`$PDD cdp` 会为你启动它**（查找 Chrome/Chromium/Brave/Edge，在专用配置档上以分离模式启动，
      打印 CDP 端点；`--check` 用于测试，`--print` 用于输出命令）。参见 `references/methods.md` ->
      "Browser backends: scan vs execute"。
      如果收件箱无法访问，则回退为邮件草稿。
    - **SMTP/IMAP（存储凭据）：`EMAIL_ADDRESS` + `EMAIL_PASSWORD`**（非主流服务商还需
      `EMAIL_SMTP_HOST` / `EMAIL_IMAP_HOST`；gmail/outlook/yahoo/icloud/fastmail 会自动推断）。
      CLI 通过 `send-email` 发送，并通过 `poll-verification` 读取验证链接。`agentmail`
      技能（每经纪商别名）也计入。
  - Google Sheets 跟踪表：`google-workspace` 技能。
  - 用于隐蔽/受 Cloudflare 保护页面的 `scrapling` 技能。

## 如何运行

通过 `terminal` 工具运行一切。在此技能目录下：

```bash
PDD="python scripts/pdd.py"
```

引擎将数据存储在 `$PDD_DATA_DIR` 下（默认 `$HERMES_HOME/unbroker`），权限为 `0600`。
通过 `terminal` 运行，**而非** `execute_code`（该沙箱会清理环境并遮盖输出，这会破坏读取档案）。

## 快速参考

| 命令 | 用途 |
|---|---|
| `$PDD setup --auto` | **自主设置**：检测能力，选择最自主的有效配置（无提问） |
| `$PDD doctor` | 就绪检查：配置、经纪商数量以及哪些升级项已开启/可用 |
| `$PDD cdp [--check] [--print] [--port N]` | 为阶段 2 浏览器 + webmail 启动/检测运营者的 Chrome over CDP（专用调试配置档；发送 webmail 并清除会话绑定门禁的可靠方式） |
| `$PDD intake --full-name "..." [--alias ...] [--email ... --phone ...] [--city --state] [--prior-location "City,ST"] --consent` | 创建同意主体；捕获别名 + 多个邮箱/电话 + 先前位置；打印 `subject_id` |
| `$PDD next <subject>` | **自主循环驱动程序**：当前有条理的智能体操作 + 人工摘要 + `next_wake_at` |
| `$PDD brokers [--priority crucial]` | 列出人物搜索经纪商数据库（精选 + 实时） |
| `$PDD refresh-brokers` | 拉取最新的 BADBOOL 人物搜索列表**以及 CA 数据经纪商注册表**（缓存过期时 `next` 会自动重新排队此操作） |
| `$PDD registry [--search NAME]` | 州注册表覆盖情况（已导入 CA 约 545 个；VT/OR/TX 门户已呈现）；DROP/电子邮件通道，未扫描 |
| `$PDD drop <subject> [--filed]` | **一次性法律杠杆**：一个 CA DROP 请求即可从所有已注册经纪商处删除；`--filed` 记录它 |
| `$PDD plan <subject> [--priority crucial]` | 每个经纪商的层级 + 方法 + `search_vectors` + 需披露的确切字段 |
| `$PDD plan <subject> --batch` | **精简视图**：叠加分类账状态，按下一步操作（unscanned/found/indirect/blocked/in_progress/done）对经纪商分组，折叠所有权集群，**将 `found` 按簇父级优先排序 + 发出定制的 `parent_playbook`**，打印 `next_actions` |
| `$PDD fanout <subject> [--priority crucial] [--size 5]` | 将经纪商分批为并行 `delegate_task` 子智能体（大型运行自动执行；每批 5 个——8 个以上会超时） |
| `$PDD record <subject> <broker> <state> [--found true] [--evidence JSON] [--disclosed F --channel C] [--reason "..."]` | 更新分类账（经过验证的状态机）；**自动标记 `next_recheck_at`** |
| `$PDD show <subject> <broker>` | 读回某个案例记录的状态 + 证据 + 披露日志（以便父级无需重新推导列表 URL 即可重新验证子智能体的 `found`） |
| `$PDD send-email <subject> <broker> --listing <url> [--kind ccpa_indirect ...]` | 渲染 + 记录请求（收件人锁定为经纪商自己的地址）。**browser** 模式返回一个 `compose` 载荷，用于通过 webmail 发送（无需密码）；**programmatic** 模式通过 SMTP 发送 |
| `$PDD verify-link <subject> <broker> --text '<body>'` | **browser 模式**：从你读取的 webmail 文本中提取经纪商的验证链接（反钓鱼评分） |
| `$PDD poll-verification <subject> [--broker <id>]` | **programmatic 模式**：轮询 IMAP 获取验证链接（反钓鱼评分）；自动推进 `submitted → verification_pending` |
| `$PDD render-email <subject> <broker> --listing <url>` | 仅草拟（未配置电子邮件模式时的回退方案） |
| `$PDD due <subject>` | 重新检查窗口已到达的案例（定时任务重新扫描队列） |
| `$PDD tasks <subject>` | 一个合并的人工任务摘要（在运行结束时显示） |
| `$PDD status <subject>` | Markdown 状态报告 |
| `$PDD report <subject> --sheets` | Google Sheets 跟踪表的行 |

## 批量操作（两阶段：先全部爬取，再删除）

对于超过几家数据经纪商的情况，请以 **map → reduce → act**（映射 → 归并 → 执行）的方式运行，而不是逐家处理：

- **阶段 1 - DISCOVER（发现，只读、并行、幂等）。** 先爬取*每一家*数据经纪商，并为每一家记录一条
  判定（`found` / `not_found` / `indirect_exposure` / `blocked`）。扫描没有副作用，因此可以安全地并行化
  和重试。在行动*之前*拿到完整的暴露图谱，正是开启下方聚类去重和优先级排序的关键。**默认：父智能体
  直接驱动 `web_extract` 探测** —— 大多数人物搜索网站把姓名/电话/地址结果渲染成静态 HTML，
  `web_extract` 可在数秒内读取。只有当少数仅 JS 渲染的网站才升级到 `browser_*`，只有当工作确实
  *推理*密集（大规模同名者/亲属消歧）时才升级到 `delegate_task` 子智能体。**不要把一个长长的数据
  经纪商清单交给一个带 browser 工具集的子智能体去爬取** —— 在实际中这会反复超时（600 秒，每家约
  5-6 个经纪商，没有汇总），因为浏览器导航开销很大；得以存留的台账写入，成本是父智能体 `web_extract`
  的 10 倍。`blocked`（DataDome/Cloudflare/`antibot`）的网站也*不是*子智能体的活：记下 `blocked`，
  将其重新排入一次 stealth/云端浏览器（Browserbase）处理。子智能体的报告是自我陈述 —— 父智能体在
  采信 `found` 之前会重新抓取关键 URL 加以确认（这一点是双向的：它曾揭露一条父智能体误判为假阳性的
  真实列表）。
- **REDUCE - `$PDD plan <subject> --batch`。** 将爬取结果归并成一个按阶段组织的计划：按下一步动作
  分组，**合并归属聚类**（一次清除子项的父项移除是一次动作，而不是 N 次 —— 例如一次 Intelius/PeopleConnect
  suppression 覆盖 Truthfinder/Instant Checkmate/US Search/……），并打印 `next_actions`。当还有任何
  未扫描项时，`phase` 为 `discover`，否则为 `delete`。
- **阶段 2 - DELETE（删除，串行、不可逆）。** 按归并后的分组处理，**父项优先**：`plan --batch` 会
  将 `found` 组按聚类父项优先排序（子项最多的最先），并输出一个 `parent_playbook`，其中包含针对每个
  父项定制化、带顺序的步骤 —— 遵循该顺序和那些步骤（完整配方见 `references/methods.md` →
  “Ownership clusters - DO PARENTS FIRST”）。先做聚类父项（跳过被覆盖的子项），**在父项确认清除后
  重新扫描其子项**（它们通常会自动消失），再处理独立列表；将 `indirect_exposure` 案例作为 CCPA/GDPR
  删除个人信息的邮件发送（`send-email --kind ccpa_indirect`），并将 `blocked` 推迟到 stealth 浏览器
  处理。/ 退订会遇到 CAPTCHA、邮件验证循环和会话绑定 —— **一次一个，小心中**处理（这与扇出正好相反），
  但在 `autonomy=full` 下不要每次提交都停下来请求许可；在 `assisted` 下，每次都要确认。
  **当数据经纪商同时提供删除和 suppression 时，通常优先选择删除**（Spokeo/BeenVerified）—— 但要遵循
  记录的 `deletion.prefer`：**PeopleConnect 是例外**（`prefer: false`），对它而言删除用户数据会移除
  你的 suppression，并且无法阻止公共记录重新上架，所以应改为 suppression 并持续维护。
- **盲式退订是默认做法，而非备选方案。** 在**每一个有可用移除渠道的网站上**提交退订/删除请求，
  **即使该列表此前未被确认** —— 它只向数据经纪商自己的官方渠道披露当事人自己的标识符，因此不违反
  最小披露原则。由此得出两个推论：（1）一个匹配邮箱 + 出生日期 + 姓名并返回“无结果”的引导式流程，
  是比任何抓取都**更强的 `not_found`** —— 退订流程兼作搜索；（2）当表单对自动化不友好（硬 CAPTCHA、
  Cloudflare/DataDome、滑动验证滑块）时，**默认使用数据经纪商所声明的权利请求邮箱**（只需姓名 + 州 +
  联系邮箱），而不是记录为 `blocked`。CAPTCHA 政策：绝不要破解行为型/token/滑块验证；可以在当事人
  自己的退订页面上读取静态扭曲文本或简单算术 CAPTCHA，但如果正确作答后网站仍拒绝整份提交，就应停手
  （它在对自动化进行指纹识别）。第三方/间接记录是例外 —— 这些在行动前仍需确认。各站点的具体作战方案
  以及元搜索的空操作跳过列表见 `references/site-playbooks.md`；完整政策见 `references/methods.md`。
- **PeopleConnect 删除会抹除 suppression（永久规则）。** 一次 PeopleConnect *删除* 会清掉
  suppression，当事人会在整个联盟聚类中重新上架。如果出现一封“Your deletion request for PeopleConnect.us is
  Complete”邮件，说明 suppression 已消失 -> **重新执行 suppression 并重新验证** Control 步骤显示为
  “suppressed”。绝不要让该聚类停留在已完成删除的状态（见 `references/brokers/intelius.json`）。

子智能体的报告是自我陈述：父智能体在记录 `found` 之前、以及在执行任何删除之前，都会重新核验关键声明
（列表 URL、匹配依据）。

## 流程（自主循环）

1. **初始化（一次，无需提问）。** 运行 `$PDD setup --auto` —— 它会自行检测能力并配置最自主且有效的组合（当存在 `EMAIL_*` 凭证时使用程序化邮件，当存在相应密钥时使用 Browserbase，当存在二进制文件时使用 `age` 加密，`autonomy=full`）。然后运行 `$PDD doctor` 并将就绪状态输出展示给操作员让**其知情，而非作为问题征求同意** —— 立即继续。可以提及哪些条件可解锁更多自动化（例如邮件凭证），但不要等待。
2. **信息采集 + 授权（唯一的人类对话）。** 使用 `--consent`（以及 `--consent-method`）运行 `$PDD intake ...`。未经授权，引擎拒绝规划或行动。一次性收集所有信息 —— 姓名/别名、现居城市 + 曾居城市、电子邮箱、电话 —— 这样你就永远不需要回来提问。对于加州对象，还要阅读 `references/legal/drop.md`：`next` 会浮现一个 `drop_submit` 一次性动作，可从所有注册的数据经纪商（约 545 家）中一次性删除信息，这是杠杆率最高的单步操作。提交后，运行 `drop <subject> --filed`。对于非加州对象，注册表通过对性的 CCPA/GDPR 邮件（`registry --search`，然后 `send-email`）来覆盖；无论在哪种情况下，人物搜索网站都会直接处理。
3. **清空队列。** 循环：

   ```
   while true:
     q = $PDD next <subject>
     if q.actions is empty: break
     按顺序执行每个 action；通过 $PDD record 记录每个结果
   ```

   `next` 按顺序发出：`refresh_brokers`（过期缓存）、`fanout_scan`/`scan_inline`（第一阶段 抓取 —— 见第 4 步）、`poll_verification`（进行中的邮件确认）、`verify_removal`（到期复查）、`optout_web_form`/`optout_email_send`（第二阶段，父级优先，附带操作手册 步骤）、`indirect_email_send` 和 `stealth_rescan`。纯人工的工作永远不会作为 action 出现 —— 它会累积在 `q.human_digest` 中。在 `autonomy=full` 模式下，无需暂停即可执行 action；在 `assisted` 模式下遵守 `confirm_first`。
4. **扫描（当 `next` 如此指示时）。** 对于 `fanout_scan`：运行 `$PDD fanout <subject>` 并**为每个 `batch` 并行生成一个 `delegate_task` 子智能体，传递该批次现成的 `brief`** —— 不要你自己顺序扫描所有数据经纪商。对于 `scan_inline`：自己扫描少数几个数据经纪商。无论哪种方式，每个数据经纪商都要通过 `references/methods.md` 阶梯（`web_extract` → `site:` probe → `browser_navigate` → `scrapling`）获取**每一个** `search_vectors` 条目，404 是**不确定的**（而非 `not_found`），当设置了 `antibot` 且没有可用的隐身浏览器时记录 `blocked`，并且在记录前确认对象与同名者/亲属的区别：
   `$PDD record <subject> <broker> <found|not_found|indirect_exposure|blocked> --found <bool> --evidence '{"listing_urls":[...]}'`。
   父级智能体在信任来自子智能体的关键 `found` 声明之前会重新验证它们。
5. **退出（当 `next` 如此指示时）。** Action 已预先按父级优先排序，其 `steps` 来自每个数据经纪商记录自身的 `optout.playbook`（经字段验证；像 PeopleConnect、Whitepages、BeenVerified、Spokeo 这样的集群父级有精确的、经实况检查的配方）。**删除通常优于压制**：当一个 action 带有 `prefer_deletion` 时，完成该记录的删除通道，而不仅仅是隐藏我的列表的流程。当它带有 `prefer_suppression` 时（**PeopleConnect** —— 删除会移除你的压制设置且不会阻止重新上架），执行压制流程并保持维护；只在故意清除数据时才使用它们的 Delete 按钮。按方法：
   - **web_form** → 使用 `browser_navigate`/`browser_type`/`browser_click` 驱动 `optout_url`，仅提交 `disclosure_fields`，截图确认页面，然后执行该 action 的 `after` 记录命令。操作手册 可能以一次被删除权 `send-email` 跟进结尾 —— 去执行它（完全擦除，而不仅仅是列表压制）。
    - **email** → `$PDD send-email <subject> <broker> --kind <ccpa|gdpr|generic> --to <addr> --listing <url>` 一步完成记录 + 披露（收件人锁定为该数据经纪商记录声明的地址；`next` 根据居住地选择类型 —— 永远不要为不符合条件的人声张 CCPA/GDPR）。在**浏览器**模式下，它返回一个收件人锁定的 `compose` 载荷：通过 `browser_*` 在操作员的网页邮箱中新建一封发给 `compose.to`、内容完全为 `compose.subject`/`compose.body` 的邮件并发送（无需密码）；在**程序化**模式下，它通过 SMTP 发送。`next` 还会在存在删除邮件时通过该邮件路由人工控制的表单（电话回访/政府证件）—— 即**救援通道**（经证实有效的 Whitepages 模式）。仅此条在无法发送时，回退到 `render-email` + 摘要条目。
    - **captcha** → 软性/托管式挑战在默认云浏览器上自动通过（照常继续）；只有它无法通过的硬性交互/行为挑战才被记录为 `blocked`（重新排入隐身/操作员浏览器轮次）。永远不要使用打码服务。
    - **phone_callback / account / gov_id / fax / mail / voice (T3)** *没有删除邮件* → 永远不是智能体 action；`next` 已将这些路由到摘要中。记录它们：
      `$PDD record <subject> <broker> human_task_queued --reason "..."`。
 6. **验证（当 `next` 如此指示时）。** 在**程序化**模式下，`$PDD poll-verification <subject>` 通过 IMAP 查找已到达的确认链接（按反钓鱼评分，自动推进状态）。在**浏览器**模式下，在操作员的网页邮箱中打开该数据经纪商的确认邮件，并运行 `$PDD verify-link <subject> <broker> --text '<body>'` 来评估链接的安全性。无论哪种方式，**都在同一个浏览器中打开链接**（有几家数据经纪商会将会话绑定到打开它的浏览器），完成流程，然后记录 `awaiting_processing`。仅在验证性重新扫描显示列表已消失之后才记录 `confirmed_removed` —— 永远不要仅依据提交流程自身的确认页面。
7. **收尾（每次运行一次）。** 当 `next` 返回无 action 时：若非空则展示 `$PDD tasks <subject>`（合并的人类摘要），然后展示 `$PDD status <subject>`；若 Sheets 追踪器已开启，则通过 `google-workspace` 技能追加 `$PDD report <subject> --sheets` 行。
8. **安排下一次唤醒。** `next` 返回 `next_wake_at`（最早的到期复查时间）。创建一个 `cronjob` 为该对象重跑本技能的循环（提示语类似：*"run the unbroker loop for &lt;subject_id&gt;: `$PDD next` and execute all actions"*）。处理窗口、验证轮询和重新出现扫描都通过同一个队列流转，因此案件在零人工干预下持续向前推进。

## 陷阱

- **绝不要披露比数据经纪商已展示的更多信息。** 只提交 `disclosure_fields`。引擎从不会主动提供
  SSN/身份证号；你也不能。
- **无同意，不操作。** 引擎强制此规则；不要为了解决它去"研究"第三方。
- **`send-email` 是幂等 + 限速的。** 它会拒绝重新发送已经 `submitted` 或更进一步的案件（仅当确实
  需要重新发送时才用 `--force`），且 SMTP 发送受 `email_min_interval_seconds`（默认 20 秒）限速，
  带重试/退避。不要循环调用它来"确保"——SMTP 成功交接并不等于投递成功；到期队列重新扫描才是真正的
  确认。
- **账本写入是加锁的。** 并发运行（定时任务 + 手动）会安全串行化；如果你遇到锁超时，说明另一次运行
  正在写入中——让它完成，不要手动删除 `.lock`。
- **自主 ≠ 即兴发挥。** 完全自主意味着步与步之间不去*询问*；它不会放松任何关卡。如果数据经纪商在
  流程中途要求比计划的 `disclosure_fields` 更多，终止该案件并排队（`human_task_queued --reason`），
  而不是独自决定披露额外的 PII。
- **不要用问题打断运行。** 配置选择是 `setup --auto` 的职责；仅人工的工作进摘要。运行时唯一值得
  中途询问的是阻塞扫描的缺失身份事实（例如完全没有城市）——而这本应在录入时收集。
- **对 `pdd.py` 使用 `terminal`，不要用 `execute_code`**（密钥清洗 + 输出脱敏会破坏它）。
- **档案默认是明文**（JSON，`HERMES_HOME` 下 `0600`）。若需静态加密，运行
  `$PDD setup --encryption age`——它会生成本地 `age` 密钥并加密档案 + 账本（审计日志仅保存字段名，
  保持明文）。它防范日常/备份/提交暴露，而非整个 `HERMES_HOME` 的读取；将 `PDD_AGE_IDENTITY` 设置为
  独立卷以实现真正的密钥分离。
  `$PDD doctor` 会显示加密是否*确实*启用（而不仅仅是 `age` 是否已安装）。
- **"从免费搜索中隐藏" ≠ 已删除。** 只有在核实记录确实不存在后才标记 `confirmed_removed`；在报告中
  注明付费层级的保留情况。
- **软性 CAPTCHA 默认可通过；不要硬碰硬。** 默认云浏览器将受管/软性挑战当作正常操作通过（这些数据
  经纪商保持 T1）。对于它确实无法通过的硬交互式验证，记录 `blocked` 并让 stealth/operator-browser
  通道处理——绝不使用第三方验证码破解服务或指纹伪装。
- **数据经纪商页面会变化。** 如果流程断了，`$PDD record ... blocked` 并在 `references/brokers/` 中
  标记该数据经纪商文件以供重新验证，而不是靠猜测。
- **提交前验证非字段审核的记录。** `confidence: auto` 的记录来自解析 BADBOOL（阅读
  `optout.notes`/`optout.links`，确认真实的 opt-out URL）。`confidence: documented` 的记录（几个
  人员搜索网站）携带正确的已发布 opt-out URL，但**尚未**经过字段审核（它们对数据中心 IP 返回 403），
  因此在首次使用时通过操作员的住宅浏览器确认实际流程，然后设置 `last_verified`。字段审核的精选记录
  （无 `confidence`，例如集群父项）已核实机制并优先。

## 验证

- `scripts/run_tests.sh tests/skills/test_unbroker_skill.py`（封闭式；无网络），或
  无依赖运行器 `python tests/skills/test_unbroker_skill.py`。
- 试运行：`$PDD setup --auto && $PDD doctor && SID=$($PDD intake --full-name "Test Person"
  --email t@example.com --consent | python -c 'import sys,json;print(json.load(sys.stdin)["subject_id"])')
  && $PDD next "$SID"` 并确认就绪摘要以及有序动作队列。
