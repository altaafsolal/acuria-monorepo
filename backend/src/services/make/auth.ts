import { webhookUrl, postOptionalWebhook } from "./http.js";

// Platform (super admin) emails have no tenant; send this sentinel so the email
// token broker can route them (…/tenants/SUPER_ADMIN/email/token) instead of
// receiving an empty id.
const SUPER_ADMIN_TENANT = "SUPER_ADMIN";

export async function sendPasswordSetEmail(
  email: string,
  name: string,
  setPasswordLink: string,
  tenantName = "Acuria",
  tenantEmail = "",
  tenantId = "",
): Promise<void> {
  await postOptionalWebhook(
    webhookUrl("webhookPasswordSet"),
    {
      email,
      name,
      set_password_link: setPasswordLink,
      tenant_name: tenantName,
      tenant_email: tenantEmail,
      tenant_id: tenantId || SUPER_ADMIN_TENANT,
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
  tenantId = "",
): Promise<void> {
  await postOptionalWebhook(
    webhookUrl("webhookOtp"),
    {
      email,
      name,
      otp_code: otpCode,
      tenant_name: tenantName,
      tenant_email: tenantEmail,
      tenant_id: tenantId || SUPER_ADMIN_TENANT,
    },
    "OTP email",
  );
}
