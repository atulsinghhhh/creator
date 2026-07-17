interface SendEmailParams {
  to: string;
  subject: string;
  text: string;
}

// No real email provider is wired up yet (V0). This logs the message so links
// are usable in dev. Swap for a real provider (Resend, SES, Postmark, ...) before shipping.
async function sendEmail({ to, subject, text }: SendEmailParams) {
  console.log(`[email:stub] to=${to} subject="${subject}"\n${text}`);
}

export function sendPasswordResetEmail(to: string, resetUrl: string) {
  return sendEmail({
    to,
    subject: "Reset your password",
    text: `Reset your password: ${resetUrl}\nThis link expires in 1 hour. If you didn't request this, ignore this email.`,
  });
}

export function sendVerificationEmail(to: string, verifyUrl: string) {
  return sendEmail({
    to,
    subject: "Verify your email",
    text: `Verify your email: ${verifyUrl}\nThis link expires in 24 hours.`,
  });
}
