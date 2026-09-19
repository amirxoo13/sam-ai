const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmailField(email: string): string | null {
  if (!email.trim()) return "ایمیل را وارد کنید.";
  if (!EMAIL_RE.test(email.trim())) return "ایمیل نامعتبر است.";
  return null;
}

export function validatePasswordField(password: string): string | null {
  if (!password) return "رمز عبور را وارد کنید.";
  if (password.length < 8) return "رمز عبور باید حداقل ۸ کاراکتر باشد.";
  return null;
}

export function validateRequiredField(value: string, label: string): string | null {
  if (!value.trim()) return `${label} را وارد کنید.`;
  return null;
}

export function validateMessageField(message: string): string | null {
  if (!message.trim()) return "پیام را وارد کنید.";
  if (message.trim().length < 10) return "پیام باید حداقل ۱۰ کاراکتر باشد.";
  return null;
}

export function validateNameField(name: string): string | null {
  if (!name.trim()) return "نام را وارد کنید.";
  if (name.trim().length < 2) return "نام باید حداقل ۲ کاراکتر باشد.";
  return null;
}
