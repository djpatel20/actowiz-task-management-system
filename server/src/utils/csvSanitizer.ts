/**
 * Formula Injection Defense (CSV Injection / DDE attack prevention)
 * If a string starts with =, +, -, @, \t, or \r, prepend a single quote (')
 * so that spreadsheet engines (Excel, Google Sheets) treat it strictly as text.
 */
export const sanitizeCsvCell = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }

  const str = String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }

  return str;
};
