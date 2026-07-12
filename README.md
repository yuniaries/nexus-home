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

## 配置台认证与密码恢复

首次打开 `/config` 时，页面会要求设置管理员密码并绑定恢复邮箱。

后续访问需要管理员密码。忘记密码时，点击“发送恢复验证码”，系统会通过 NEXUS 密码恢复服务将六位字母数字验证码发送到已绑定的恢复邮箱。验证码有效期为 10 分钟，单个验证码最多校验 5 次；同一邮箱 60 秒内只能请求一次。

邮件恢复服务由 NEXUS 中央邮件节点处理，发件密钥不会包含在 Docker 镜像或站点容器中。

验证码正文格式：

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

`auth.json` 属于服务器私有文件，不进入前端、不上传 GitHub。

## 数据文件

| 文件 | 内容 |
| --- | --- |
| `data/config.json` | 主页文案、视觉、布局、项目和链接配置。 |
| `data/auth.json` | 管理员密码哈希与恢复邮箱。 |

首次运行时，`data/config.json` 从 `config/default.json` 初始化。配置台使用原子写入保存数据，服务重启后配置保持不变。

### 首次初始化流程

无需手动创建 `data/config.json` 或 `data/auth.json`。将 Docker 容器挂载到空的数据卷后，服务会自动完成以下初始化：

1. 服务启动时，根据 `config/default.json` 创建 `data/config.json`。之后在 `/config` 保存的主页文案、颜色、项目和布局，都会写入这个文件。
2. 第一次访问 `/config` 时，设置管理员密码并填写恢复邮箱。确认后，系统创建 `data/auth.json`，其中只保存密码哈希与恢复邮箱。
3. 以后更新镜像或重建容器时，继续挂载原来的 `nexus-home-data` 卷，两个文件会被保留，无需重新设置。

`data/config.json` 与 `data/auth.json` 都是每个部署实例独有的私有数据，已被 `.gitignore` 排除，不应上传 GitHub。

## Docker 启动流程

```bash
# 下载最新版镜像。
docker pull yuni020126/nexus-home:latest

# 仅在之前部署过、需要替换旧容器时执行；第一次部署可跳过这一行。
docker rm -f nexus-home

# 创建并在后台启动主页容器。
docker run -d \
  --name nexus-home \
  --restart unless-stopped \
  -e TRUST_PROXY=1 \
  -p 21026:21026 \
  -v nexus-home-data:/app/data \
  yuni020126/nexus-home:latest
```

`nexus-home-data` 是持久化数据卷，保存主页配置、管理员密码哈希和恢复邮箱。更新容器时不要删除该数据卷。

如果你使用 1Panel、Nginx、Cloudflare 等方式把域名转发到容器，请保留 `-e TRUST_PROXY=1`。如果只是直接通过 `IP:21026` 访问，请删除这一整行。

### 完整删除与从零开始

如果不再使用 NEXUS HOME，或希望完全从零开始，请按顺序执行以下命令。它会删除主页容器、所有站点数据和本地 Docker 镜像；下一次部署时会重新下载镜像，并在打开 `/config` 后进入首次设置流程。

```bash
# 停止并删除主页容器；若容器不存在也不会中断命令。
docker rm -f nexus-home 2>/dev/null || true

# 删除持久化数据卷：主页配置、管理员密码哈希与恢复邮箱都会被清空。
docker volume rm nexus-home-data 2>/dev/null || true

# 删除本机已拉取的 NEXUS HOME 镜像；下次启动时需要重新 docker pull。
docker image rm yuni020126/nexus-home:latest 2>/dev/null || true
```

如果同一台服务器还运行其他使用 `yuni020126/nexus-home:latest` 镜像的服务，请跳过“删除本地镜像”这一行，避免影响这些服务。

## Compose

```bash
# 构建镜像并在后台启动服务；首次部署或修改代码后使用。
docker compose up -d --build

# 实时查看容器运行日志；按 Ctrl + C 退出日志查看，不会停止容器。
docker compose logs -f nexus-home

# 停止并删除 Compose 创建的容器；不会删除 nexus-home-data 数据卷。
docker compose down
```

## 备份

备份 `data/config.json` 与 `data/auth.json` 即可保留站点配置和管理员认证状态。
