'use strict';

const TYPE_COMPATIBILITY_RULES = {
  webpage: { supportsEmbed: true, supportsQuickRead: true, supportsSize: true, supportsDisableSecurity: true },
  image: { supportsEmbed: false, supportsQuickRead: false, supportsSize: true, supportsDisableSecurity: true },
  video: { supportsEmbed: false, supportsQuickRead: false, supportsSize: true, supportsDisableSecurity: true },
  'video-site': { supportsEmbed: true, supportsQuickRead: false, supportsSize: true, supportsDisableSecurity: true },
  audio: { supportsEmbed: false, supportsQuickRead: false, supportsSize: true, supportsDisableSecurity: true },
  'audio-site': { supportsEmbed: true, supportsQuickRead: false, supportsSize: true, supportsDisableSecurity: true }
};

function getLinkType(url, baseUrl, customSites) {
  try {
    if (!url || typeof url !== 'string') return 'unknown';

    const trimmedUrl = url.trim();
    if (!trimmedUrl) return 'unknown';

    if (trimmedUrl.startsWith('data:')) {
      const dataType = trimmedUrl.slice(5).split(';')[0].toLowerCase();
      if (dataType.startsWith('image/')) return 'image';
      if (dataType.startsWith('video/')) return 'video';
      if (dataType.startsWith('audio/')) return 'audio';
      return 'webpage';
    }

    if (trimmedUrl.startsWith('blob:')) {
      return 'webpage';
    }

    if (trimmedUrl.startsWith('#') || trimmedUrl.startsWith('javascript:') ||
        trimmedUrl.startsWith('mailto:') || trimmedUrl.startsWith('tel:') ||
        trimmedUrl.startsWith('sms:') || trimmedUrl.startsWith('ftp://') ||
        trimmedUrl.startsWith('file://')) {
      return 'unknown';
    }

    const urlObj = new URL(trimmedUrl, baseUrl || 'https://example.com');
    const protocol = urlObj.protocol.toLowerCase();

    if (protocol !== 'http:' && protocol !== 'https:') {
      return 'unknown';
    }

    const pathname = urlObj.pathname.toLowerCase();
    const hostname = urlObj.hostname.toLowerCase();

    const imageExts = [
      '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico',
      '.tiff', '.tif', '.avif', '.heic', '.heif', '.raw', '.psd',
      '.jp2', '.j2k', '.jxr', '.hdp', '.wdp'
    ];
    const videoExts = [
      '.mp4', '.webm', '.mov', '.avi', '.mkv', '.flv', '.wmv',
      '.m4v', '.3gp', '.3g2', '.ts', '.mts', '.m2ts', '.vob',
      '.ogv', '.dv', '.rm', '.rmvb', '.asf'
    ];
    const audioExts = [
      '.mp3', '.wav', '.flac', '.aac', '.m4a', '.wma',
      '.opus', '.aiff', '.aif', '.ape', '.alac', '.wv',
      '.oga', '.midi', '.mid', '.amr', '.ac3', '.dts'
    ];

    const extMatch = pathname.match(/\.[a-z0-9]+$/);
    const ext = extMatch ? extMatch[0] : '';

    if (ext) {
      for (const imageExt of imageExts) {
        if (ext === imageExt) return 'image';
      }
      for (const videoExt of videoExts) {
        if (ext === videoExt) return 'video';
      }
      for (const audioExt of audioExts) {
        if (ext === audioExt) return 'audio';
      }

      if (ext === '.ogg' || ext === '.ogx') {
        if (pathname.includes('video') || pathname.includes('movie') || pathname.includes('film')) {
          return 'video';
        }
        if (pathname.includes('audio') || pathname.includes('music') || pathname.includes('song')) {
          return 'audio';
        }
        return 'audio';
      }
    }

    const defaultVideoSites = [
      { domain: 'youtube.com', exact: false },
      { domain: 'youtu.be', exact: true },
      { domain: 'bilibili.com', exact: false },
      { domain: 'b23.tv', exact: true },
      { domain: 'vimeo.com', exact: false },
      { domain: 'dailymotion.com', exact: false },
      { domain: 'dai.ly', exact: true },
      { domain: 'youku.com', exact: false },
      { domain: 'iqiyi.com', exact: false },
      { domain: 'iq.com', exact: false },
      { domain: 'tudou.com', exact: false },
      { domain: 'mgtv.com', exact: false },
      { domain: 'le.com', exact: false },
      { domain: 'pptv.com', exact: false },
      { domain: 'douyin.com', exact: false },
      { domain: 'iesdouyin.com', exact: false },
      { domain: 'tiktok.com', exact: false },
      { domain: 'twitch.tv', exact: false },
      { domain: 'netflix.com', exact: false },
      { domain: 'hulu.com', exact: false },
      { domain: 'primevideo.com', exact: false },
      { domain: 'disneyplus.com', exact: false },
      { domain: 'kuaishou.com', exact: false },
      { domain: 'jsdelivr.net', exact: false, pathCheck: '/gh/' }
    ];

    const videoSites = customSites || defaultVideoSites;

    for (const site of videoSites) {
      if (site.exact) {
        if (hostname === site.domain || hostname.endsWith('.' + site.domain)) {
          if (site.pathCheck && !pathname.startsWith(site.pathCheck)) continue;
          return 'video-site';
        }
      } else {
        if (hostname === site.domain || hostname.endsWith('.' + site.domain)) {
          if (site.pathCheck && !pathname.startsWith(site.pathCheck)) continue;
          return 'video-site';
        }
      }
    }

    const audioSites = [
      { domain: 'music.163.com', exact: true },
      { domain: 'y.qq.com', exact: true },
      { domain: 'music.qq.com', exact: true },
      { domain: 'kuwo.cn', exact: false },
      { domain: 'kugou.com', exact: false },
      { domain: 'xiami.com', exact: false },
      { domain: 'spotify.com', exact: false },
      { domain: 'open.spotify.com', exact: true },
      { domain: 'soundcloud.com', exact: false },
      { domain: 'music.apple.com', exact: true },
      { domain: 'itunes.apple.com', exact: true },
      { domain: 'pandora.com', exact: false },
      { domain: 'deezer.com', exact: false },
      { domain: 'tidal.com', exact: false },
      { domain: 'bandcamp.com', exact: false },
      { domain: 'mixcloud.com', exact: false },
      { domain: 'music.126.net', exact: true }
    ];

    for (const site of audioSites) {
      if (site.exact) {
        if (hostname === site.domain || hostname.endsWith('.' + site.domain)) {
          return 'audio-site';
        }
      } else {
        if (hostname === site.domain || hostname.endsWith('.' + site.domain)) {
          return 'audio-site';
        }
      }
    }

    return 'webpage';
  } catch (e) {
    return 'unknown';
  }
}

function normalizeSuffix(raw) {
  if (!raw) return '';
  let s = String(raw).trim();
  if (s && !s.startsWith('.')) s = '.' + s;
  return s;
}

function validateRegexPattern(pattern) {
  if (!pattern) return { valid: false, error: '正则表达式不能为空' };
  if (pattern.length > 200) return { valid: false, error: '正则表达式长度不能超过 200 字符' };
  const dangerous = /(\([^)]*[+*?]\)?[+*?])|(\([^)]*\|[^)]*\)[+*?])/;
  if (dangerous.test(pattern)) return { valid: false, error: '正则包含可能导致 ReDoS 的嵌套量词模式' };
  if ((pattern.match(/\(/g) || []).length > 10) return { valid: false, error: '正则表达式分组过多' };
  if ((pattern.match(/\[.*?\]/g) || []).length > 10) return { valid: false, error: '正则表达式字符集过多' };
  try {
    new RegExp(pattern);
    return { valid: true };
  } catch (e) {
    return { valid: false, error: '正则表达式语法错误' };
  }
}

function safeRegexMatch(pattern, str, flags) {
  const v = validateRegexPattern(pattern);
  if (!v.valid) return false;
  try {
    const r = new RegExp(pattern, flags || '');
    let done = false;
    let result = false;
    const start = Date.now();
    const t = setTimeout(() => { done = true; }, 50);
    try {
      result = r.test(str);
    } catch (e) {
      clearTimeout(t);
      return false;
    }
    clearTimeout(t);
    if (done) return false;
    if (Date.now() - start > 30) return false;
    return result;
  } catch (e) {
    return false;
  }
}

function filterCompatibleActions(rule) {
  if (!rule?.actions || !rule.actions.forceType) return rule?.actions || null;
  const comp = TYPE_COMPATIBILITY_RULES[rule.actions.forceType];
  if (!comp) return rule.actions;
  const filtered = { ...rule.actions };
  if (!comp.supportsEmbed) filtered.autoEmbed = false;
  if (!comp.supportsQuickRead) filtered.autoQuickRead = false;
  if (!comp.supportsSize) {
    filtered.previewWidth = null;
    filtered.previewHeight = null;
  }
  if (!comp.supportsDisableSecurity) filtered.disableSecurityCheck = false;
  return filtered;
}

function matchPreviewRule(url, deps) {
  const previewRules = (deps && deps.previewRules) || [];
  const _normalizeSuffix = (deps && deps.normalizeSuffix) || normalizeSuffix;
  const _safeRegexMatch = (deps && deps.safeRegexMatch) || safeRegexMatch;
  const _filterCompatibleActions = (deps && deps.filterCompatibleActions) || filterCompatibleActions;

  if (!previewRules || previewRules.length === 0 || !url) return null;

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    const pathname = urlObj.pathname;
    const fullUrl = url;

    const sortedRules = [...previewRules]
      .filter(r => r.enabled && r.matchValue)
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));

    for (const rule of sortedRules) {
      let matched = false;
      const rawMatchValue = rule.matchType === 'suffix' ? _normalizeSuffix(rule.matchValue) : rule.matchValue;
      const matchValue = rule.caseSensitive ? rawMatchValue : rawMatchValue.toLowerCase();
      const testHostname = rule.caseSensitive ? hostname : hostname.toLowerCase();
      const testPathname = rule.caseSensitive ? pathname : pathname.toLowerCase();
      const testUrl = rule.caseSensitive ? fullUrl : fullUrl.toLowerCase();

      switch (rule.matchType) {
        case 'domain':
          matched = testHostname === matchValue || testHostname.endsWith('.' + matchValue);
          break;
        case 'suffix':
          if (!matchValue || matchValue === '.') break;
          if (/[\/?#&=]/.test(matchValue)) break;
          matched = testPathname.endsWith(matchValue) || testUrl.endsWith(matchValue);
          break;
        case 'keyword':
          matched = testUrl.includes(matchValue);
          break;
        case 'regex':
          const flags = rule.caseSensitive ? '' : 'i';
          matched = _safeRegexMatch(rule.matchValue, fullUrl, flags);
          break;
        default:
          matched = false;
      }

      if (matched) {
        return { ...rule, actions: _filterCompatibleActions(rule) };
      }
    }
  } catch (e) {
    return null;
  }

  return null;
}

module.exports = {
  TYPE_COMPATIBILITY_RULES,
  getLinkType,
  normalizeSuffix,
  validateRegexPattern,
  safeRegexMatch,
  filterCompatibleActions,
  matchPreviewRule
};
