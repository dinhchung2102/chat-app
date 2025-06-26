export type FormatType = 'text' | 'username' | 'email';

export function getTypeFormat(input: string): FormatType {
  const trimmed = input.trim();

  if (!trimmed) {
    return 'text';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;

  if (emailRegex.test(trimmed)) {
    return 'email';
  }

  if (usernameRegex.test(trimmed)) {
    return 'username';
  }

  // Default to text
  return 'text';
}
