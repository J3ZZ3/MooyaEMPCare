/**
 * South African ID Number Validation and Extraction Utility
 * 
 * SA ID Format: YYMMDD SSSS C A Z (13 digits)
 * - YYMMDD: Date of birth (year, month, day)
 * - SSSS: Gender indicator (0000-4999 = female, 5000-9999 = male)
 * - C: Citizenship (0 = SA citizen, 1 = permanent resident)
 * - A: Usually 8 or 9
 * - Z: Checksum digit (Luhn algorithm)
 */

export interface SAIdInfo {
  isValid: boolean;
  dateOfBirth: Date | null;
  gender: "male" | "female" | null;
  isCitizen: boolean | null;
  error?: string;
}

/**
 * Validates and extracts information from a South African ID number or passport
 */
export function validateSAId(idNumber: string): SAIdInfo {
  // Remove any spaces or dashes
  const cleanId = idNumber.replace(/[\s-]/g, "").toUpperCase();

  // Check if it's a passport (6-9 alphanumeric characters)
  if (/^[A-Z0-9]{6,9}$/.test(cleanId) && !/^[0-9]{13}$/.test(cleanId)) {
    // Valid passport - no SA-specific metadata available
    return {
      isValid: true,
      dateOfBirth: null,
      gender: null,
      isCitizen: null,
    };
  }

  // Check if it's exactly 13 digits (SA ID)
  if (!/^[0-9]{13}$/.test(cleanId)) {
    return {
      isValid: false,
      dateOfBirth: null,
      gender: null,
      isCitizen: null,
      error: "Must be a valid SA ID (13 digits) or Passport (6-9 characters)",
    };
  }

  // Extract components
  const yearStr = cleanId.substring(0, 2);
  const monthStr = cleanId.substring(2, 4);
  const dayStr = cleanId.substring(4, 6);
  const genderDigits = cleanId.substring(6, 10);
  const citizenDigit = cleanId.substring(10, 11);
  const checksumDigit = parseInt(cleanId.substring(12, 13));

  // Parse date components
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);
  
  // Determine century (assume anyone born after current year is from 1900s)
  const currentYear = new Date().getFullYear();
  const currentCentury = Math.floor(currentYear / 100) * 100;
  const yearTwoDigit = parseInt(yearStr, 10);
  let year = currentCentury + yearTwoDigit;
  
  // If the year is in the future, assume it's from the previous century
  if (year > currentYear) {
    year -= 100;
  }

  // Validate date
  const dateOfBirth = new Date(year, month - 1, day);
  if (
    dateOfBirth.getFullYear() !== year ||
    dateOfBirth.getMonth() !== month - 1 ||
    dateOfBirth.getDate() !== day ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return {
      isValid: false,
      dateOfBirth: null,
      gender: null,
      isCitizen: null,
      error: "Invalid date in ID number",
    };
  }

  // Validate age (must be at least 16 years old)
  const age = Math.floor(
    (Date.now() - dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  );
  if (age < 16) {
    return {
      isValid: false,
      dateOfBirth,
      gender: null,
      isCitizen: null,
      error: "Person must be at least 16 years old",
    };
  }

  // Determine gender (0000-4999 = female, 5000-9999 = male)
  const genderValue = parseInt(genderDigits, 10);
  const gender = genderValue < 5000 ? "female" : "male";

  // Determine citizenship
  const isCitizen = citizenDigit === "0";

  // Validate checksum using Luhn algorithm
  if (!validateLuhnChecksum(cleanId)) {
    return {
      isValid: false,
      dateOfBirth,
      gender,
      isCitizen,
      error: "Invalid ID number checksum",
    };
  }

  return {
    isValid: true,
    dateOfBirth,
    gender,
    isCitizen,
  };
}

/**
 * Validates the checksum digit using the Luhn algorithm
 */
function validateLuhnChecksum(idNumber: string): boolean {
  let sum = 0;
  let shouldDouble = false;

  // Process digits from right to left (excluding the checksum digit)
  for (let i = idNumber.length - 2; i >= 0; i--) {
    let digit = parseInt(idNumber[i], 10);

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  // Calculate what the checksum should be
  const calculatedChecksum = (10 - (sum % 10)) % 10;
  const actualChecksum = parseInt(idNumber[idNumber.length - 1], 10);

  return calculatedChecksum === actualChecksum;
}

/**
 * Formats a date as YYYY-MM-DD for date input fields
 */
export function formatDateForInput(date: Date | null): string {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
