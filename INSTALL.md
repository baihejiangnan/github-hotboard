# 小白安装指南

本指南面向没有任何开发经验的读者，帮助你在空白的电脑上克隆并运行 GitHub Hotboard 项目。

---

## 第一步：安装必需的软件

### 1. 安装 Node.js

1. 打开浏览器访问 https://nodejs.org/
2. 点击绿色的 **LTS** 版本按钮下载（推荐大多数用户使用）
3. 下载完成后双击安装包，按照提示一路点"下一步"即可
4. 安装完成后，按 `Win + R`，输入 `cmd`，回车，打开命令提示符
5. 输入以下命令验证是否安装成功：

```bash
node -v
npm -v
```

如果看到类似 `v20.x.x` 和 `10.x.x` 的版本号，说明安装成功。

### 2. 安装 Git

1. 访问 https://git-scm.com/download/win
2. 点击下载 Windows 版本
3. 双击安装包，**特别注意**：在选择编辑器那一步，可以选"Use Vim"或者跳过选默认
4. 一路点"Next"直到安装完成
5. 重新打开命令提示符，输入：

```bash
git --version
```

看到版本号说明安装成功。

### 3. 安装 PostgreSQL 数据库

1. 访问 https://www.postgresql.org/download/windows/
2. 点击"Download the installer"
3. 下载对应 Windows 版本的安装包
4. 双击运行，**记住设置的超级用户密码**（后面要用）
5. 安装过程中一路点"Next"，可以只装最小化组件
6. 记住选择的端口号，默认是 `5432`

### 4. 安装代码编辑器（推荐）

推荐安装 VS Code：

1. 访问 https://code.visualstudio.com/
2. 点击下载 Windows 版本
3. 安装后打开，按 `Ctrl + Shift + E` 打开文件侧边栏

---

## 第二步：克隆项目到本地

### 1. 创建文件夹

在桌面或你喜欢的位置，**新建一个空文件夹**，比如叫 `github-hotboard`。

### 2. 打开命令提示符并进入该文件夹

```bash
cd Desktop\github-hotboard
```

（如果你的文件夹在别的位置，把 `Desktop` 换成实际路径）

### 3. 克隆项目

在命令提示符中运行：

```bash
git clone https://github.com/baihejiangnan/github-hotboard.git .
```

等待下载完成。

---

## 第三步：安装依赖

在项目文件夹的命令提示符中，运行：

```bash
npm install
```

这可能需要几分钟，耐心等待。

---

## 第四步：配置环境变量

### 1. 复制配置文件

在项目根目录，有一个文件叫 `.env.example`。复制一份，改名为 `.env`。

如果你用的是命令提示符：

```bash
copy .env.example .env
```

如果你想用 VS Code 操作：
1. 在 VS Code 左侧找到 `.env.example` 文件
2. 右键点击 -> "复制"
3. 在项目根目录右键 -> "粘贴"
4. 把粘贴的文件改名 为 `.env`

### 2. 编辑 .env 文件

用 VS Code 打开 `.env` 文件，填入以下配置：

```env
# 数据库（根据你安装时的设置修改）
DATABASE_URL="postgresql://postgres:你的密码@localhost:5432/github_hotboard"
# postgres 是用户名，填你安装时设置的用户名
# 你的密码 填你安装 PostgreSQL 时设置的密码

# 认证（可以随便填一串随机字符，比如 abc123）
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="abc123"

# GitHub 登录（可选，如果你想用 GitHub 登录功能）
GITHUB_ID=""
GITHUB_SECRET=""

# AI 提供商（默认先用免费额度）
AI_TEXT_PROVIDER="ark"
AI_TTS_PROVIDER="piper"
AI_VIDEO_CLIP_PROVIDER="none"

# 本地路径
EXPORT_ROOT="./data/exports"
```

### 3. 创建数据库

1. 打开 pgAdmin（PostgreSQL 安装后自带的工具）
2. 用你设置的密码登录
3. 在左侧找到 "Databases"，右键 -> "Create" -> "Database"
4. 数据库名填 `github_hotboard`，其他保持默认，点 Save

---

## 第五步：初始化数据库

在项目文件夹的命令提示符中依次运行：

```bash
npx prisma generate
npx prisma migrate dev
```

看到 `Database migration successful` 说明成功。

---

## 第六步：启动项目

### 启动开发服务器

在项目文件夹的命令提示符中运行：

```bash
npm run dev
```

等待几秒，看到类似以下内容说明启动成功：

```
Ready - started server on http://localhost:3000
```

### 打开浏览器

打开浏览器，访问 http://localhost:3000

应该能看到项目界面了。

---

## 常见问题

### 问题1：端口被占用

如果提示 `Port 3000 is already in use`，可以：

1. 打开任务管理器（按 `Ctrl + Shift + Esc`）
2. 找到占用端口的程序，结束它
3. 或者修改 `.env` 文件中的 `PORT=3001`（用另一个端口）

### 问题2：数据库连接失败

检查 `.env` 中的 `DATABASE_URL`：
- 用户名是 `postgres` 吗？
- 密码是你安装时设置的吗？
- PostgreSQL 服务启动了吗？（在任务管理器服务里找）

### 问题3：npm install 失败

1. 检查网络是否正常
2. 清理缓存后重试：

```bash
npm cache clean --force
npm install
```

### 问题4：git clone 失败

如果网络慢，可以试试：

```bash
git clone https://github.com/baihejiangnan/github-hotboard.git --depth 1
```

### 问题5：想停止项目

在命令提示符中按 `Ctrl + C`

---

## 后续操作

安装成功后，你可以继续阅读：

- [用户设置指南](app/settings/) - 了解如何配置你的 API 凭证
- [管理员手册](app/admin/) - 如果你是管理员，了解如何管理用户和兑换码

有问题可以提交 [GitHub Issue](https://github.com/baihejiangnan/github-hotboard/issues)。