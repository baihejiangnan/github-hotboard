# GitHub Hotboard

本项目是一套本机运行的 GitHub 热榜采集与内容生产工作台，基于 `Next.js + TypeScript + PostgreSQL + pg-boss + Auth.js(next-auth) + Prisma + Remotion`。

它的核心目标不是只看榜单，而是把这条链路打通：

`GitHub 热榜采集 -> 保存结果 -> 生成分享稿 -> 生成解说视频 -> 导出本地产物`

## 快速开始

如果你刚开始接触这个项目，**请先阅读 [小白安装指南](INSTALL.md)**，手把手教你从零开始搭建环境。

有经验的用户可以继续往下看快速启动命令。

### 核心功能
- **榜单采集**：GitHub 搜索候选集 + Star 时间回算
- **图文生产**：分享稿、标题、标签自动生成
- **视频生产**：`Remotion + FFmpeg + 动态模板 + 字幕`
- **语音合成**：优先使用本地 `Piper`

### 会员体系
- **会员等级**：免费用户、专业版、旗舰版
- **兑换码管理**：管理员可生成和查看兑换码
- **等级路由**：不同会员等级使用不同的 AI 模型配置

### 管理面板
- **用户管理**：查看和管理平台用户
- **兑换码管理**：生成、查看、删除会员兑换码
- **API 凭证管理**：各等级用户可配置自己的 API 密钥

### 设置页面
- **个人资料**：用户名、头像
- **API 凭证**：配置各 AI 服务的 API Key
- **偏好设置**：主题、语言

## 当前定位

- 榜单采集：GitHub 搜索候选集 + Star 时间回算
- 图文生产：分享稿、标题、标签自动生成
- 视频生产：`Remotion + FFmpeg + 动态模板 + 字幕`
- 语音合成：优先使用本地 `Piper`
- 所有运行时、模型、下载文件都放在项目根目录下，不依赖全局安装

## 目录约定

这几个目录是现在的本地媒体管线重点：

- [app](D:/AIGitHub/github-hotboard/app)：页面与 API
- [lib](D:/AIGitHub/github-hotboard/lib)：业务逻辑、AI provider、视频/语音实现
- [remotion](D:/AIGitHub/github-hotboard/remotion)：视频模板与构图
- [scripts](D:/AIGitHub/github-hotboard/scripts)：worker、smoke、Piper 安装脚本
- [tools](D:/AIGitHub/github-hotboard/tools)：项目内运行时目录，Piper 可执行文件放这里
- [models](D:/AIGitHub/github-hotboard/models)：项目内模型目录，Piper 声音模型放这里
- [data/exports](D:/AIGitHub/github-hotboard/data/exports)：导出的分享稿、音频、字幕、视频产物

## 媒体方案

### 视频

视频现在优先走本地模板方案，而不是云端 AI 生视频：

- `Remotion`：负责模板、分镜、排版、字幕烧录
- `FFmpeg`：由 Remotion 渲染流程间接调用
- 动态背景：渐变、标题卡片、字幕、项目信息、轻动画
- 可选背景片段：默认关闭，避免不稳定的外部生成依赖

这条路线的好处是：

- 免费
- 本地稳定
- 成片可控
- 不吃大模型额度
- 非常适合“GitHub 热榜讲解视频”

### 语音

语音现在建议走 `Piper`：

- 本地运行
- CPU 可用
- 速度快
- 不依赖外部 API 配额

默认语音模型配置已经指向中文 `zh_CN-huayan-medium`，并且下载到项目根目录下面的 [models/piper](D:/AIGitHub/github-hotboard/models/piper)。

### 字幕

字幕已经是项目内一等公民：

- 视频里直接烧录字幕
- 同时导出独立 `.srt` 文件
- 字幕源来自 `captionSegments`
- 音频存在时由 `FFmpeg` 在本地合成进最终视频；失败时保留静音成片

当前实现使用的是项目内字幕数据结构 + Remotion 模板，不额外依赖在线字幕服务。

## 快速开始

1. 安装依赖

```bash
npm install
```

2. 复制环境变量

```bash
copy .env.example .env
```

PowerShell 也可以：

```powershell
Copy-Item .env.example .env
```

3. 初始化数据库

```bash
npm run prisma:generate
npm run prisma:migrate
```

4. 安装本地 Piper 运行时和声音模型

```bash
npm run setup:piper
```

这一步会把文件下载到项目根目录：

- [tools/piper](D:/AIGitHub/github-hotboard/tools/piper)
- [models/piper](D:/AIGitHub/github-hotboard/models/piper)

5. 启动 Web

```bash
npm run dev
```

6. 启动 Worker

```bash
npm run worker
```

7. 跑基线验证

```bash
npm run verify
```

8. 跑一次本地全链路 smoke

```bash
npm run smoke:local
```

## 默认环境变量

### 基础

- `DATABASE_URL`：PostgreSQL 连接串
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `GITHUB_ID`
- `GITHUB_SECRET`
- `EXPORT_ROOT`：默认是 `./data/exports`
- `FFMPEG_BINARY_PATH`：默认走 `ffmpeg`，如需项目内固定路径可指向仓库内可执行文件

### 文本模型

- `AI_TEXT_PROVIDER="ark"`
- `ARK_API_KEY`
- `ARK_BASE_URL`
- `ARK_TEXT_MODEL`
- `ARK_VISION_MODEL`

图文理解示例命令：

```bash
npm run ark:vision -- "https://ark-project.tos-cn-beijing.volces.com/doc_image/ark_demo_img_1.png" "你看见了什么？"
```

### 本地语音

- `AI_TTS_PROVIDER="piper"`
- `PIPER_ROOT`
- `PIPER_INSTALL_ROOT`
- `PIPER_BINARY_PATH`
- `PIPER_VOICE_NAME`
- `PIPER_VOICE_MODEL_PATH`
- `PIPER_VOICE_CONFIG_PATH`
- `PIPER_DOWNLOAD_URL`
- `PIPER_VOICE_MODEL_URL`
- `PIPER_VOICE_CONFIG_URL`

### 视频片段

- `AI_VIDEO_CLIP_PROVIDER="none"`

默认关闭，这样视频渲染会完全走本地模板，不依赖外部视频生成接口。

### 会员等级

- `MEMBERSHIP_FREE_TIER_NAME="free"`
- `MEMBERSHIP_PRO_TIER_NAME="pro"`
- `MEMBERSHIP旗舰版_TIER_NAME="旗舰版"`

## 常用命令

```bash
npm run dev
npm run worker
npm run verify
npm run smoke:local
npm run setup:piper
npm run remotion:studio
```

## 产物输出

运行完成后，产物默认在 [data/exports](D:/AIGitHub/github-hotboard/data/exports)：

- [data/exports/share](D:/AIGitHub/github-hotboard/data/exports/share)：图文导出稿
- [data/exports/audio](D:/AIGitHub/github-hotboard/data/exports/audio)：旁白音频
- [data/exports/caption](D:/AIGitHub/github-hotboard/data/exports/caption)：字幕文件 `.srt`
- [data/exports/video](D:/AIGitHub/github-hotboard/data/exports/video)：最终视频
- [data/exports/video-clip](D:/AIGitHub/github-hotboard/data/exports/video-clip)：可选背景片段

## 当前默认策略

- 文本生成：Ark
- 语音生成：Piper
- 视频片段生成：关闭
- 视频渲染：Remotion 本地模板
- 字幕：烧录 + SRT 双输出

这意味着即使没有外部 TTS 或视频生成额度，项目也能继续稳定出片。

## 排障

### `npm run worker` 提示找不到 Piper

先执行：

```bash
npm run setup:piper
```

如果还不行，检查：

- [tools/piper/runtime](D:/AIGitHub/github-hotboard/tools/piper/runtime)
- [models/piper](D:/AIGitHub/github-hotboard/models/piper)

### 视频没有声音

这是可接受的降级路径。

当 `Piper` 没有准备好，或者你把 `AI_TTS_PROVIDER` 设为 `none` 时，系统会继续输出静音视频，并保留字幕。

### 视频任务一直失败

当前版本已经把“余额不足/配额不足”类错误当成不可重试错误处理，不会让 worker 一直刷同一个失败任务。

### 想完全本地、不用外部视频生成

保持：

```env
AI_VIDEO_CLIP_PROVIDER="none"
AI_TTS_PROVIDER="piper"
AI_TEXT_PROVIDER="ark"
```

这样视频仍然能通过动态模板稳定生成。
