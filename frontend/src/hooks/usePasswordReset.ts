import { usePost } from '../lib/api';
import api from '../api';

interface ForgotPasswordInput {
  email: string;
}

interface VerifyOtpInput {
  email: string;
  otp: string;
}

interface VerifyOtpResponse {
  uid: string;
  token: string;
}

interface SetPasswordInput {
  uid: string;
  token: string;
  password: string;
  passwordConfirm: string;
}

interface MessageResponse {
  message: string;
}

export function useForgotPassword() {
  return usePost<MessageResponse, ForgotPasswordInput>({
    path: api.forgotPassword,
  });
}

export function useVerifyOtp() {
  return usePost<VerifyOtpResponse, VerifyOtpInput>({
    path: api.verifyOtp,
  });
}

export function useSetPassword() {
  return usePost<MessageResponse, SetPasswordInput>({
    path: api.setPassword,
  });
}
