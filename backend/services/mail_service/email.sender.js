import transporter from "./email.transporter.js";
import {
    Verification_Email_Template,
    Welcome_Email_Template,
    Reset_Password_Email_Template,
} from "./email.template.js";


const FROM_EMAIL = process.env.FROM_EMAIL;

// send verification code email
export const SendVerificationCode = async (email, verificationCode) => {
  try {
    const response = await transporter.sendMail({
      from: FROM_EMAIL,
      to: email,
      subject: "Verify your Email, Welcome to BidVault",
      html: Verification_Email_Template.replace("{verificationCode}", verificationCode),
    });

  console.log("Email sent successfully", response);
  } catch (error) {
    console.log("catch error", error);
  }
};

// send welcome email after email verification
export const WelcomeEmail = async (email, name) => {
  try {
    const response = await transporter.sendMail({
      from: FROM_EMAIL,
      to: email,
      subject: "Welcome to BidVault",
      html: Welcome_Email_Template.replace("{name}", name),
    });

    console.log("Email sent successfully", response);
  } catch (error) {
    console.log("catch error", error);
  }
};

// send reset password email
export const SendResetPwdEmail = async (email, resetPwdLink) => {
  try {
    const response = await transporter.sendMail({
      from: FROM_EMAIL,
      to: email,
      subject: "Reset your BidVault Password",
      html: Reset_Password_Email_Template.replace("{resetLink}", resetPwdLink),
    });

    console.log("Email sent successfully", response);
  } catch (error) {
    console.log("catch error", error);
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

      const response = await transporter.sendMail({
        from: FROM_EMAIL,
        to: email,
        subject: `You've Been Outbid on ${itemName} in ${title} - BidVault`,
        html: htmlContent,
      });

    console.log("Outbid email sent successfully", response);
  } catch (error) {
    console.log("Error sending outbid email", error);
  }
};