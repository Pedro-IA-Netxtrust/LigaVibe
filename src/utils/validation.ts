/**
 * Validation utilities for Vibe Sport
 */

/**
 * Validates a Chilean RUT (format 12345678-K)
 */
export function validateRut(rut: string): boolean {
  if (!/^[0-9]+-[0-9kK]{1}$/.test(rut)) return false;
  
  const [num, dv] = rut.split('-');
  let total = 0;
  let multiplier = 2;
  
  for (let i = num.length - 1; i >= 0; i--) {
    total += parseInt(num[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  
  const expectedDv = 11 - (total % 11);
  const dvStr = expectedDv === 11 ? '0' : expectedDv === 10 ? 'K' : expectedDv.toString();
  
  return dvStr.toUpperCase() === dv.toUpperCase();
}

/**
 * Formats a string into a RUT format (12345678-K)
 */
export function formatRut(rut: string): string {
  const value = rut.replace(/[^0-9kK]/g, '');
  if (value.length < 2) return value;
  
  const dv = value.slice(-1);
  const num = value.slice(0, -1);
  
  return `${num}-${dv}`;
}

/**
 * Validates a Chilean phone number (format +56 9 1234 5678 or 912345678)
 */
export function validatePhone(phone: string): boolean {
  // Chilean mobile: 9 + 8 digits
  // May start with +56 or 56
  const cleanPhone = phone.replace(/\s+/g, '').replace('+', '');
  return /^(56)?9[0-9]{8}$/.test(cleanPhone);
}

/**
 * Formats a phone number for display (+56 9 1234 5678)
 */
export function formatPhone(phone: string): string {
  const clean = phone.replace(/[^0-9]/g, '');
  if (clean.length === 9 && clean.startsWith('9')) {
    return `+56 9 ${clean.slice(1, 5)} ${clean.slice(5)}`;
  }
  if (clean.length === 11 && clean.startsWith('569')) {
    return `+56 9 ${clean.slice(3, 7)} ${clean.slice(7)}`;
  }
  return phone;
}
