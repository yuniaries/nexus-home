const RESEND_ENDPOINT = "https://api.resend.com/emails";

export class ResendMailer {
  constructor({ apiKey = process.env.RESEND_API_KEY ?? "", from = process.env.RECOVERY_EMAIL_FROM ?? "no-reply@aries.edu.kg", fetchImpl = globalThis.fetch } = {}) {
    this.apiKey = apiKey.trim();
    this.from = from.trim();
    this.fetch = fetchImpl;
  }

  get configured() {
    return Boolean(this.apiKey && this.from && this.fetch);
  }

  async sendRecoveryCode({ to, code }) {
    if (!this.configured) throw new Error("邮件服务尚未配置。");
    const response = await this.fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `NEXUS Recovery <${this.from}>`,
        to: [to],
        subject: "NEXUS 密码恢复验证码",
        text: `您本次的恢复验证码为${code}\n\n此验证码有效期为5分钟，请勿向任何人透露。`,
      }),
    });
    if (!response.ok) throw new Error("邮件服务暂时无法投递验证码。");
  }
}
