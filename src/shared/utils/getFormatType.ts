export type FormatType = 'text' | 'phone' | 'email';

export function getTypeFormat(input: string): FormatType {
  const trimmed = input.trim();

  if (!trimmed) {
    return 'text';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^(\+84|84|0)?[1-9]\d{8,9}$/;

  if (emailRegex.test(trimmed)) {
    return 'email';
  }

  const digitsOnly = trimmed.replace(/\D/g, '');

  if (
    phoneRegex.test(trimmed) ||
    (digitsOnly.length >= 9 &&
      digitsOnly.length <= 11 &&
      (digitsOnly.startsWith('0') || digitsOnly.startsWith('84')))
  ) {
    return 'phone';
  }

  // Default to text
  return 'text';
}
