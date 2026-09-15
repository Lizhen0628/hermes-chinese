---
title: "Minecraft 整合包服务器 — 托管模组化 Minecraft 服务器（CurseForge、Modrinth）"
sidebar_label: "Minecraft 整合包服务器"
description: "托管模组化 Minecraft 服务器（CurseForge、Modrinth）"
---

{/* 此页面由 website/scripts/generate-skill-docs.py 根据该技能的 SKILL.md 自动生成。请编辑源 SKILL.md，而非此页面。 */}

# Minecraft 整合包服务器

托管模组化 Minecraft 服务器（CurseForge、Modrinth）。

## 技能元数据

| | |
|---|---|
| 来源 | 可选 — 使用 `hermes skills install official/gaming/minecraft-modpack-server` 安装 |
| 路径 | `optional-skills/gaming\minecraft-modpack-server` |
| 版本 | `1.0.0` |
| 作者 | Teknium (teknium1)、Hermes Agent |
| 许可证 | MIT |
| 平台 | linux、macos |

## 参考：完整 SKILL.md

:::info
以下是 Hermes 在该技能被触发时加载的完整技能定义。这就是技能激活时智能体所看到的指令内容。
:::

# Minecraft 整合包服务器搭建

## 适用场景
- 用户想通过服务器包 zip 搭建模组化 Minecraft 服务器
- 用户需要 NeoForge/Forge 服务器配置方面的帮助
- 用户询问 Minecraft 服务器性能调优或备份相关问题

## 先收集用户偏好
在开始搭建前，请询问用户：
- **服务器名称 / MOTD** — 在服务器列表中显示什么？
- **种子** — 指定种子还是随机？
- **难度** — 和平 / 简单 / 普通 / 困难？
- **游戏模式** — 生存 / 创造 / 冒险？
- **在线模式** — true（Mojang 验证、正版账号）还是 false（便于局域网/离线）？
- **玩家数量** — 预计多少玩家？（影响内存与视距调优）
- **内存分配** — 还是由智能体根据模组数量与可用内存自行决定？
- **视距 / 模拟距离** — 还是由智能体根据玩家数量与硬件自行决定？
- **PvP** — 开启还是关闭？
- **白名单** — 开放服务器还是仅限白名单？
- **备份** — 需要自动备份吗？多久一次？

如果用户不在意，可使用合理的默认值，但生成配置前务必先询问。

## 步骤

### 1. 下载并检查整合包
```bash
mkdir -p ~/minecraft-server
cd ~/minecraft-server
wget -O serverpack.zip "<URL>"
unzip -o serverpack.zip -d server
ls server/
```
寻找：`startserver.sh`、安装器 jar（neoforge/forge）、`user_jvm_args.txt`、`mods/` 文件夹。
检查脚本以确定：模组加载器类型、版本以及所需的 Java 版本。

### 2. 安装 Java
- Minecraft 1.21+ → Java 21：`sudo apt install openjdk-21-jre-headless`
- Minecraft 1.18-1.20 → Java 17：`sudo apt install openjdk-17-jre-headless`
- Minecraft 1.16 及以下 → Java 8：`sudo apt install openjdk-8-jre-headless`
- 验证：`java -version`

### 3. 安装模组加载器
大多数服务器包都带有安装脚本。使用 INSTALL_ONLY 环境变量可在不启动的情况下安装：
```bash
cd ~/minecraft-server/server
ATM10_INSTALL_ONLY=true bash startserver.sh
# 或者对于通用 Forge 整合包：
# java -jar forge-*-installer.jar --installServer
```
这会下载库文件、修补服务器 jar 等。

### 4. 接受 EULA
```bash
echo "eula=true" > ~/minecraft-server/server/eula.txt
```

### 5. 配置 server.properties
模组化/局域网的关键设置：
```properties
motd=\u00a7b\u00a7lServer Name \u00a7r\u00a78| \u00a7aModpack Name
server-port=25565
online-mode=true          # false for LAN without Mojang auth
enforce-secure-profile=true  # match online-mode
difficulty=hard            # most modpacks balance around hard
allow-flight=true          # REQUIRED for modded (flying mounts/items)
spawn-protection=0         # let everyone build at spawn
max-tick-time=180000       # modded needs longer tick timeout
enable-command-block=true
```

性能设置（根据硬件调整）：
```properties
# 2 players, beefy machine:
view-distance=16
simulation-distance=10

# 4-6 players, moderate machine:
view-distance=10
simulation-distance=6

# 8+ players or weaker hardware:
view-distance=8
simulation-distance=4
```

### 6. 调优 JVM 参数（user_jvm_args.txt）
根据玩家数量与模组数量调整内存。模组化经验法则：
- 100-200 个模组：6-12GB
- 200-350+ 个模组：12-24GB
- 至少为操作系统/其他任务保留 8GB 空闲

```
-Xms12G
-Xmx24G
-XX:+UseG1GC
-XX:+ParallelRefProcEnabled
-XX:MaxGCPauseMillis=200
-XX:+UnlockExperimentalVMOptions
-XX:+DisableExplicitGC
-XX:+AlwaysPreTouch
-XX:G1NewSizePercent=30
-XX:G1MaxNewSizePercent=40
-XX:G1HeapRegionSize=8M
-XX:G1ReservePercent=20
-XX:G1HeapWastePercent=5
-XX:G1MixedGCCountTarget=4
-XX:InitiatingHeapOccupancyPercent=15
-XX:G1MixedGCLiveThresholdPercent=90
-XX:G1RSetUpdatingPauseTimePercent=5
-XX:SurvivorRatio=32
-XX:+PerfDisableSharedMem
-XX:MaxTenuringThreshold=1
```

### 7. 开放防火墙
```bash
sudo ufw allow 25565/tcp comment "Minecraft Server"
```
检查：`sudo ufw status | grep 25565`

### 8. 创建启动脚本
```bash
cat > ~/start-minecraft.sh << 'EOF'
#!/bin/bash
cd ~/minecraft-server/server
java @user_jvm_args.txt @libraries/net/neoforged/neoforge/<VERSION>/unix_args.txt nogui
EOF
chmod +x ~/start-minecraft.sh
```
注意：对于 Forge（而非 NeoForge），args 文件路径不同。请在 `startserver.sh` 中查看确切路径。

### 9. 设置自动备份
创建备份脚本：
```bash
cat > ~/minecraft-server/backup.sh << 'SCRIPT'
#!/bin/bash
SERVER_DIR="$HOME/minecraft-server/server"
BACKUP_DIR="$HOME/minecraft-server/backups"
WORLD_DIR="$SERVER_DIR/world"
MAX_BACKUPS=24
mkdir -p "$BACKUP_DIR"
[ ! -d "$WORLD_DIR" ] && echo "[BACKUP] No world folder" && exit 0
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="$BACKUP_DIR/world_${TIMESTAMP}.tar.gz"
echo "[BACKUP] Starting at $(date)"
tar -czf "$BACKUP_FILE" -C "$SERVER_DIR" world
SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "[BACKUP] Saved: $BACKUP_FILE ($SIZE)"
BACKUP_COUNT=$(ls -1t "$BACKUP_DIR"/world_*.tar.gz 2>/dev/null | wc -l)
if [ "$BACKUP_COUNT" -gt "$MAX_BACKUPS" ]; then
    REMOVE=$((BACKUP_COUNT - MAX_BACKUPS))
    ls -1t "$BACKUP_DIR"/world_*.tar.gz | tail -n "$REMOVE" | xargs rm -f
    echo "[BACKUP] Pruned $REMOVE old backup(s)"
fi
echo "[BACKUP] Done at $(date)"
SCRIPT
chmod +x ~/minecraft-server/backup.sh
```

添加每小时定时任务：
```bash
(crontab -l 2>/dev/null | grep -v "minecraft/backup.sh"; echo "0 * * * * $HOME/minecraft-server/backup.sh >> $HOME/minecraft-server/backups/backup.log 2>&1") | crontab -
```

## 常见坑点
- 模组化服务器务必设置 `allow-flight=true` — 否则带有喷气背包/飞行的模组会把玩家踢出
- `max-tick-time=180000` 或更高 — 模组化服务器在世界生成期间往往会出现长刻
- 首次启动非常慢（大型整合包可能需要数分钟）— 不要惊慌
- 首次启动时的“Can't keep up!”警告是正常的，初始区块生成完成后会平稳
- 如果 online-mode=false，也要设置 enforce-secure-profile=false，否则客户端会被拒绝
- 整合包的 startserver.sh 通常带有自动重启循环 — 请创建一个不带该循环的干净启动脚本
- 删除 world/ 文件夹即可用新种子重新生成
- 一些整合包使用环境变量来控制行为（例如 ATM10 使用 ATM10_JAVA、ATM10_RESTART、ATM10_INSTALL_ONLY）

## 验证
- `pgrep -fa neoforge` 或 `pgrep -fa minecraft` 检查是否正在运行
- 查看日志：`tail -f ~/minecraft-server/server/logs/latest.log`
- 在日志中寻找 “Done (Xs)!” = 服务器已就绪
- 测试连接：玩家在多人游戏中添加服务器 IP
