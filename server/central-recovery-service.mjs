const DEFAULT_BASE_URL = "https://mailapi.020126520.xyz";

export class CentralRecoveryService {
  constructor({ baseUrl = process.env.CENTRAL_MAIL_API_URL ?? DEFAULT_BASE_URL, fetchImpl = globalThis.fetch } = {}) {
    this.baseUrl = baseUrl.trim().replace(/\/$/, "");
    this.fetch = fetchImpl;
  }
  get configured() { return Boolean(this.baseUrl && this.fetch); }
  async #request(path, options = {}) {
    const response = await this.fetch(`${this.baseUrl}${path}`, { ...options, headers: { "Content-Type": "application/json", "User-Agent": "NEXUS-Home/1.0", ...(options.headers ?? {}) }, signal: AbortSignal.timeout(10_000) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.error || "中央恢复服务暂时不可用。");
      error.status = response.status;
      error.retryAfterSeconds = payload.retryAfterSeconds;
      throw error;
    }
    return payload;
  }
  async status({ scope, email }) { return this.#request("/v1/recovery-email", { method: "POST", body: JSON.stringify({ action: "status", scope, to: email }) }); }
  async issue({ scope, email }) { return this.#request("/v1/recovery-email", { method: "POST", body: JSON.stringify({ scope, to: email }) }); }
  async verify({ scope, email, code }) { return this.#request("/v1/recovery-email", { method: "POST", body: JSON.stringify({ action: "verify", scope, to: email, code }) }); }
}
