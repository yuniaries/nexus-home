# syntax=docker/dockerfile:1
ARG BUILDPLATFORM

FROM --platform=$BUILDPLATFORM node:22-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM dependencies AS build
WORKDIR /app
COPY . .
RUN npm run build

FROM node:22-alpine AS production-dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

FROM node:22-alpine AS runtime
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=21026 \
  DATA_DIR=/app/data

WORKDIR /app

RUN mkdir -p /app/data && chown -R node:node /app

COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/server ./server
COPY --from=build --chown=node:node /app/config ./config
COPY --from=build --chown=node:node /app/dist ./dist

USER node

EXPOSE 21026
VOLUME ["/app/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD ["node", "-e", "const port=process.env.PORT||21026;const healthPath=process.env.SERVICE_MODE==='mail-api'?'/health':'/api/health';fetch('http://127.0.0.1:'+port+healthPath).then((response)=>{if(!response.ok)process.exit(1)}).catch(()=>process.exit(1))"]

CMD ["node", "server/index.mjs"]
