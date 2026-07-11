# NEXUS HOME

NEXUS HOME 是一个带有实时可视化配置台的科技风个人主页。公开页面位于 `/`，配置台位于 `/config`；配置修改会即时同步到主页和预览窗口。

## 功能概览

- 科技感、玻璃拟态与海洋波纹交互主页
- 实时配置台：文案、配色、布局、项目、链接与数据模块均可可视化编辑
- 配置自动持久化，并通过 SSE 同步给已打开的主页
- 首次访问配置台时创建管理员密码并绑定恢复邮箱
- 忘记密码时发送 6 位字母数字验证码到恢复邮箱
- 验证码有效期 10 分钟，单个验证码最多校验 5 次
- 支持本地开发、生产构建与 Docker Compose 部署

## 访问地址

默认服务端口是 `8099`：

| 用途 | 地址 |
| --- | --- |
| 主页 | `http://127.0.0.1:8099/` |
| 配置台 | `http://127.0.0.1:8099/config` |
| 局域网主页 | `http://你的电脑IP:8099/` |
| 局域网配置台 | `http://你的电脑IP:8099/config` |

局域网访问时，服务需要监听 `0.0.0.0`，并在防火墙中允许 TCP `8099` 端口。

## 本地开发

要求 Node.js 22 或更高版本。

```bash
npm install
npm run dev
```

开发服务会监听 `0.0.0.0:8099`。若只允许本机访问，请启动前设置：

```powershell
$env:HOST = "127.0.0.1"
npm run dev
```

生产构建与启动：

```bash
npm run build
npm start
```

运行自动化测试：

```bash
npm test
```

## 首次初始化与密码恢复

首次打开 `/config` 时，系统要求设置管理员密码、确认密码，并绑定一个恢复邮箱。初始化成功后，密码和邮箱恢复信息会保存到数据目录；浏览器 Cookie 仅用于当前登录会话，使用无痕窗口不会绕过管理员认证。

忘记密码时：

1. 在登录界面点击“使用邮箱验证码重置”。
2. 页面会显示脱敏后的已绑定邮箱。
3. 点击“发送恢复验证码”。
4. 邮箱会收到一封来自 `no-reply@aries.edu.kg` 的邮件，内容为“您本次的恢复验证码为XXXXXX”。
5. 输入六码字母数字验证码，设置并确认新密码。

> 验证码仅保存在服务进程内；服务重启后，旧验证码自动失效。

## `data/auth.json` 认证字段说明

`data/auth.json` 是服务端私有认证文件。它不应被提交到 Git、公开上传、复制到前端或通过截图分享。下面的四个认证字段是核心内容：

| 字段 | 示例形态 | 作用 | 安全说明 |
| --- | --- | --- | --- |
| `passwordHash` | `scrypt$...` | 管理员密码的单向哈希，用于登录校验。 | 不保存密码明文；无法从哈希反推出原密码。 |
| `recoveryEmail` | `name@example.com` | 已绑定的密码恢复邮箱，验证码只会发送到此地址。 | 这是恢复凭证，请使用本人长期可访问的邮箱。 |
| `recoveryQuestion` | 空字符串或旧问题文本 | 旧版密保问题兼容字段。新初始化流程不再写入它。 | 保留它只是为了兼容早期已创建的认证文件，不建议再依赖它。 |
| `recoveryAnswerHash` | `scrypt$...` 或空字符串 | 旧版密保答案的单向哈希兼容字段。新流程使用邮箱验证码，不再写入它。 | 与 `recoveryQuestion` 配套，仅服务于旧数据兼容。 |

此外，`schemaVersion` 是文件结构版本号，不是认证凭证。请不要手动修改、删除或伪造 `auth.json` 的字段；若确实需要重新初始化管理员账户，应先做好数据备份，再删除认证文件并重启服务。

示例结构（已省略真实内容）：

```json
{
  "schemaVersion": 1,
  "passwordHash": "scrypt$...",
  "recoveryEmail": "name@example.com",
  "recoveryQuestion": "",
  "recoveryAnswerHash": ""
}
```

## 邮件恢复配置

邮件发送通过 Resend API 完成。本机开发使用项目根目录的 `.env`：

```dotenv
RESEND_API_KEY='re_你的Resend发送权限密钥'
RECOVERY_EMAIL_FROM='no-reply@aries.edu.kg'
```

- `RESEND_API_KEY`：Resend 的 Sending access API Key，属于敏感凭证，绝不能提交到 Git。
- `RECOVERY_EMAIL_FROM`：已在 Resend 验证过的发件邮箱。
- 如邮件被收件箱归类为垃圾邮件，请在邮件客户端中标记为“非垃圾邮件”，并确保域名的 SPF、DKIM 和 DMARC 记录正确。

## 配置持久化

服务会使用 `data/` 目录保存运行数据：

| 文件 | 内容 |
| --- | --- |
| `data/config.json` | 配置台保存的主页内容与样式配置。 |
| `data/auth.json` | 管理员认证、恢复邮箱与旧版兼容认证信息。 |

首次运行时，`data/config.json` 会从 `config/default.json` 初始化。之后在配置台所做的修改会以原子写入方式持久化，重启服务后仍会保留。

## Docker Compose

拉取并运行已发布镜像：

```bash
docker pull yuni020126/nexus-home:latest
docker run -d \
  --name nexus-home \
  --restart unless-stopped \
  -p 21026:8099 \
  -v nexus-home-data:/app/data \
  yuni020126/nexus-home:latest
```

Compose 常用命令：

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f nexus-home
docker compose down
```

Docker 部署时，务必以部署平台的 Secret/环境变量功能注入 `RESEND_API_KEY` 与 `RECOVERY_EMAIL_FROM`，不要把真实 API Key 写入镜像、仓库或 Compose 文件。

## 反向代理与 HTTPS

生产环境建议使用 HTTPS 反向代理，并在可信代理之后设置：

```dotenv
TRUST_PROXY=1
```

这样安全会话 Cookie 才能正确使用 `Secure` 标记。还建议在代理层配置访问限速、日志与额外访问控制。

## 备份与恢复

备份时至少保存 `data/config.json` 与 `data/auth.json`。认证文件包含密码哈希和恢复邮箱，必须按照敏感文件处理。

Docker 卷备份示例：

```bash
docker run --rm -v nexus-home-data:/data -v ${PWD}:/backup alpine tar czf /backup/nexus-home-data.tgz -C /data .
```

## 安全清单

- 不要提交 `.env`、`data/auth.json` 或 Resend API Key。
- 使用仅具备 Sending access 的 Resend Key。
- 为恢复邮箱开启可靠的登录保护。
- 使用 HTTPS；不要把 `/config` 暴露在不受信任的公网环境。
- 定期备份 `data/`，并将备份存放在受保护的位置。
