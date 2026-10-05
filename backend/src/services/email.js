import "dotenv/config";
import nodemailer from "nodemailer";

function getTransport() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = process.env.SMTP_SECURE
    ? process.env.SMTP_SECURE.toLowerCase() === "true"
    : port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS?.replace(/\s+/g, "");

  if (!user || !pass || !process.env.EMAIL_FROM) {
    throw new Error("Set SMTP_USER, SMTP_PASS, and EMAIL_FROM to enable email delivery.");
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("SMTP_PORT must be a valid port number.");
  }

  return nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
}

export async function sendEmailCode({ to, code, purpose }) {
  const from = process.env.EMAIL_FROM;

  if (!["signup", "password_reset"].includes(purpose)) throw new Error("Unsupported email purpose.");
  const action = purpose === "signup" ? "verify your email address" : "reset your password";
  const subject = purpose === "signup" ? "Verify your Upang Delivers account" : "Reset your Upang Delivers password";
  const transporter = getTransport();
  await transporter.sendMail({
    from,
    to,
    subject,
    text: `Use this verification code to ${action}: ${code}\n\nThis code expires in 10 minutes. If you did not request this, you can ignore this email.`,
    html: `<p>Use this verification code to ${action}:</p><p style="font-size:28px;font-weight:bold;letter-spacing:8px">${code}</p><p>This code expires in 10 minutes. If you did not request this, you can ignore this email.</p>`,
  });
}
