import { formatDeadline, formatFreshness } from '../format';
describe('format.ts', () => {
  let dateSpy: jest.SpyInstance;
  beforeAll(() => {
    dateSpy = jest.spyOn(Date, 'now').mockImplementation(() => new Date('2026-09-26T12:00:00Z').getTime());
  });
  afterAll(() => { dateSpy.mockRestore(); });
  describe('formatDeadline', () => {
    it('returns No deadline for invalid', () => { expect(formatDeadline(undefined)).toBe('No deadline'); });
    it('returns under 1h left', () => { expect(formatDeadline('2026-09-26T12:30:00Z')).toBe('under 1h left'); });
    it('rounds up future hours', () => { expect(formatDeadline('2026-09-26T13:30:00Z')).toBe('2h left'); });
  });
  describe('formatFreshness', () => {
    it('returns Unknown for invalid', () => { expect(formatFreshness(undefined)).toBe('Unknown'); });
    it('formats UTC time', () => { expect(formatFreshness('2026-09-26T12:15:30Z')).toBe('Updated 12:15:30 PM'); });
  });
});