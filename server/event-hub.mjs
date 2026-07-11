function serializeConfigEvent(config) {
  return `id: ${config.revision}\nevent: config\ndata: ${JSON.stringify(config)}\n\n`;
}

export class ConfigEventHub {
  constructor({ heartbeatMs = 15_000, maxClients = 96, slowClientMs = 30_000 } = {}) {
    this.clients = new Set();
    this.closed = false;
    this.maxClients = maxClients;
    this.slowClientMs = slowClientMs;
    this.heartbeat = setInterval(() => this.#heartbeat(), heartbeatMs);
    this.heartbeat.unref?.();
  }

  connect(request, response, initialConfig) {
    if (this.closed) {
      response.status(503).json({ code: "EVENTS_UNAVAILABLE", error: "实时配置服务正在关闭。" });
      return;
    }
    if (this.clients.size >= this.maxClients) {
      response.status(503).json({ code: "EVENT_CAPACITY", error: "实时配置连接已满，请稍后重试。" });
      return;
    }

    response.status(200);
    response.set({
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-store, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    response.flushHeaders?.();
    response.socket?.setKeepAlive?.(true);
    response.write("retry: 2000\n\n");
    response.write(serializeConfigEvent(initialConfig));

    this.clients.add(response);
    const remove = () => this.#remove(response);
    request.once("close", remove);
    response.once("close", remove);
    response.once("error", remove);
  }

  publish(config) {
    if (this.closed) return;
    const event = serializeConfigEvent(config);
    for (const response of this.clients) {
      if (response.destroyed || response.writableEnded) {
        this.clients.delete(response);
        continue;
      }
      this.#write(response, event);
    }
  }

  #heartbeat() {
    if (this.closed) return;
    const heartbeat = `: heartbeat ${Date.now()}\n\n`;
    for (const response of this.clients) {
      if (response.destroyed || response.writableEnded) {
        this.clients.delete(response);
        continue;
      }
      this.#write(response, heartbeat);
    }
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    clearInterval(this.heartbeat);
    for (const response of this.clients) {
      clearTimeout(response.__nexusSlowTimer);
      response.end();
    }
    this.clients.clear();
  }

  #remove(response) {
    clearTimeout(response.__nexusSlowTimer);
    this.clients.delete(response);
  }

  #write(response, payload) {
    if (response.__nexusBlocked) return;
    try {
      if (response.write(payload)) return;
      response.__nexusBlocked = true;
      const recover = () => {
        clearTimeout(response.__nexusSlowTimer);
        response.__nexusBlocked = false;
      };
      response.once("drain", recover);
      response.__nexusSlowTimer = setTimeout(() => {
        if (!response.__nexusBlocked) return;
        this.#remove(response);
        response.destroy();
      }, this.slowClientMs);
      response.__nexusSlowTimer.unref?.();
    } catch {
      this.#remove(response);
      response.destroy();
    }
  }
}
