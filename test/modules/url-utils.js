'use strict';

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

function getRelativeLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(color1, color2) {
  const l1 = getRelativeLuminance(color1.r, color1.g, color1.b);
  const l2 = getRelativeLuminance(color2.r, color2.g, color2.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function getBestTextColor(bgHex) {
  const bg = hexToRgb(bgHex);
  const white = { r: 255, g: 255, b: 255 };
  const black = { r: 0, g: 0, b: 0 };
  const whiteContrast = getContrastRatio(bg, white);
  const blackContrast = getContrastRatio(bg, black);
  return whiteContrast >= blackContrast ? '#ffffff' : '#111827';
}

function darkenColor(hex, amount) {
  const rgb = hexToRgb(hex);
  const r = Math.max(0, Math.round(rgb.r * (1 - amount)));
  const g = Math.max(0, Math.round(rgb.g * (1 - amount)));
  const b = Math.max(0, Math.round(rgb.b * (1 - amount)));
  return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
}

function lightenColor(hex, amount) {
  const rgb = hexToRgb(hex);
  const r = Math.min(255, Math.round(rgb.r + (255 - rgb.r) * amount));
  const g = Math.min(255, Math.round(rgb.g + (255 - rgb.g) * amount));
  const b = Math.min(255, Math.round(rgb.b + (255 - rgb.b) * amount));
  return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
}

function getSmartContrastColors(primaryHex, secondaryHex, bgColorHex) {
  const bg = hexToRgb(bgColorHex);
  const primary = hexToRgb(primaryHex);
  const primaryLum = getRelativeLuminance(primary.r, primary.g, primary.b);
  const bgLum = getRelativeLuminance(bg.r, bg.g, bg.b);
  const contrastRatio = getContrastRatio(primary, bg);

  let adjustedPrimary = primaryHex;
  let adjustedSecondary = secondaryHex;
  let textColor = getBestTextColor(bgColorHex);

  if (contrastRatio < 3) {
    if (bgLum > 0.5) {
      adjustedPrimary = darkenColor(primaryHex, 0.3);
      adjustedSecondary = darkenColor(secondaryHex, 0.3);
    } else {
      adjustedPrimary = lightenColor(primaryHex, 0.4);
      adjustedSecondary = lightenColor(secondaryHex, 0.4);
    }
    textColor = getBestTextColor(bgColorHex);
  }

  return { adjustedPrimary, adjustedSecondary, textColor, contrastRatio };
}

function isValidUrl(url) {
  if (!url) return false;
  if (url.startsWith('javascript:')) return false;
  if (url.startsWith('mailto:')) return false;
  if (url.startsWith('tel:')) return false;
  if (url.startsWith('#')) return false;
  if (url.startsWith('about:')) return false;
  if (url.startsWith('data:')) return false;
  if (url.startsWith('chrome-extension:')) return false;
  try {
    const urlObj = new URL(url, 'https://example.com');
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch (e) {
    return false;
  }
}

function getAbsoluteUrl(url) {
  try {
    return new URL(url, 'https://example.com').href;
  } catch (e) {
    return url;
  }
}

function isInBlacklist(url, blacklist) {
  if (!blacklist || blacklist.length === 0) return false;
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return blacklist.some(domain => hostname.includes(domain.toLowerCase()));
  } catch (e) {
    return false;
  }
}

function isSameOrigin(url, origin = 'https://example.com') {
  try {
    return new URL(url).origin === origin;
  } catch (e) {
    return false;
  }
}

function getHostname(url) {
  try {
    return new URL(url).hostname;
  } catch (e) {
    return url;
  }
}

function getFaviconFromUrl(url) {
  try {
    const urlObj = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(urlObj.hostname)}&sz=32`;
  } catch (e) {
    return '';
  }
}

function escapeHtml(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

function getErrorCategory(error) {
  const message = error?.message || String(error || '');
  if (message.includes('timeout') || message.includes('超时') || message.includes('Timeout')) {
    return { type: 'timeout', label: '加载超时', icon: '⏱️' };
  }
  if (message.includes('abort') || message.includes('Abort')) {
    return { type: 'abort', label: '加载中断', icon: '⏹️' };
  }
  if (message.includes('network') || message.includes('Network') || message.includes('网络')) {
    return { type: 'network', label: '网络错误', icon: '📡' };
  }
  if (message.includes('404') || message.includes('Not Found')) {
    return { type: 'notfound', label: '资源不存在 (404)', icon: '🔍' };
  }
  if (message.includes('403') || message.includes('Forbidden')) {
    return { type: 'forbidden', label: '访问被拒绝 (403)', icon: '🔒' };
  }
  if (message.includes('5')) {
    return { type: 'server', label: '服务器错误', icon: '⚠️' };
  }
  if (message.includes('CORS') || message.includes('cross-origin') || message.includes('跨域')) {
    return { type: 'cors', label: '跨域限制', icon: '🚫' };
  }
  return { type: 'unknown', label: '加载失败', icon: '❌' };
}

function deepMerge(target, source) {
  const result = { ...target };
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

module.exports = {
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
};
