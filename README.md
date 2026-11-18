# dsh-opencode-cli-bridge

[![ci](https://github.com/home-river/dsh-opencode-cli-bridge/actions/workflows/ci.yml/badge.svg)](https://github.com/home-river/dsh-opencode-cli-bridge/actions/workflows/ci.yml)

> 在 DeepSeek Harness 里通过**本机 OpenCode CLI** 使用 OpenCode 兼容模型——原生 `LlmAdapter` 桥接，无 sidecar、无额外进程、无 API Key。

[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 插件 · MIT License

## 功能特性

- **原生 adapter**——模型选择器出现 `opencode-bridge` provider，装好即用
- **会话一对一续接**——DSH 会话 ↔ OpenCode session 绑定，工具结果跨轮可见
- **打字机流式**——OC 整段输出切块 + 节奏层模拟流式，思考/工具回传结构化镜像
- **CLI 环境检测**——面板常驻状态卡（版本/路径/来源），未安装时给推荐安装命令，一键复制
- **模型暴露筛选**——侧边卡片勾选面板，想暴露哪些模型自己定
- **健壮性**——五层超时、取消即杀进程树（Windows `taskkill /T`）、12 类错误分类、协议解析防护

## 前置要求

| 依赖 | 要求 |
|---|---|
| DeepSeek Harness | 0.2.x（实测 0.2.1 / 0.2.2-rc；**Web 与 Desktop 均可**） |
| Node.js | ≥ 20（DSH 能跑就满足） |
| pnpm | ≥ 10（`dsh plugin add` 用它装依赖，需在 PATH；`npm i -g pnpm`） |
| **OpenCode CLI** | **必须**：**v2.x**（实测 v2.3.0），本插件通过本机 `opencode` CLI 出模型流量 |

OpenCode CLI 未装也没关系——打开 **OpenCode Bridge** 面板，顶部「CLI 环境」区块会告诉你状态并给出**按你的环境推荐的安装命令**（自动探测 npm / scoop / choco），一键复制即可。

## 安装

插件同时支持 **DSH Web** 与 **DSH Desktop**：两端共用同一套 Web 前端，客户端声明保持 `dsh.client.platform = "web"`；差别只在**装进哪个 profile**。

### DSH Web

```sh
# npm 安装（推荐）
dsh plugin --profile web add dsh-opencode-cli-bridge

# 或本地 tgz / 源码安装
npm pack
dsh plugin --profile web add ./dsh-opencode-cli-bridge-0.1.1.tgz
```

> 提示：找不到 `dsh` 命令时可用 `npx -y --package @deepseek-ai/dsh dsh plugin ...` 兜底。

**验证**：重启 `dsh web`，打开模型选择器 → 出现 **opencode-bridge** 分组并列出模型 → 选中开聊。

### DSH Desktop

Desktop 的插件装在独立的 `desktop` profile（`~/.dsh/profiles/desktop`），不能用普通 npm 版 `dsh` 管理——宿主会拒绝 `--profile desktop`。两种装法任选：

1. **图形界面**（推荐）：Desktop → 设置 → 插件 → 安装插件 → 选择 npm 包名、tarball 或本地目录，安装完按提示重载窗口。
2. **Desktop 自带 CLI**：先在 Desktop 设置里启用「`dsh` 命令行」，然后：

   ```sh
   dsh plugin --profile desktop add dsh-opencode-cli-bridge
   # 或本地 tgz
   dsh plugin --profile desktop add ./dsh-opencode-cli-bridge-0.1.1.tgz
   ```

   未启用命令行时可直接调用 Desktop 安装目录里的启动器（Windows）：

   ```powershell
   & "$env:LOCALAPPDATA\Programs\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd" `
       plugin --profile desktop add dsh-opencode-cli-bridge
   ```

**验证**：重启 DeepSeek Harness，打开模型选择器 → 出现 **opencode-bridge** 分组并列出模型 → 选中开聊。Desktop 版的面板在**设置 → OpenCode Bridge**（不占左侧栏）；Web 版仍在左栏「插件」卡旁。

## 使用

![OpenCode Bridge 面板：顶部 CLI 环境状态卡 + 模型暴露勾选](docs/screenshots/oc-bridge-panel.png)

- **模型选择器**：直接选 `opencode-bridge` 下的模型对话；
- **OpenCode Bridge 面板**：Desktop 在**设置 → OpenCode Bridge**，Web 在左侧栏「插件」卡旁；顶部是 CLI 环境状态卡，下方勾选要暴露到选择器的模型，保存后下次打开选择器生效；
- **取消**：DSH 侧停止生成即杀掉 CLI 进程树，不留孤儿进程。

## 配置

面板写回 `~/.dsh-opencode-bridge/config.json`，也可手改：

```json
{
  "models": {
    "include": ["opencode/mimo*", "opencode/gpt*"],
    "exclude": ["opencode/gpt-5-pro"]
  }
}
```

规则（匹配完整模型 id，模式仅支持 `*` 通配）：

1. `include` 非空时只展示命中项；留空 = 全放行；
2. `exclude` 优先级最高，命中即隐藏；
3. `opencode-go/*` **默认隐藏**，需要时在 `include` 显式写回。

改完即生效（每次打开选择器重读），配置损坏不报错、退回默认并记诊断日志。

**思考强度**：插件声明 `reasoning.efforts`，并把 `reasoningEffort` 按 OpenCode v2 语法写进 `--model provider/model#variant`；但免费模型实测不响应 variant——「接受并转发」≠「保证生效」。

## 工作原理

```text
DSH 会话 → DSH LLM 服务 → opencode-bridge LlmAdapter
  → opencode run --format json（本机 CLI，cwd 工作区 / --session 会话绑定）
  → JSON Lines 事件 → DSH text-delta / reasoning / usage / finish
```

- **绑定**：`~/.dsh-opencode-bridge/sessions.json` 记录 DSH 会话 → OC 会话与消息水位，续轮增量发送；账本漂移或 OC 会话失效时自动重建并全量重放一次；
- **回传**：正文 → `text` 块；思考 → 原生 `reasoning` 块；工具调用/结果 → 结构化镜像（借 `reasoning` 块承载，避免 `tool-call` 块触发 DSH 工具循环造成双重执行）；
- **发现**：CLI 四级发现（显式路径 → PATH → npm 全局布局 → 报错引导），Windows 下 `.cmd` shim 解析出真身 exe 直接执行，不用 shell。

## 安全与隐私

- **只调用本机已装的 OpenCode CLI**，流量从你的机器直达模型上游；无遥测、无第三方统计、无安装脚本（pnpm 零构建脚本摩擦）；
- 诊断日志写在 `~/.dsh-opencode-bridge/`（`requests.log` 请求摘要 / `diagnostics.log` 协议诊断 / `sessions.json` 会话映射），不含 API Key；
- ⚠️ **取证日志 `last-request.md` 会保存最近一次请求的 prompt 原文**（排障用），介意可随时删除该文件，功能不受影响；
- 面板的「CLI 环境」检测是**只读**的：不执行任何安装/卸载动作，只探测并给命令。

## DSH 版本兼容

| 你的 DSH 版本 | 形态 | 本插件版本 |
|---|---|---|
| 0.2.1 及之后的 0.2.x（含 -rc 线） | Web（`--profile web`） | 0.1.0 |
| 0.2.2-rc 及之后的 0.2.x | Desktop（`--profile desktop`） | 0.1.0 |

插件以顶层 `engines.dsh: ">=0.2.1-0 <0.3.0"` 声明兼容范围，安装与启动都会校验；不满足时插件会被整包跳过并列入 `skippedBundles`（可用 `dsh plugin --profile <p> allow-version <pkg@ver> --dsh-version <ver> --accept-risk` 强行豁免，风险自担）。

## 开发

```sh
npm test              # tsc 全量 + client 构建 + node --test 全量单测
OCBRIDGE_IT=1 npm run test:integration   # 真实 CLI 集成测试（需本机 opencode）
```

- `src/`：host 半区（发现/spawn/协议/事件/adapter/路由）+ `client.js`（OpenCode Bridge 面板，vanilla JS + React.createElement，无打包链）；
- `test/`：fake CLI 单测（走真实 spawn 路径）+ 真实 CLI 集成测试；
- `docs/`：`GOALS.md`（目标与验收）、`CLI-BEHAVIOR.md`（CLI 行为实测记录）、`research/`（DSH 合同研究）；
- `issues/`：关键 bug 的现象/根因/修复方案记录（工程过程透明）。

## License

[MIT](./LICENSE)
