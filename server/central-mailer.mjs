const DEFAULT_RELAY_URL = "https://mailapi.020126520.xyz/v1/recovery-email";

export class CentralRecoveryMailer {
  constructor({ endpoint = process.env.CENTRAL_MAIL_API_URL ?? DEFAULT_RELAY_URL, fetchImpl = globalThis.fetch } = {}) {
    this.endpoint = endpoint.trim();
    this.fetch = fetchImpl;
  }

  get configured() {
    return Boolean(this.endpoint && this.fetch);
  }

  async sendRecoveryCode({ to, code }) {
    if (!this.configured) throw new Error("中央邮件服务未配置。");
    const response = await this.fetch(this.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "NEXUS-Home/1.0" },
      body: JSON.stringify({ to, code }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      const error = new Error(result.error || "中央邮件服务暂时无法投递验证码。");
      error.status = response.status;
      error.retryAfterSeconds = result.retryAfterSeconds;
      throw error;
    }
  }
}
