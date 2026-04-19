# GitHub Hotboard

本项目是一套本机运行的 GitHub 热榜采集与分享工作台，基于 `Next.js + TypeScript + PostgreSQL + pg-boss + Auth.js(next-auth) + Prisma + Remotion`。

## 已实现能力
- `Explore`：按 `new_hot` / `growth`、窗口、关键词、语言、topic 即时跑榜
- `My Queries`：保存个人查询模板与可选 cron 订阅
- `Run Detail`：查看榜单、GitHub 一键直达、生成图文/视频任务
- `Share Studio`：生成公众号 / 小红书导出稿并下载
- `Video Studio`：查看 Remotion 视频任务、脚本、音频与渲染结果
- GitHub 采集策略：候选集搜索 + Star 时间精确回算
- 视频能力：OpenAI TTS 配音 + Remotion 合成 + 字幕烧录

## 快速开始
1. 安装依赖：

```bash
npm install
```

2. 配置环境变量：

```bash
copy .env.example .env
```

3. 初始化数据库：

```bash
npm run prisma:generate
npm run prisma:migrate
```

4. 启动 Web：

```bash
npm run dev
```

5. 启动 Worker（用于定时榜单和视频渲染）：

```bash
npm run worker
```

6. 做一次基线验证：

```bash
npm run verify
```

## Windows 一键脚本
- `setup-local.cmd`：复制 `.env`、安装依赖、生成 Prisma Client、执行数据库迁移
- `run-web.cmd`：启动 Web 开发服务器
- `run-worker.cmd`：启动后台 worker

## Windows 使用说明
- 这份项目说明默认按 Windows + `npm` 编写，不需要额外安装 `pnpm`
- 如果你用的是 `cmd`，复制 `.env.example` 请使用 `copy .env.example .env`
- 如果你用的是 PowerShell，请使用 `Copy-Item .env.example .env`
- 也可以直接在资源管理器里把 `.env.example` 复制一份并重命名为 `.env`

## 关键环境变量
- `DATABASE_URL`：PostgreSQL 连接串
- `NEXTAUTH_URL` / `NEXTAUTH_SECRET`
- `GITHUB_ID` / `GITHUB_SECRET`：GitHub OAuth App
- `OPENAI_API_KEY`：启用语音配音
- `EXPORT_ROOT`：本地导出目录
- `VIDEO_INLINE_RENDER`：设为 `true` 时，在 API 请求里同步渲染视频

## 说明
- `growth` 榜单会对候选仓库做近窗 Star 事件回算，并把结果存入 `repo_star_events`
- 如果 GitHub 搜索或 README 检索遇到配额不足，`query_runs.partial` 会被标记为 `true`
- 发布能力当前是导出发布包，不直接调用公众号/小红书平台接口
- 视频系统需要额外安装 Remotion 运行依赖，并确保本机具备可用的 Chromium / ffmpeg 环境
- 调整主链路后，建议至少执行一次 `npm run verify`，把单元测试和生产构建一起跑完
