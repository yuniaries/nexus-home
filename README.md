# YUNI // NEXUS HOME

一个从零实现的科技风个人主页，包含公开主页 `/` 与可视化配置台 `/config`。配置保存在服务端数据目录，保存后会同步到已经打开的主页；容器重启后配置仍然保留。

## 地址

默认端口为 `8099`：

- 主页：`http://127.0.0.1:8099/`
- 配置台：`http://127.0.0.1:8099/config`
- 局域网主页：`http://你的电脑IP:8099/`
- 局域网配置台：`http://你的电脑IP:8099/config`

局域网访问需要服务监听 `0.0.0.0`，并允许系统防火墙放行 TCP `8099` 端口。

## 本地开发

需要 Node.js 22 和 npm。

```bash
npm install
npm run dev
```

开发服务默认监听 `0.0.0.0:8099`。如果只想让本机访问，可在启动前把 `HOST` 设置为 `127.0.0.1`。

验证生产构建：

```bash
npm run build
npm start
```

## Docker Compose

先创建本地环境文件：

PowerShell：

```powershell
Copy-Item .env.example .env
docker compose up -d --build
```

Bash：

```bash
cp .env.example .env
docker compose up -d --build
```

首次打开 `/config` 时会先要求创建一个管理密码，创建后的哈希会写入服务端数据目录。后续访问都会要求这个密码。

查看运行与健康状态：

```bash
docker compose ps
docker compose logs -f nexus-home
```

停止服务但保留配置：

```bash
docker compose down
```

## 配置持久化

Compose 使用名为 `nexus-home-data` 的 Docker 持久卷挂载到容器内的 `/app/data`。首次运行时服务会从 `config/default.json` 初始化配置，之后的修改写入其中的 `config.json`。

- 升级、重建镜像和容器重启都不会删除配置。
- 备份可使用 `docker run --rm -v nexus-home-data:/data -v ${PWD}:/backup alpine tar czf /backup/nexus-home-config.tgz -C /data .`。
- 若反向代理终止 HTTPS，请把 `.env` 中的 `TRUST_PROXY` 改为 `1`，让安全会话 Cookie 正确标记为 Secure。

## 端口与访问范围

可在 `.env` 中调整：

```dotenv
BIND_ADDRESS=0.0.0.0
HOST_PORT=8099
```

- `BIND_ADDRESS=0.0.0.0`：本机与局域网均可访问。
- `BIND_ADDRESS=127.0.0.1`：仅本机或反向代理可访问。
- 修改 `HOST_PORT` 只改变宿主机端口，容器内部仍使用 `8099`。

## 安全提示

系统会在首次打开 `/config` 时进入初始化流程，先创建一个管理密码。初始化完成后，后续访问都需要使用该密码登录。生产环境建议在反向代理层启用 HTTPS、访问限速和额外的访问控制。

生成哈希的示例：

```bash
node server/hash-password.mjs "你的配置台密码"
```
