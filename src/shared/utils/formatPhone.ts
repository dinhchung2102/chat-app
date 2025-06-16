export function formatPhone(phone: string, isQuery = false): string {
  // Loại bỏ tất cả ký tự không phải số
  let digits = phone.replace(/\D/g, '');

  if (isQuery) {
    // Nếu số bắt đầu bằng 0 thì thay bằng +84
    if (digits.startsWith('0')) {
      digits = '%2B' + digits.slice(1);
    } else if (!digits.startsWith('84')) {
      // Nếu không bắt đầu bằng 0 hoặc 84, thêm +84 vào đầu
      digits = '%2B' + digits;
    } else {
      digits = '%2B' + digits;
    }
    return digits;
  } else {
    // Nếu số bắt đầu bằng 0 thì thay bằng +84
    if (digits.startsWith('0')) {
      digits = '+84' + digits.slice(1);
    } else if (!digits.startsWith('84')) {
      // Nếu không bắt đầu bằng 0 hoặc 84, thêm +84 vào đầu
      digits = '+84' + digits;
    } else {
      digits = '+' + digits;
    }

    return digits;
  }
}
