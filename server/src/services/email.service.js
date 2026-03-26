const { Resend } = require("resend");
const logger = require("../utils/logger");

class EmailService {
  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
    this.from = process.env.EMAIL_FROM || "onboarding@resend.dev";
  }

  async sendMail({ to, subject, html }) {
    try {
      const { data, error } = await this.resend.emails.send({
        from: this.from,
        to,
        subject,
        html,
      });

      if (error) {
        logger.error(`Gagal mengirim email ke ${to}:`, error);
        throw new Error(error.message);
      }

      logger.info(`Email terkirim ke ${to}: ${data.id}`);
      return data;
    } catch (error) {
      logger.error(`Gagal mengirim email ke ${to}:`, error);
      throw error;
    }
  }

  async sendPasswordResetEmail(email, resetUrl) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a73e8;">Reset Password</h2>
        <p>Hai,</p>
        <p>Kami menerima permintaan untuk mereset password akun kamu. Klik tombol di bawah untuk membuat password baru:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #1a73e8; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-size: 16px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">Tautan ini berlaku selama <strong>1 jam</strong>. Jika kamu tidak meminta reset password, abaikan email ini.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">YukNgaji Surabaya</p>
      </div>
    `;

    return this.sendMail({
      to: email,
      subject: "Reset Password — YukNgaji Surabaya",
      html,
    });
  }

  async sendEmailVerificationEmail(email, verificationUrl) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a73e8;">Verifikasi Email</h2>
        <p>Hai,</p>
        <p>Terima kasih sudah mendaftar. Klik tombol di bawah untuk memverifikasi email kamu dan mengaktifkan akun:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #1a73e8; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-size: 16px; display: inline-block;">
            Verifikasi Email
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">Tautan ini berlaku selama <strong>24 jam</strong>. Jika kamu tidak merasa mendaftar, abaikan email ini.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">YukNgaji Surabaya</p>
      </div>
    `;

    return this.sendMail({
      to: email,
      subject: "Verifikasi Email — YukNgaji Surabaya",
      html,
    });
  }

  async sendWorkspaceInvitationEmail(
    email,
    inviterName,
    workspaceName,
    inviteUrl,
    customMessage,
  ) {
    const messageBlock = customMessage
      ? `<p style="background: #f8f9fa; padding: 12px 16px; border-left: 3px solid #1a73e8; border-radius: 4px; color: #444; font-style: italic; margin: 16px 0;">"${customMessage}"</p>`
      : "";

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a73e8;">Undangan Workspace</h2>
        <p>Hai,</p>
        <p><strong>${inviterName}</strong> mengundang kamu untuk bergabung ke workspace <strong>"${workspaceName}"</strong> di YukNgaji Surabaya.</p>
        ${messageBlock}
        <div style="text-align: center; margin: 30px 0;">
          <a href="${inviteUrl}" 
             style="background-color: #1a73e8; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-size: 16px; display: inline-block;">
            Bergabung Sekarang
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">Undangan ini berlaku selama <strong>7 hari</strong>. Jika kamu tidak mengenal pengirim, abaikan email ini.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">YukNgaji Surabaya</p>
      </div>
    `;

    return this.sendMail({
      to: email,
      subject: `Undangan Workspace "${workspaceName}" — YukNgaji Surabaya`,
      html,
    });
  }
}

module.exports = new EmailService();
