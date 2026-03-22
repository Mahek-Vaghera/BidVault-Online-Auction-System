import resend from "./email.transporter.js";
import {
  Verification_Email_Template,
  Welcome_Email_Template,
  Reset_Password_Email_Template,
  Outbid_Email_Template,
} from "./email.template.js";

const FROM_EMAIL = process.env.FROM_EMAIL || "Acme <onboarding@resend.dev>";
const MAIL_PROVIDER = (process.env.MAIL_PROVIDER || "resend").toLowerCase();

function extractEmailAddress(value) {
  const match = String(value || "").match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/);
  return match ? match[0] : "";
}

function parseFrom(from) {
  // Accept formats like: "Name <email@domain.com>" or just "email@domain.com"
  const m = /^(.*)<([^>]+)>$/.exec(from);
  if (m) return { name: m[1].trim().replace(/"/g, ""), email: m[2].trim() };

  const extractedEmail = extractEmailAddress(from);
  if (extractedEmail) {
    const name = String(from).replace(extractedEmail, "").trim().replace(/[<>"]+/g, "");
    return { name, email: extractedEmail };
  }

  return { name: "", email: String(from).trim() };
}

const sendMail = async (mailOptions, label) => {
  console.info(`[mail:${label}] sending`, {
    from: mailOptions.from,
    to: mailOptions.to,
    subject: mailOptions.subject,
    provider: MAIL_PROVIDER,
  });

  if (MAIL_PROVIDER === "brevo" || MAIL_PROVIDER === "sendinblue") {
    // Brevo (Sendinblue) API v3
    const apiKey = process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY;
    if (!apiKey) {
      const err = new Error("BREVO_API_KEY (or SENDINBLUE_API_KEY) is not set");
      console.error(`[mail:${label}] failed`, err.message);
      throw err;
    }

    const sender = parseFrom(mailOptions.from || FROM_EMAIL);
    if (!sender.email || !sender.email.includes("@")) {
      const err = new Error(`valid sender email required. Got: ${String(mailOptions.from || FROM_EMAIL)}`);
      console.error(`[mail:${label}] failed`, { message: err.message });
      throw err;
    }
    const payload = {
      sender: { name: sender.name || undefined, email: sender.email },
      to: [{ email: mailOptions.to }],
      subject: mailOptions.subject,
      htmlContent: mailOptions.html || mailOptions.htmlContent || mailOptions.text || "",
    };

    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify(payload),
    });

    const body = await res.json().catch(() => null);
    if (!res.ok) {
      console.error(`[mail:${label}] failed`, { status: res.status, body });
      const err = new Error(body?.message || `Brevo send failed with status ${res.status}`);
      throw err;
    }

    console.info(`[mail:${label}] sent successfully`, { id: body?.messageId || body?.uuid || null, from: mailOptions.from, to: mailOptions.to });
    return body;
  }

  // default: Resend
  const { data, error } = await resend.emails.send(mailOptions);

  if (error) {
    console.error(`[mail:${label}] failed`, {
      message: error?.message,
      name: error?.name,
      statusCode: error?.statusCode,
      details: error?.details,
      error,
    });
    throw error;
  }

  console.info(`[mail:${label}] sent successfully`, {
    id: data?.id,
    from: mailOptions.from,
    to: mailOptions.to,
  });
  return data;
};

// send verification code email
export const SendVerificationCode = async (email, verificationCode) => {
  try {
    await sendMail({
      from: FROM_EMAIL,
      to: email,
      subject: "Verify your Email, Welcome to BidVault",
      html: Verification_Email_Template.replace("{verificationCode}", verificationCode),
    }, "Verification email");
  } catch (error) {
    console.error("[mail:verification] error", error);
  }
};

// send welcome email after email verification
export const WelcomeEmail = async (email, name) => {
  try {
    await sendMail({
      from: FROM_EMAIL,
      to: email,
      subject: "Welcome to BidVault",
      html: Welcome_Email_Template.replace("{name}", name),
    }, "Welcome email");
  } catch (error) {
    console.error("[mail:welcome] error", error);
  }
};

// send reset password email
export const SendResetPwdEmail = async (email, resetPwdLink) => {
  try {
    await sendMail({
      from: FROM_EMAIL,
      to: email,
      subject: "Reset your BidVault Password",
      html: Reset_Password_Email_Template.replace("{resetLink}", resetPwdLink),
    }, "Reset password email");
  } catch (error) {
    console.error("[mail:reset-password] error", error);
  }
};

export const SendOutBidEmail = async (email, itemName, currentBid, maxLimit, auctionId, title) => {
  try {
    const htmlContent = Outbid_Email_Template
      .replace("{itemName}", itemName)
      .replace("{auctionTitle}", title)
      .replace("{currentBid}", currentBid)
      .replace("{maxLimit}", maxLimit)
      .replaceAll("{auctionId}", auctionId);

    await sendMail({
      from: FROM_EMAIL,
      to: email,
      subject: `You've Been Outbid on ${itemName} in ${title} - BidVault`,
      html: htmlContent,
    }, "Outbid email");
  } catch (error) {
    console.error("[mail:outbid] error", error);
  }
};