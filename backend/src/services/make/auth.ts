import { webhookUrl, postOptionalWebhook } from './http.js';

export async function sendPasswordSetEmail(
  email: string,
  name: string,
  setPasswordLink: string,
): Promise<void> {
  await postOptionalWebhook(
    webhookUrl('webhookPasswordSet'),
    { email, name, set_password_link: setPasswordLink },
    'Password set email',
  );
}

export async function sendOtpEmail(email: string, name: string, otpCode: string): Promise<void> {
  await postOptionalWebhook(
    webhookUrl('webhookOtp'),
    { email, name, otp_code: otpCode },
    'OTP email',
  );
}
