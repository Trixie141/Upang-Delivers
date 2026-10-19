import "dotenv/config";

const BREVO_EMAIL_API = "https://api.brevo.com/v3/smtp/email";

function getSender() {
  const from = process.env.EMAIL_FROM?.trim();
  if (!from) throw new Error("Set EMAIL_FROM to a verified Brevo sender address.");

  const formatted = /^(.*?)\s*<([^<>]+)>$/.exec(from);
  if (formatted) {
    return {
      name: formatted[1].trim().replace(/^['"]|['"]$/g, "") || "Upang Delivers",
      email: formatted[2].trim(),
    };
  }

  return { name: "Upang Delivers", email: from };
}

async function sendThroughBrevo({ to, subject, text, html }) {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  if (!apiKey) throw new Error("Set BREVO_API_KEY to enable email delivery.");

  const response = await fetch(BREVO_EMAIL_API, {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: getSender(),
      to: [{ email: to }],
      subject,
      textContent: text,
      htmlContent: html,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const responseBody = await response.text().catch(() => "");
    let detail = "";
    try {
      const parsed = JSON.parse(responseBody);
      detail = parsed.message || parsed.code || "";
    } catch {
      detail = responseBody.slice(0, 300);
    }
    throw new Error(`Brevo email API returned ${response.status}${detail ? `: ${detail}` : ""}.`);
  }
}

export async function sendEmailCode({ to, code, purpose }) {
  if (!["signup", "password_reset", "admin_login"].includes(purpose)) {
    throw new Error("Unsupported email purpose.");
  }

  const action = purpose === "signup"
    ? "verify your email address"
    : purpose === "password_reset"
      ? "reset your password"
      : "complete your administrator sign-in";
  const subject = purpose === "signup"
    ? "Verify your Upang Delivers account"
    : purpose === "password_reset"
      ? "Reset your Upang Delivers password"
      : "Your Upang Delivers admin sign-in code";
  const expiresIn = purpose === "admin_login" ? 5 : 10;
  const text = `Use this verification code to ${action}: ${code}\n\nThis code expires in ${expiresIn} minutes. If you did not request this, you can ignore this email.`;
  const html = `<p>Use this verification code to ${action}:</p><p style="font-size:28px;font-weight:bold;letter-spacing:8px">${code}</p><p>This code expires in ${expiresIn} minutes. If you did not request this, you can ignore this email.</p>`;

  await sendThroughBrevo({ to, subject, text, html });
}
