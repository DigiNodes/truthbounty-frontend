import { isSafeRenderUrl } from '../safe-url';

describe('isSafeRenderUrl', () => {
  it.each([
    'https://example.com',
    'https://example.com/path?q=1#frag',
    'http://example.com',
    'HTTP://EXAMPLE.COM',
    '/evidence/img.png',
    '/some/path',
  ])('accepts a safe URL: %s', (url) => {
    expect(isSafeRenderUrl(url)).toBe(true);
  });

  it.each([
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    '  javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
    '//evil.example',
    '//example.com/path',
    'https://',
    'http:missing-host',
    'not a url',
  ])('rejects an unsafe URL: %s', (url) => {
    expect(isSafeRenderUrl(url)).toBe(false);
  });

  it.each([
    'java\u0000script:alert(1)',
    'java\nscript:alert(1)',
    'javascript:\u0000alert(1)',
  ])('rejects control-character smuggling: (%s)', (url) => {
    expect(isSafeRenderUrl(url)).toBe(false);
  });

  it('rejects empty, whitespace-only and non-string values', () => {
    expect(isSafeRenderUrl('')).toBe(false);
    expect(isSafeRenderUrl('   ')).toBe(false);
    expect(isSafeRenderUrl(undefined)).toBe(false);
    expect(isSafeRenderUrl(null)).toBe(false);
    expect(isSafeRenderUrl(42)).toBe(false);
    expect(isSafeRenderUrl({ url: 'https://example.com' })).toBe(false);
  });
});