import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env.js';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!env.SMTP_HOST) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE === 'true',
      ...(env.SMTP_USER ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASS ?? '' } } : {}),
    });
  }
  return transporter;
}

function escapeHtml(value: string): string {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return value.replace(/[&<>"']/g, (c) => map[c] as string);
}

export class MailService {
  async send(message: MailMessage): Promise<void> {
    const tx = getTransporter();
    if (!tx) {
      if (env.NODE_ENV === 'production') {
        console.error('SMTP_HOST is not configured: email to', message.to, 'was not sent');
      } else {
        // Development fallback so the flow can be tested without an SMTP server
        console.log(`\n[dev mail] To: ${message.to}\nSubject: ${message.subject}\n${message.text}\n`);
      }
      return;
    }
    await tx.sendMail({ from: env.MAIL_FROM, ...message });
  }

  async sendPasswordReset(to: string, fullName: string, resetUrl: string): Promise<void> {
    const minutes = env.PASSWORD_RESET_EXPIRES_MINUTES;
    const name = escapeHtml(fullName);
    await this.send({
      to,
      subject: 'Reset your password | የይለፍ ቃል ማስመለስ',
      text: [
        `Hello ${fullName},`,
        '',
        `We received a request to reset your password. Open this link within ${minutes} minutes:`,
        resetUrl,
        '',
        'If you did not request this, you can ignore this email; your password stays the same.',
        '',
        `ሰላም ${fullName}፣ የይለፍ ቃልዎን ለመቀየር ጥያቄ ደርሶናል። ከላይ ያለውን አገናኝ በ${minutes} ደቂቃ ውስጥ ይክፈቱ። ጥያቄውን ካላቀረቡ ይህን መልእክት ችላ ይበሉ።`,
      ].join('\n'),
      html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#1c1917">
  <h2 style="color:#0C2340">Reset your password</h2>
  <p>Hello ${name},</p>
  <p>We received a request to reset your password. This link works for ${minutes} minutes and only once.</p>
  <p><a href="${resetUrl}" style="display:inline-block;background:#0C2340;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:bold">Reset password</a></p>
  <p style="font-size:12px;color:#57534e">Or copy this link: ${resetUrl}</p>
  <p style="font-size:13px">If you did not request this, ignore this email; your password stays the same.</p>
  <hr style="border:none;border-top:1px solid #e7e5e4">
  <p style="font-size:13px">ሰላም ${name}፣ የይለፍ ቃልዎን ለመቀየር ጥያቄ ደርሶናል። አገናኙ ለ${minutes} ደቂቃ እና ለአንድ ጊዜ ብቻ ይሰራል። ጥያቄውን ካላቀረቡ ይህን መልእክት ችላ ይበሉ።</p>
</div>`,
    });
  }

  async sendPasswordChanged(to: string, fullName: string): Promise<void> {
    const name = escapeHtml(fullName);
    await this.send({
      to,
      subject: 'Your password was changed | የይለፍ ቃልዎ ተቀይሯል',
      text: `Hello ${fullName}, your password was just changed and you were signed out on all devices. If this was not you, contact an administrator immediately.\n\nየይለፍ ቃልዎ ተቀይሯል። እርስዎ ካልሆኑ ወዲያውኑ አስተዳዳሪን ያነጋግሩ።`,
      html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#1c1917"><p>Hello ${name},</p><p>Your password was just changed and you were signed out on all devices. If this was not you, contact an administrator immediately.</p><p style="font-size:13px">የይለፍ ቃልዎ ተቀይሯል። እርስዎ ካልሆኑ ወዲያውኑ አስተዳዳሪን ያነጋግሩ።</p></div>`,
    });
  }
}

export const mailService = new MailService();
