import { describe, it, expect } from 'vitest';
import { isPastDate } from '../../src/utils/dateValidator.js';

describe('Date Validator Utility', () => {
  it('should allow current time (new Date())', () => {
    expect(isPastDate(new Date())).toBe(false);
  });

  it('should allow future dates', () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    expect(isPastDate(tomorrow)).toBe(false);
    expect(isPastDate(nextYear)).toBe(false);
    expect(isPastDate(tomorrow.toISOString())).toBe(false);
  });

  it('should reject historical past dates (e.g. yesterday, last month, past years)', () => {
    const pastYear = '2020-01-01T00:00:00.000Z';
    const twoYearsAgo = '2024-05-10T12:00:00.000Z';
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

    expect(isPastDate(pastYear)).toBe(true);
    expect(isPastDate(twoYearsAgo)).toBe(true);
    expect(isPastDate(threeDaysAgo)).toBe(true);
  });

  it('should return false for invalid date strings to let date format validators handle syntax', () => {
    expect(isPastDate('invalid-date')).toBe(false);
  });
});
