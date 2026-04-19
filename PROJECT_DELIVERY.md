# GitHub Hotboard 项目交付文档

## 1. 项目概述

`GitHub Hotboard` 是一套本机运行的 GitHub 热榜采集与分享工作台，面向“个人登录、个人订阅、个人导出”的使用场景。

当前版本已经具备以下主链路：

- GitHub OAuth 登录
- 手动跑榜
- 保存查询与定时订阅
- 订阅中心与运行历史
- 分享稿生成与草稿编辑
- 视频任务列表与状态展示
- `pg-boss` 驱动的后台任务与每日汇总邮件抽象

当前项目工作目录：

- `D:\AIGitHub\github-hotboard`


## 2. 技术栈

- 前端：`Next.js` + `React` + `TypeScript`
- 数据库：`PostgreSQL`
- ORM：`Prisma`
- 鉴权：`Auth.js / NextAuth` + `GitHub OAuth App`
- 后台任务：`pg-boss`
- 内容与视频链路：分享稿生成 + 视频任务队列


## 3. 当前已实现能力

### 3.1 榜单探索

页面：

- `/explore`

已支持：

- 选择榜单模式：
  - `new_hot`：新项目总星榜
  - `growth`：增长榜
- 选择窗口天数：
  - `1 / 7 / 14 / 30`
- 输入关键词、语言、Topic
- 选择榜单条数：
  - `10 / 20`
- 立即跑榜
- 保存到订阅中心
- 配置定时计划

### 3.2 运行详情

页面：

- `/runs/[id]`

已支持：

- 展示当前榜单运行状态
- 展示榜单结果列表
- GitHub 直达链接
- 从运行结果继续生成：
  - 公众号稿
  - 小红书稿
  - 视频任务

### 3.3 订阅中心

页面：

- `/queries`
- `/queries/[id]`

已支持：

- 查看已保存的热榜订阅
- 展示启用/暂停状态
- 展示下次运行时间
- 展示最近运行结果
- 查看单个订阅的历史运行记录
- 立即补跑
- 删除/启停订阅
- 全局运行流水视图

### 3.4 分享工作台

页面：

- `/share`
- `/share/[id]`

已支持：

- 分享草稿列表
- 固定预览区
- Markdown 文章呈现
- 独立草稿编辑页
- 复制标题、封面文案、正文、标签
- 下载导出稿
- 从来源 Run 继续生成：
  - 公众号稿
  - 小红书稿
  - 视频任务

当前交互规则：

- 列表页单页显示 `3` 条草稿
- 当前预览项显示 `当前预览` 微标志
- 右侧预览区域固定高度，正文单独滚动

### 3.5 视频工作台

页面：

- `/videos`

已支持：

- 展示视频任务列表
- 展示任务状态
- 展示来源 Run
- 展示视频、音频、字幕状态
- 展示失败原因


## 4. 当前数据与任务模型

### 4.1 主要业务对象

- `saved_queries`
  - 保存查询
  - 定时配置
  - 启停状态
- `query_runs`
  - 每次榜单运行记录
  - 手动/定时/重试来源
  - 状态、错误、partial 信息
- `share_drafts`
  - 分享稿草稿
  - 关联 `queryRunId`
- `video_jobs`
  - 视频任务
  - 关联 `queryRunId`

### 4.2 后台任务

使用 `pg-boss` 驱动：

- `query.run`
- `saved-query.dispatch`
- `share.generate`
- `video.render`
- `daily-digest.tick`

目前调度方式已经改成“全局派发器”模式，不再为每条订阅单独注册一条 schedule。


## 5. 本机运行方式

### 5.1 安装依赖

```bat
cd /d D:\AIGitHub\github-hotboard
npm install
```

### 5.2 Prisma

```bat
npm run prisma:generate
npm run prisma:migrate
```

### 5.3 启动 Web

```bat
cd /d D:\AIGitHub\github-hotboard
npm run dev
```

### 5.4 启动 Worker

```bat
cd /d D:\AIGitHub\github-hotboard
npm run worker
```


## 6. 环境变量说明

项目至少需要以下配置：

```env
DATABASE_URL="postgresql://postgres:你的密码@localhost:5432/github_hotboard"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="一个足够长的随机字符串"
GITHUB_ID="GitHub OAuth App Client ID"
GITHUB_SECRET="GitHub OAuth App Client Secret"
```

可选项：

```env
OPENAI_API_KEY="用于分享/视频语音等能力"
RESEND_API_KEY="用于日报邮件"
MAIL_FROM="发件邮箱"
```


## 7. GitHub OAuth 配置

GitHub 后台应使用：

- `Developer settings -> OAuth Apps`

不是：

- `GitHub Apps`

推荐配置：

- Homepage URL：
  - `http://localhost:3000`
- Authorization callback URL：
  - `http://localhost:3000/api/auth/callback/github`


## 8. 当前页面清单

当前重点页面：

- [Explore](http://localhost:3000/explore)
- [My Queries](http://localhost:3000/queries)
- [Share Studio](http://localhost:3000/share)
- [Share Draft Editor 示例](http://localhost:3000/share/cmo4dd2m8009jmxp0zelm9595)
- [Video Studio](http://localhost:3000/videos)

运行详情页示例依赖数据库中的真实 `runId`，以本机数据为准。


## 9. 当前版本已修复的问题

本轮开发过程中，已经修复过这些关键问题：

- GitHub 登录失败与 session 同步问题
- 手动跑榜停留在 `pending` 的问题
- `React Context is unavailable in Server Components`
- `rspack.win32-x64-msvc.node` 被 Next 错误解析
- Prisma 模型字段和页面关系名不一致：
  - `sourceRun` -> `queryRun`
  - `outputPath` -> `videoPath`
  - `captionPath` -> `captionJson`
- `Share` 页面空值导致的 `replace` 崩溃
- `Run Detail` 出现双层侧栏
- `pg-boss` schedule 参数错误导致的 JSON 报错
- `pg-boss` 队列未创建导致的外键错误


## 10. 当前已知问题与限制

### 10.1 视频生成可能因为 OpenAI 配额失败

已出现过的真实错误：

- `429 You exceeded your current quota`

这不是前端页面问题，而是上游 API 配额或计费问题。

### 10.2 页面统一性仍需要最后一轮人工回归

虽然已经做了多轮统一，但以下页面仍建议逐个人工检查：

- `/explore`
- `/queries`
- `/share`
- `/share/[id]`
- `/videos`
- `/runs/[id]`

### 10.3 当前会话中的本地终端桥接不稳定

在当前这次协作中，命令桥接持续报错：

- `Windows PowerShell ... 8009001d`

影响：

- 无法稳定直接读取本地文件
- 无法可靠执行本地命令验证

因此，后续建议在新会话中优先确认终端会话已正常附着，再继续修改。


## 11. 建议的下一步工作

建议优先级如下：

### 第一优先级：稳定性回归

- 全量检查 6 个主页面是否存在样式断层
- 检查所有空状态、失败状态、partial 状态
- 验证草稿旧数据兼容逻辑
- 验证视频列表页对失败任务和空路径展示是否稳定

### 第二优先级：Run Detail 统一化重构

目标：

- 与全站工作台风格完全统一
- 顶部 Hero、状态卡、操作卡、结果表统一节奏

### 第三优先级：分享链路增强

- 草稿直接发起“继续生成另一渠道版本”
- 草稿编辑页进一步富文本化
- 公众号稿 / 小红书稿使用不同预览模板

### 第四优先级：视频链路增强

- 配音失败时给出更友好的降级提示
- 增加更明确的任务重试入口
- 区分“脚本失败 / TTS 失败 / 渲染失败”


## 12. 推荐回归清单

每次继续开发前，建议按这个顺序回归：

### 12.1 基础运行

```bat
cd /d D:\AIGitHub\github-hotboard
npm run prisma:generate
npm run dev
```

另开一个终端：

```bat
cd /d D:\AIGitHub\github-hotboard
npm run worker
```

### 12.2 页面回归

依次检查：

- `/explore`
- `/queries`
- `/share`
- `/share/[id]`
- `/videos`
- `/runs/[id]`

### 12.3 业务回归

- 登录 GitHub
- 立即跑榜
- 保存订阅
- 立即补跑
- 生成公众号稿
- 生成小红书稿
- 打开分享工作台
- 进入草稿编辑
- 打开视频工作台


## 13. 后续接手时建议给下一位协作者的说明

如果在新会话中继续开发，建议第一句就明确：

```text
请先直接读取 D:\AIGitHub\github-hotboard 的本地文件，再继续修改，不要根据描述猜代码。
```

建议优先读取的关键文件：

- `D:\AIGitHub\github-hotboard\components\explore-form.tsx`
- `D:\AIGitHub\github-hotboard\components\share-draft-browser.tsx`
- `D:\AIGitHub\github-hotboard\components\share-draft-editor.tsx`
- `D:\AIGitHub\github-hotboard\app\share\page.tsx`
- `D:\AIGitHub\github-hotboard\app\share\[id]\page.tsx`
- `D:\AIGitHub\github-hotboard\app\videos\page.tsx`
- `D:\AIGitHub\github-hotboard\app\queries\page.tsx`
- `D:\AIGitHub\github-hotboard\app\runs\[id]\page.tsx`
- `D:\AIGitHub\github-hotboard\app\queries\queries.module.css`
- `D:\AIGitHub\github-hotboard\app\globals.css`
- `D:\AIGitHub\github-hotboard\lib\jobs.ts`


## 14. 交付结论

当前项目已经完成从 `0 -> 1` 的主体搭建，并具备本机可运行的业务主链路。

当前状态更适合定义为：

- `可演示`
- `可继续迭代`
- `需要一轮稳定性与统一性收口`

不建议在未做回归收口前继续大幅扩展新功能面。
