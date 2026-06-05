import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export const sendTherapistWelcomeEmail = async (opts: {
    to: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
}): Promise<void> => {
    const { to, firstName, phoneNumber } = opts;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
    .container { max-width: 560px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
    .header { background: #1a1a2e; padding: 32px; text-align: center; }
    .logo { font-size: 28px; font-weight: 700; color: #D29C7D; }
    .body { padding: 32px; }
    h2 { color: #1a1a2e; margin-top: 0; }
    p { color: #4b5563; line-height: 1.6; }
    .info-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 24px 0; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
    .info-label { color: #6b7280; font-size: 13px; }
    .info-value { color: #1a1a2e; font-weight: 600; font-size: 13px; font-family: monospace; }
    .steps { background: #f9fafb; border-radius: 8px; padding: 20px; margin: 16px 0; }
    .step { display: flex; gap: 12px; margin-bottom: 12px; align-items: flex-start; }
    .step-num { background: #D29C7D; color: white; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }
    .step-text { font-size: 13px; color: #4b5563; padding-top: 2px; }
    .footer { background: #f9fafb; padding: 20px 32px; text-align: center; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Detangle</div>
    </div>
    <div class="body">
      <h2>Welcome to Detangle, ${firstName}! 🎉</h2>
      <p>
        Your therapist account has been created on the Detangle platform.
        You're all set to start helping clients on their healing journey.
      </p>

      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Registered Phone</span>
          <span class="info-value">${phoneNumber}</span>
        </div>
        <div class="info-row" style="margin-bottom: 0;">
          <span class="info-label">Account Email</span>
          <span class="info-value">${to}</span>
        </div>
      </div>

      <p><strong>How to sign in:</strong></p>
      <div class="steps">
        <div class="step">
          <div class="step-num">1</div>
          <div class="step-text">Download and open the <strong>Detangle app</strong></div>
        </div>
        <div class="step">
          <div class="step-num">2</div>
          <div class="step-text">Tap <strong>Sign In</strong> on the login screen</div>
        </div>
        <div class="step">
          <div class="step-num">3</div>
          <div class="step-text">Enter your registered phone number <strong>${phoneNumber}</strong></div>
        </div>
        <div class="step">
          <div class="step-num">4</div>
          <div class="step-text" style="margin-bottom: 0;">Enter the OTP sent to your phone — you'll be taken straight to your therapist dashboard</div>
        </div>
      </div>

      <p>If you have any questions, contact us at <a href="mailto:support@detangle.in" style="color: #D29C7D;">support@detangle.in</a>.</p>
    </div>
    <div class="footer">
      © ${new Date().getFullYear()} Detangle. All rights reserved.<br/>
      This is an automated message — please do not reply.
    </div>
  </div>
</body>
</html>
`;

    await transporter.sendMail({
        from: `"Detangle Platform" <${process.env.SMTP_USER}>`,
        to,
        subject: `Welcome to Detangle — Your Therapist Account is Ready`,
        html,
    });
};
