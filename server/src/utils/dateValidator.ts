/**
 * Date validation utility to enforce that past dates are not permitted
 * across task due dates and project start/end dates.
 */

/**
 * Checks if a date is in the past.
 * Returns true if the date is strictly before the beginning of the current day.
 * Accommodates worldwide timezone variations (up to UTC-12) so users in any global timezone
 * selecting "today" are never falsely rejected.
 */
export const isPastDate = (dateVal: string | Date): boolean => {
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return false;

  const localToday = new Date();
  localToday.setHours(0, 0, 0, 0);

  const utcToday = new Date();
  utcToday.setUTCHours(0, 0, 0, 0);

  // The earliest start-of-today timestamp worldwide (up to UTC-12)
  const earliestToday = Math.min(
    localToday.getTime(),
    utcToday.getTime() - 12 * 60 * 60 * 1000
  );

  return d.getTime() < earliestToday;
};
