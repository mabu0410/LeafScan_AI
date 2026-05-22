import { requestJson } from './client';

interface SimpleResponse {
  success: boolean;
  message: string;
}

/**
 * Đổi mật khẩu (yêu cầu đăng nhập).
 */
export async function changePasswordApi(
  token: string,
  currentPassword: string,
  newPassword: string
): Promise<SimpleResponse> {
  const response = await requestJson<SimpleResponse>('/auth/change-password', {
    method: 'POST',
    token,
    body: { current_password: currentPassword, new_password: newPassword },
  });
  if (!response.success) {
    throw new Error(response.message || 'Đổi mật khẩu thất bại');
  }
  return response;
}

/**
 * Yêu cầu OTP reset mật khẩu (gửi về email).
 */
export async function forgotPasswordApi(email: string): Promise<SimpleResponse> {
  const response = await requestJson<SimpleResponse>('/auth/forgot-password', {
    method: 'POST',
    body: { email },
  });
  if (!response.success) {
    throw new Error(response.message || 'Gửi OTP thất bại');
  }
  return response;
}

/**
 * Xác nhận OTP và đặt mật khẩu mới.
 */
export async function resetPasswordApi(
  email: string,
  otp: string,
  newPassword: string
): Promise<SimpleResponse> {
  const response = await requestJson<SimpleResponse>('/auth/reset-password', {
    method: 'POST',
    body: { email, otp, new_password: newPassword },
  });
  if (!response.success) {
    throw new Error(response.message || 'Đặt lại mật khẩu thất bại');
  }
  return response;
}

/**
 * Xóa tài khoản vĩnh viễn (yêu cầu xác nhận mật khẩu).
 */
export async function deleteAccountApi(
  token: string,
  password: string
): Promise<SimpleResponse> {
  const response = await requestJson<SimpleResponse>('/auth/account', {
    method: 'DELETE',
    token,
    body: { password },
  });
  if (!response.success) {
    throw new Error(response.message || 'Xóa tài khoản thất bại');
  }
  return response;
}
