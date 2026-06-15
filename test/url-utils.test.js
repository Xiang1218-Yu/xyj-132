'use strict';

const {
  hexToRgb,
  getRelativeLuminance,
  getContrastRatio,
  getBestTextColor,
  getSmartContrastColors,
  darkenColor,
  lightenColor,
  isValidUrl,
  getAbsoluteUrl,
  isInBlacklist,
  isSameOrigin,
  getHostname,
  getFaviconFromUrl,
  escapeHtml,
  formatFileSize,
  getErrorCategory,
  deepMerge
} = require('./modules/url-utils');

describe('hexToRgb', () => {
  test('valid hex with #', () => {
    expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
  });

  test('valid hex without #', () => {
    expect(hexToRgb('00ff00')).toEqual({ r: 0, g: 255, b: 0 });
  });

  test('invalid hex returns zeroed object', () => {
    expect(hexToRgb('invalid')).toEqual({ r: 0, g: 0, b: 0 });
  });

  test('short hex #fff returns zeroed object (no 6-digit match)', () => {
    expect(hexToRgb('#fff')).toEqual({ r: 0, g: 0, b: 0 });
  });
});

describe('getRelativeLuminance', () => {
  test('white returns 1', () => {
    expect(getRelativeLuminance(255, 255, 255)).toBeCloseTo(1, 5);
  });

  test('black returns 0', () => {
    expect(getRelativeLuminance(0, 0, 0)).toBeCloseTo(0, 5);
  });

  test('mid values return between 0 and 1', () => {
    const lum = getRelativeLuminance(128, 128, 128);
    expect(lum).toBeGreaterThan(0);
    expect(lum).toBeLessThan(1);
  });

  test('low values use c/12.92 path (c <= 0.03928)', () => {
    const lum = getRelativeLuminance(10, 10, 10);
    expect(lum).toBeGreaterThan(0);
    expect(lum).toBeLessThan(0.01);
  });
});

describe('getContrastRatio', () => {
  test('white vs black returns 21', () => {
    expect(getContrastRatio({ r: 255, g: 255, b: 255 }, { r: 0, g: 0, b: 0 })).toBeCloseTo(21, 5);
  });

  test('same color returns 1', () => {
    expect(getContrastRatio({ r: 128, g: 128, b: 128 }, { r: 128, g: 128, b: 128 })).toBeCloseTo(1, 5);
  });

  test('white vs white returns 1', () => {
    expect(getContrastRatio({ r: 255, g: 255, b: 255 }, { r: 255, g: 255, b: 255 })).toBeCloseTo(1, 5);
  });
});

describe('getBestTextColor', () => {
  test('white bg returns dark text', () => {
    expect(getBestTextColor('#ffffff')).toBe('#111827');
  });

  test('black bg returns white text', () => {
    expect(getBestTextColor('#000000')).toBe('#ffffff');
  });

  test('light bg returns dark text', () => {
    expect(getBestTextColor('#ffcccc')).toBe('#111827');
  });

  test('dark bg returns white text', () => {
    expect(getBestTextColor('#111827')).toBe('#ffffff');
  });
});

describe('darkenColor', () => {
  test('darkens red by 0.5', () => {
    expect(darkenColor('#ff0000', 0.5)).toBe('#800000');
  });

  test('black cannot go below 0', () => {
    expect(darkenColor('#000000', 0.5)).toBe('#000000');
  });

  test('zero amount returns original', () => {
    expect(darkenColor('#ffffff', 0)).toBe('#ffffff');
  });
});

describe('lightenColor', () => {
  test('lightens black by 0.5', () => {
    expect(lightenColor('#000000', 0.5)).toBe('#808080');
  });

  test('white cannot go above 255', () => {
    expect(lightenColor('#ffffff', 0.5)).toBe('#ffffff');
  });

  test('zero amount returns original', () => {
    expect(lightenColor('#ff0000', 0)).toBe('#ff0000');
  });
});

describe('getSmartContrastColors', () => {
  test('good contrast returns no adjustment', () => {
    const result = getSmartContrastColors('#ffffff', '#cccccc', '#000000');
    expect(result.adjustedPrimary).toBe('#ffffff');
    expect(result.adjustedSecondary).toBe('#cccccc');
    expect(result.contrastRatio).toBeGreaterThanOrEqual(3);
  });

  test('poor contrast with light bg darkens colors', () => {
    const result = getSmartContrastColors('#ffffff', '#eeeeee', '#f0f0f0');
    expect(result.contrastRatio).toBeLessThan(3);
    expect(result.adjustedPrimary).not.toBe('#ffffff');
    expect(result.adjustedSecondary).not.toBe('#eeeeee');
  });

  test('poor contrast with dark bg lightens colors', () => {
    const result = getSmartContrastColors('#222222', '#333333', '#000000');
    expect(result.contrastRatio).toBeLessThan(3);
    expect(result.adjustedPrimary).not.toBe('#222222');
    expect(result.adjustedSecondary).not.toBe('#333333');
  });

  test('returns textColor and contrastRatio', () => {
    const result = getSmartContrastColors('#ffffff', '#cccccc', '#000000');
    expect(result).toHaveProperty('textColor');
    expect(result).toHaveProperty('contrastRatio');
    expect(typeof result.contrastRatio).toBe('number');
  });
});

describe('isValidUrl', () => {
  test('null returns false', () => {
    expect(isValidUrl(null)).toBe(false);
  });

  test('javascript: returns false', () => {
    expect(isValidUrl('javascript:alert(1)')).toBe(false);
  });

  test('mailto: returns false', () => {
    expect(isValidUrl('mailto:test@example.com')).toBe(false);
  });

  test('tel: returns false', () => {
    expect(isValidUrl('tel:+1234567890')).toBe(false);
  });

  test('#anchor returns false', () => {
    expect(isValidUrl('#anchor')).toBe(false);
  });

  test('about:blank returns false', () => {
    expect(isValidUrl('about:blank')).toBe(false);
  });

  test('data: returns false', () => {
    expect(isValidUrl('data:text/html,<h1>hi</h1>')).toBe(false);
  });

  test('chrome-extension: returns false', () => {
    expect(isValidUrl('chrome-extension://abc/popup.html')).toBe(false);
  });

  test('https:// URL returns true', () => {
    expect(isValidUrl('https://example.com')).toBe(true);
  });

  test('http:// URL returns true', () => {
    expect(isValidUrl('http://example.com')).toBe(true);
  });

  test('relative path resolves with base and returns true', () => {
    expect(isValidUrl('/path')).toBe(true);
  });

  test('invalid URL that throws returns false', () => {
    expect(isValidUrl('http://[::1:bad')).toBe(false);
  });
});

describe('getAbsoluteUrl', () => {
  test('absolute URL returns same', () => {
    expect(getAbsoluteUrl('https://example.com/page')).toBe('https://example.com/page');
  });

  test('relative URL resolves to full URL', () => {
    expect(getAbsoluteUrl('/path')).toBe('https://example.com/path');
  });

  test('invalid URL returns as-is', () => {
    expect(getAbsoluteUrl('http://[::1:bad')).toBe('http://[::1:bad');
  });
});

describe('isInBlacklist', () => {
  test('empty blacklist returns false', () => {
    expect(isInBlacklist('https://evil.com', [])).toBe(false);
  });

  test('URL in blacklist returns true', () => {
    expect(isInBlacklist('https://evil.com', ['evil.com'])).toBe(true);
  });

  test('URL not in blacklist returns false', () => {
    expect(isInBlacklist('https://good.com', ['evil.com'])).toBe(false);
  });

  test('invalid URL returns false', () => {
    expect(isInBlacklist(':::bad', ['evil.com'])).toBe(false);
  });

  test('null blacklist returns false', () => {
    expect(isInBlacklist('https://evil.com', null)).toBe(false);
  });
});

describe('isSameOrigin', () => {
  test('same origin returns true', () => {
    expect(isSameOrigin('https://example.com/page', 'https://example.com')).toBe(true);
  });

  test('different origin returns false', () => {
    expect(isSameOrigin('https://other.com/page', 'https://example.com')).toBe(false);
  });

  test('invalid URL returns false', () => {
    expect(isSameOrigin(':::bad', 'https://example.com')).toBe(false);
  });

  test('default origin parameter works', () => {
    expect(isSameOrigin('https://example.com/page')).toBe(true);
  });
});

describe('getHostname', () => {
  test('valid URL returns hostname', () => {
    expect(getHostname('https://www.example.com/path')).toBe('www.example.com');
  });

  test('invalid URL returns url as-is', () => {
    expect(getHostname('not-a-url')).toBe('not-a-url');
  });
});

describe('getFaviconFromUrl', () => {
  test('valid URL returns Google favicon URL', () => {
    const result = getFaviconFromUrl('https://www.example.com/page');
    expect(result).toBe('https://www.google.com/s2/favicons?domain=www.example.com&sz=32');
  });

  test('invalid URL returns empty string', () => {
    expect(getFaviconFromUrl('not-a-url')).toBe('');
  });
});

describe('escapeHtml', () => {
  test('plain text unchanged', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
  });

  test('escapes angle brackets', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
  });

  test('escapes double quotes', () => {
    expect(escapeHtml('"quotes"')).toBe('&quot;quotes&quot;');
  });

  test('escapes single quotes', () => {
    expect(escapeHtml("it's")).toBe('it&#39;s');
  });

  test('escapes ampersand', () => {
    expect(escapeHtml('&')).toBe('&amp;');
  });
});

describe('formatFileSize', () => {
  test('0 returns empty string', () => {
    expect(formatFileSize(0)).toBe('');
  });

  test('null returns empty string', () => {
    expect(formatFileSize(null)).toBe('');
  });

  test('undefined returns empty string', () => {
    expect(formatFileSize(undefined)).toBe('');
  });

  test('500 B', () => {
    expect(formatFileSize(500)).toBe('500 B');
  });

  test('1.0 KB', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB');
  });

  test('1.0 MB', () => {
    expect(formatFileSize(1048576)).toBe('1.0 MB');
  });

  test('1.00 GB', () => {
    expect(formatFileSize(1073741824)).toBe('1.00 GB');
  });

  test('1.5 KB', () => {
    expect(formatFileSize(1536)).toBe('1.5 KB');
  });
});

describe('getErrorCategory', () => {
  test('timeout message', () => {
    expect(getErrorCategory(new Error('timeout')).type).toBe('timeout');
  });

  test('超时 message', () => {
    expect(getErrorCategory(new Error('超时')).type).toBe('timeout');
  });

  test('Timeout message', () => {
    expect(getErrorCategory(new Error('Timeout')).type).toBe('timeout');
  });

  test('abort message', () => {
    expect(getErrorCategory(new Error('abort')).type).toBe('abort');
  });

  test('network message', () => {
    expect(getErrorCategory(new Error('network')).type).toBe('network');
  });

  test('网络 message', () => {
    expect(getErrorCategory(new Error('网络')).type).toBe('network');
  });

  test('404 message', () => {
    expect(getErrorCategory(new Error('404')).type).toBe('notfound');
  });

  test('Not Found message', () => {
    expect(getErrorCategory(new Error('Not Found')).type).toBe('notfound');
  });

  test('403 message', () => {
    expect(getErrorCategory(new Error('403')).type).toBe('forbidden');
  });

  test('Forbidden message', () => {
    expect(getErrorCategory(new Error('Forbidden')).type).toBe('forbidden');
  });

  test('500 message', () => {
    expect(getErrorCategory(new Error('500')).type).toBe('server');
  });

  test('CORS message', () => {
    expect(getErrorCategory(new Error('CORS error')).type).toBe('cors');
  });

  test('cross-origin message', () => {
    expect(getErrorCategory(new Error('cross-origin blocked')).type).toBe('cors');
  });

  test('跨域 message', () => {
    expect(getErrorCategory(new Error('跨域问题')).type).toBe('cors');
  });

  test('unknown message', () => {
    expect(getErrorCategory(new Error('something else')).type).toBe('unknown');
  });

  test('null error returns unknown', () => {
    expect(getErrorCategory(null).type).toBe('unknown');
  });

  test('string error checks the string', () => {
    expect(getErrorCategory('timeout occurred').type).toBe('timeout');
  });
});

describe('deepMerge', () => {
  test('simple merge', () => {
    expect(deepMerge({ a: 1 }, { b: 2 })).toEqual({ a: 1, b: 2 });
  });

  test('nested object merge (recursive call)', () => {
    expect(deepMerge({ a: { x: 1 } }, { a: { y: 2 } })).toEqual({ a: { x: 1, y: 2 } });
  });

  test('array handling (replaced, not deep merged)', () => {
    expect(deepMerge({ a: [1, 2] }, { a: [3, 4] })).toEqual({ a: [3, 4] });
  });

  test('empty target', () => {
    expect(deepMerge({}, { a: 1, b: 2 })).toEqual({ a: 1, b: 2 });
  });

  test('empty source', () => {
    expect(deepMerge({ a: 1 }, {})).toEqual({ a: 1 });
  });

  test('nested object in source but missing from target uses empty object fallback', () => {
    expect(deepMerge({}, { a: { x: 1 } })).toEqual({ a: { x: 1 } });
  });
});
