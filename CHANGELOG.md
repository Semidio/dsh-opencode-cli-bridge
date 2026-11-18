# Changelog

## 0.1.6（2026-11-18）

### 调整

- 设置导航与设置面板标题由 `OpenCode Bridge` 改为 **OpenCode**（Web 侧栏卡片仍叫 OpenCode Bridge）。
- **深浅外观适配**：面板样式全部改用 DSH 皮肤 token（`--dsw-alias-label-*`、`--dsw-alias-bg-*`、
  `--dsw-alias-border-*`、`--dsw-alias-state-*`），不再硬编码深色专用白字，浅色模式下可正常阅读。
- 设置分区形态去掉整页居中外壳，交给设置对话框内容列滚动。

### 仓库

- 源码工作目录迁移到 `C:\Users\Semidio\Documents\dsh-opencode-cli-bridge`。

## 0.1.4（2026-11-17）

### 调整

- **Desktop 版改为设置面板**：检测到 Desktop 载体（`globalThis.dshDesktop`）时，
  面板注册进「设置」对话框的 `settings.section`（设置 → **OpenCode Bridge**），
  不再占用左侧栏；Web 版保持原左侧栏卡片 + 主面板。
- 设置分区内使用独立的紧凑样式（去掉整页背景与居中外壳，交给设置内容列滚动）。

## 0.1.2（2026-11-17）

### 修复

- **模型列表只剩一个模型**：`models.json` 的 `static` 保底快照此前按 24h TTL 当作新鲜缓存，
  一次瞬时抓取失败会把目录锁成 `STATIC_MODELS`（只有 `opencode/mimo-v2.6-flash-free`）。
  现在 `static` 缓存一律视为过期，下次加载立即重试 CLI，成功后升级为 `cli` 缓存。
- **面板显示名**：`OC-bridge` → **OpenCode Bridge**（侧栏卡片、面板标题、零文本兜底提示语同步）。

## 0.1.1（2026-11-17）

### 兼容性

- **OpenCode v2 适配**（实测 v2.3.0）：
  - 移除 `--dir`：工作区改由 `spawn` 的 `cwd` 承载（v2 传 `--dir` 直接报
    `Unrecognized flag: --dir in command opencode run`，曾导致全部请求 `PROTOCOL_ERROR`）；
  - 移除 `--variant`：思考强度改为写进 `--model provider/model#variant`；
  - `tokens.total` 在 v2 的 `step_finish` 中不再输出，改为按
    `input + output + reasoning + cache.read` 回算，避免 usage/cost 归零；
  - 事件流 `step_start / text / reasoning / tool_use / tool_result / step_finish` 形状未变，
    映射与 chunk 转换逻辑保持。
- **DSH Desktop 兼容**：
  - 插件可安装到 Desktop 的独立 `desktop` profile（`~/.dsh/profiles/desktop`）；
  - 客户端声明保持 `dsh.client.platform = "web"`（Desktop 与 Web 共用同一套前端）；
  - README / RELEASE 补充 Desktop 安装方式（图形界面插件管理器或 Desktop 自带
    `dsh.cmd plugin --profile desktop add`）。

### 文档

- `docs/CLI-BEHAVIOR.md` 增补 OpenCode v2.3.0 复验（参数表、argv 形态、事件流差异）；
- `opencode-docs/cli.md` 的 `run` 参数按 v2 实测重写；
- README 增加 Web / Desktop 双安装说明与版本兼容表。

## 0.1.0（首个公开版，2026-10-19 发布）

### 功能

- **原生 LlmAdapter 桥接**：DSH → `opencode run --format json` → OpenCode 兼容模型，
  模型选择器出现 `opencode-bridge` provider（Adapter 合同 + 七方法实现）
- **会话一对一续接**：DSH chat ↔ OpenCode session 绑定，增量 prompt 透传，
  绑定漂移/失效自动回退全量重放
- **切块模拟流式**：OC 整段 text 切块 + 22ms 节奏层（打字机效果），
  reasoning/工具回传映射（reasoning 皮镜像，防双重执行）
- **模型暴露筛选**：OC-bridge 侧边卡片勾选面板，写回 `~/.dsh-opencode-bridge/config.json`
- **CLI 环境检测**：面板常驻状态卡（版本/路径/来源），未安装时给按环境推荐的
  安装命令（npm/scoop/choco 探测）+ 一键复制 + GitHub Releases 下载链接，
  `CLI_NOT_FOUND` 报错与面板建议同口径
- **健壮性**：五层超时、AbortSignal 取消 + Windows 进程树清理（taskkill /T）、
  12 类错误分类、JSON Lines 协议解析（半行/超长行/污染行防护）

### 测试

- `node --test` 单测 239 条全绿（含真实子进程 spawn 路径）
- 真实 CLI 集成测试（`OCBRIDGE_IT=1` 手动开启）R01–R08、R11

### 发布待办（发布前清零，完整操作单见 docs/RELEASE.md）

- [x] 包名定案：**`dsh-opencode-cli-bridge`**（2026-10-19，裸名；因 npm 上已有同赛道
      `dsh-opencode-bridge` / `dsh-opencode-cli` 而弃用近似名），`package.json` /
      `client.js` 模块 id / `cordis.patch.yml` 三处已同步（单测守护一致性）
- [x] 建 GitHub 仓库 **`home-river/dsh-opencode-cli-bridge`**（与包名同），已补
      `repository` / `homepage` / `bugs` 字段
- [x] DSH 版本兼容声明：顶层 `engines.dsh: ">=0.2.1-0 <0.3.0"`（查证结论：宿主只认顶层
      `engines.dsh`、声明后忽略 peer；caret 跨 minor 必拒；`dsh.plugin.json` 属已移除旧机制，无需准备）
- [x] README 截图 + 仓库 `screenshots.json`（已含脱敏处理的 OC-bridge 面板图）
- [ ] 市场收录：GitHub topic `dsh-plugin` + 向 awesome-dsh-plugin 提 YAML 条目 PR
