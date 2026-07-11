# NEXUS HOME

NEXUS HOME 是一套带实时配置台的个人主页。公开页面位于 `/`，配置台位于 `/config`；保存配置后，已打开的主页与预览会立即同步。

## 地址

| 页面 | 地址 |
| --- | --- |
| 主页 | `http://127.0.0.1:21026/` |
| 配置台 | `http://127.0.0.1:21026/config` |
| 局域网主页 | `http://你的IP:21026/` |
| 局域网配置台 | `http://你的IP:21026/config` |

## 本地运行

需要 Node.js 22+。

```bash
npm install
npm run dev
```

常用命令：

```bash
npm test
npm run build
npm start
```

## 环境变量

仓库不包含 `.env`，也不包含任何密码、哈希或 API Key。克隆项目后，从 `.env.example` 复制一份并命名为 `.env`：

```powershell
Copy-Item .env.example .env
```

填写邮件恢复服务：

```dotenv
RESEND_API_KEY='re_你的发送权限密钥'
RECOVERY_EMAIL_FROM='no-reply@你的域名'
```

`.env` 只保存在运行服务器上，并已由 `.gitignore` 排除；提交 GitHub 的是 `.env.example`，其中只放字段名与示例值。

## 配置台认证

首次打开 `/config` 时，页面会要求设置管理员密码并绑定恢复邮箱。

后续访问需要管理员密码。点击“使用邮箱验证码重置”后，系统会将六位包含字母数字验证码发送到已绑定邮箱；验证码有效期为 10 分钟，单个验证码最多校验 5 次。

邮件来自 `RECOVERY_EMAIL_FROM` 指定的发件地址，正文格式为：

```text
您本次的恢复验证码为XXXXXX
```

## `data/auth.json`

`data/auth.json` 是配置台认证文件。当前文件只包含以下认证字段：

| 字段 | 示例形态 | 含义 |
| --- | --- | --- |
| `passwordHash` | `scrypt$...` | 管理员密码的 scrypt 单向哈希。系统只用它核验密码，不保存密码明文。 |
| `recoveryEmail` | `name@example.com` | 接收密码恢复验证码的已绑定邮箱。 |
| `schemaVersion` | `1` | 认证文件格式版本，不属于认证凭证。 |

文件结构：

```json
{
  "schemaVersion": 1,
  "passwordHash": "scrypt$...",
  "recoveryEmail": "name@example.com"
}
```

`auth.json` 与 `.env` 都属于服务器私有文件，不进入前端、不上传 GitHub。

## 数据文件

| 文件 | 内容 |
| --- | --- |
| `data/config.json` | 主页文案、视觉、布局、项目和链接配置。 |
| `data/auth.json` | 管理员密码哈希与恢复邮箱。 |

首次运行时，`data/config.json` 从 `config/default.json` 初始化。配置台使用原子写入保存数据，服务重启后配置保持不变。

## Docker

```bash
docker pull yuni020126/nexus-home:latest
docker run -d --name nexus-home --restart unless-stopped -p 21026:21026 -v nexus-home-data:/app/data yuni020126/nexus-home:latest
```

Compose：

```bash
docker compose up -d --build
docker compose logs -f nexus-home
docker compose down
```

容器部署时，将 `RESEND_API_KEY` 和 `RECOVERY_EMAIL_FROM` 作为运行环境变量注入容器。

## HTTPS 与代理

位于 HTTPS 反向代理之后时，在运行环境中设置：

```dotenv
TRUST_PROXY=1
```

## 备份

备份 `data/config.json` 与 `data/auth.json` 即可保留站点配置和管理员认证状态。
