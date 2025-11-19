/**
 * Parses a date value (string or Date) into a Date object.
 * If the input is a string in YYYY-MM-DD format, it's parsed as a UTC date
 * to avoid timezone shifts.
 * If the input is a Date object, it extracts the date components and creates
 * a new UTC date to avoid timezone issues.
 * 
 * @param val - Either a Date object or a string in YYYY-MM-DD format
 * @returns A Date object in UTC
 */
export function parseDateInput(val: string | Date): Date {
  if (typeof val === 'string') {
    // Check if it's in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      // Parse YYYY-MM-DD as UTC date to avoid timezone shifts
      const [year, month, day] = val.split('-').map(Number);
      return new Date(Date.UTC(year, month - 1, day));
    }
    // If it's an ISO string, parse it and extract date components
    const date = new Date(val);
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }
  // If it's a Date object, extract date components and create UTC date
  // This prevents timezone shifts when the Date was created in a different timezone
  return new Date(Date.UTC(val.getUTCFullYear(), val.getUTCMonth(), val.getUTCDate()));
}

