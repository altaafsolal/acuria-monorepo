import { webhookUrl, postOptionalWebhook } from "./http.js";

export async function sendPasswordSetEmail(
  email: string,
  name: string,
  setPasswordLink: string,
  tenantName = "Acuria",
  tenantEmail = "",
): Promise<void> {
  console.log({
    email,
    name,
    set_password_link: setPasswordLink,
    tenant_name: tenantName,
    tenant_email: tenantEmail,
  });

  await postOptionalWebhook(
    webhookUrl("webhookPasswordSet"),
    {
      email,
      name,
      set_password_link: setPasswordLink,
      tenant_name: tenantName,
      tenant_email: tenantEmail,
    },
    "Password set email",
  );
}

export async function sendOtpEmail(
  email: string,
  name: string,
  otpCode: string,
  tenantName = "Acuria",
  tenantEmail = "",
): Promise<void> {
  await postOptionalWebhook(
    webhookUrl("webhookOtp"),
    {
      email,
      name,
      otp_code: otpCode,
      tenant_name: tenantName,
      tenant_email: tenantEmail,
    },
    "OTP email",
  );
}
