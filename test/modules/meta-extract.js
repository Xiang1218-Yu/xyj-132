const CACHE_TIERS = {
  webpage: { ttl: 10 * 60 * 1000, maxSize: 60 },
  image: { ttl: 30 * 60 * 1000, maxSize: 40 },
  video: { ttl: 15 * 60 * 1000, maxSize: 20 },
  'video-site': { ttl: 15 * 60 * 1000, maxSize: 20 },
  audio: { ttl: 20 * 60 * 1000, maxSize: 20 },
  'audio-site': { ttl: 20 * 60 * 1000, maxSize: 20 },
  snapshot: { ttl: 5 * 60 * 1000, maxSize: 30 },
  default: { ttl: 10 * 60 * 1000, maxSize: 50 }
};

function detectCacheTier(url) {
  if (url.startsWith('snapshot:')) return 'snapshot';
  try {
    const pathname = new URL(url.replace('snapshot:', '')).pathname.toLowerCase();
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico', '.avif', '.heic'];
    const videoExts = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.flv', '.wmv', '.m4v'];
    const audioExts = ['.mp3', '.wav', '.flac', '.aac', '.m4a', '.wma', '.opus'];

    const ext = pathname.match(/\.[a-z0-9]+$/);
    if (ext) {
      if (imageExts.includes(ext[0])) return 'image';
      if (videoExts.includes(ext[0])) return 'video';
      if (audioExts.includes(ext[0])) return 'audio';
    }

    const hostname = new URL(url.replace('snapshot:', '')).hostname.toLowerCase();
    const videoSites = ['youtube.com', 'youtu.be', 'bilibili.com', 'vimeo.com', 'dailymotion.com', 'douyin.com', 'tiktok.com', 'twitch.tv'];
    const audioSites = ['music.163.com', 'y.qq.com', 'spotify.com', 'soundcloud.com', 'music.apple.com'];
    for (const d of videoSites) {
      if (hostname === d || hostname.endsWith('.' + d)) return 'video-site';
    }
    for (const d of audioSites) {
      if (hostname === d || hostname.endsWith('.' + d)) return 'audio-site';
    }
  } catch (e) {}
  return 'webpage';
}

function extractReadableContent(html, url) {
  let content = html;

  content = content.replace(/<script[\s\S]*?<\/script>/gi, '');
  content = content.replace(/<style[\s\S]*?<\/style>/gi, '');
  content = content.replace(/<noscript[\s\S]*?<\/noscript>/gi, '');
  content = content.replace(/<!--[\s\S]*?-->/g, '');

  content = content.replace(/<header[\s\S]*?<\/header>/gi, '');
  content = content.replace(/<nav[\s\S]*?<\/nav>/gi, '');
  content = content.replace(/<footer[\s\S]*?<\/footer>/gi, '');
  content = content.replace(/<aside[\s\S]*?<\/aside>/gi, '');
  content = content.replace(/<form[\s\S]*?<\/form>/gi, '');

  const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    content = bodyMatch[1];
  }

  const paragraphs = [];
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let match;
  while ((match = pRegex.exec(content)) !== null) {
    const text = match[1].replace(/<[^>]+>/g, '').trim();
    if (text.length > 20) {
      paragraphs.push(text);
    }
  }

  let mainText = paragraphs.join('\n\n');

  if (mainText.length < 200) {
    const textContent = content.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    mainText = textContent;
  }

  return {
    text: mainText,
    paragraphs: paragraphs
  };
}

function extractHeadings(html) {
  const headings = [];
  const headingRegex = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let match;

  while ((match = headingRegex.exec(html)) !== null) {
    const level = parseInt(match[1], 10);
    const text = match[2].replace(/<[^>]+>/g, '').trim();
    if (text && text.length > 0 && text.length < 200) {
      headings.push({
        level: level,
        text: text
      });
    }
  }

  return headings.slice(0, 20);
}

function extractKeywords(text, topN = 10) {
  if (!text || text.length < 50) return [];

  const stopWords = new Set([
    '的', '了', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个',
    '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看',
    '好', '自己', '这', '那', '他', '她', '它', '们', '这个', '那个', '什么',
    '怎么', '为什么', '因为', '所以', '但是', '然后', '还是', '或者', '可以',
    '可能', '应该', '如果', '那么', '这些', '那些', '这样', '那样', '之',
    '而', '与', '及', '等', '在', '为', '以', '于', '上', '中', '下', '时',
    '地', '得', '做', '对', '将', '把', '被', '让', '给', '从', '向', '由',
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
    'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by',
    'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above',
    'below', 'between', 'out', 'off', 'over', 'under', 'again', 'further',
    'then', 'once', 'and', 'but', 'if', 'or', 'because', 'until', 'while',
    'and', 'but', 'so', 'than', 'too', 'very', 's', 't', 'just', 'now',
    'this', 'that', 'these', 'those', 'i', 'me', 'my', 'myself', 'we',
    'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'yourself',
    'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers',
    'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs',
    'themselves', 'what', 'which', 'who', 'whom', 'whose', 'where', 'when',
    'why', 'how', 'all', 'both', 'each', 'few', 'more', 'most', 'other',
    'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'than',
    'also', 'here', 'there', 'up', 'down', 'about'
  ]);

  const wordFreq = new Map();

  const chineseChars = text.match(/[\u4e00-\u9fa5]{2,}/g);
  if (chineseChars) {
    for (const str of chineseChars) {
      for (let len = 2; len <= Math.min(4, str.length); len++) {
        for (let i = 0; i <= str.length - len; i++) {
          const word = str.substring(i, i + len);
          if (!stopWords.has(word)) {
            wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
          }
        }
      }
    }
  }

  const englishWords = text.match(/[a-zA-Z]{3,}/g);
  if (englishWords) {
    for (const word of englishWords) {
      const lowerWord = word.toLowerCase();
      if (!stopWords.has(lowerWord) && lowerWord.length >= 3) {
        wordFreq.set(lowerWord, (wordFreq.get(lowerWord) || 0) + 1);
      }
    }
  }

  const sorted = Array.from(wordFreq.entries())
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return b[0].length - a[0].length;
    })
    .slice(0, topN)
    .map(item => item[0]);

  return sorted;
}

function calculateReadingTime(text) {
  if (!text) return { minutes: 0, words: 0 };

  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;

  const chineseCpm = 500;
  const englishWpm = 200;

  const minutes = Math.max(1, Math.ceil(
    (chineseChars / chineseCpm) + (englishWords / englishWpm)
  ));

  const totalWords = chineseChars + englishWords;

  return {
    minutes: minutes,
    words: totalWords,
    chineseChars: chineseChars,
    englishWords: englishWords
  };
}

function generateSummary(text, maxLength = 200) {
  if (!text || text.length === 0) return '';

  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxLength) return cleaned;

  const sentences = cleaned.split(/[。！？.!?]+/).filter(s => s.trim().length > 0);

  if (sentences.length > 0) {
    let summary = '';
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (summary.length + trimmed.length <= maxLength) {
        summary += (summary ? '' : '') + trimmed + '。';
      } else {
        break;
      }
    }
    if (summary.length > 0) {
      return summary.slice(0, maxLength) + '...';
    }
  }

  return cleaned.slice(0, maxLength) + '...';
}

function decodeHtmlEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&nbsp;/g, ' ');
}

function resolveUrl(baseUrl, relativeUrl) {
  try {
    return new URL(relativeUrl, baseUrl).href;
  } catch (e) {
    return relativeUrl;
  }
}

function extractMetaTags(html, url) {
  const result = {
    title: '',
    description: '',
    image: '',
    favicon: '',
    siteName: '',
    video: '',
    type: '',
    summary: '',
    headings: [],
    keywords: [],
    readingTime: null,
    contentText: ''
  };

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) {
    result.title = decodeHtmlEntities(titleMatch[1].trim());
  }

  const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i);
  if (ogTitleMatch) {
    result.title = decodeHtmlEntities(ogTitleMatch[1].trim());
  }
  const ogTitleMatch2 = html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:title["']/i);
  if (ogTitleMatch2) {
    result.title = decodeHtmlEntities(ogTitleMatch2[1].trim());
  }

  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
  if (descMatch) {
    result.description = decodeHtmlEntities(descMatch[1].trim());
  }
  const descMatch2 = html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
  if (descMatch2) {
    result.description = decodeHtmlEntities(descMatch2[1].trim());
  }

  const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i);
  if (ogDescMatch) {
    result.description = decodeHtmlEntities(ogDescMatch[1].trim());
  }
  const ogDescMatch2 = html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:description["']/i);
  if (ogDescMatch2) {
    result.description = decodeHtmlEntities(ogDescMatch2[1].trim());
  }

  const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i);
  if (ogImageMatch) {
    result.image = resolveUrl(url, ogImageMatch[1].trim());
  }
  const ogImageMatch2 = html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:image["']/i);
  if (ogImageMatch2) {
    result.image = resolveUrl(url, ogImageMatch2[1].trim());
  }

  const ogTypeMatch = html.match(/<meta[^>]*property=["']og:type["'][^>]*content=["']([^"']*)["']/i);
  if (ogTypeMatch) {
    result.type = ogTypeMatch[1].trim();
  }
  const ogTypeMatch2 = html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:type["']/i);
  if (ogTypeMatch2) {
    result.type = ogTypeMatch2[1].trim();
  }

  const ogSiteNameMatch = html.match(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']*)["']/i);
  if (ogSiteNameMatch) {
    result.siteName = decodeHtmlEntities(ogSiteNameMatch[1].trim());
  }
  const ogSiteNameMatch2 = html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:site_name["']/i);
  if (ogSiteNameMatch2) {
    result.siteName = decodeHtmlEntities(ogSiteNameMatch2[1].trim());
  }

  const ogVideoMatch = html.match(/<meta[^>]*property=["']og:video["'][^>]*content=["']([^"']*)["']/i);
  if (ogVideoMatch) {
    result.video = resolveUrl(url, ogVideoMatch[1].trim());
  }
  const ogVideoMatch2 = html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:video["']/i);
  if (ogVideoMatch2) {
    result.video = resolveUrl(url, ogVideoMatch2[1].trim());
  }

  const ogVideoSecureMatch = html.match(/<meta[^>]*property=["']og:video:secure_url["'][^>]*content=["']([^"']*)["']/i);
  if (ogVideoSecureMatch) {
    result.video = resolveUrl(url, ogVideoSecureMatch[1].trim());
  }
  const ogVideoSecureMatch2 = html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:video:secure_url["']/i);
  if (ogVideoSecureMatch2) {
    result.video = resolveUrl(url, ogVideoSecureMatch2[1].trim());
  }

  const faviconMatch = html.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']*)["']/i);
  if (faviconMatch) {
    result.favicon = resolveUrl(url, faviconMatch[1].trim());
  }
  const faviconMatch2 = html.match(/<link[^>]*href=["']([^"']*)["'][^>]*rel=["'](?:shortcut )?icon["']/i);
  if (faviconMatch2 && !result.favicon) {
    result.favicon = resolveUrl(url, faviconMatch2[1].trim());
  }

  const appleIconMatch = html.match(/<link[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']*)["']/i);
  if (appleIconMatch && !result.favicon) {
    result.favicon = resolveUrl(url, appleIconMatch[1].trim());
  }

  if (!result.favicon) {
    try {
      const urlObj = new URL(url);
      result.favicon = `${urlObj.protocol}//${urlObj.hostname}/favicon.ico`;
    } catch (e) {
      // ignore
    }
  }

  if (!result.siteName) {
    try {
      const urlObj = new URL(url);
      result.siteName = urlObj.hostname;
    } catch (e) {
      result.siteName = '';
    }
  }

  const readableContent = extractReadableContent(html, url);
  result.contentText = readableContent.text;

  if (readableContent.text && readableContent.text.length > 50) {
    result.summary = generateSummary(readableContent.text, 250);
    result.keywords = extractKeywords(readableContent.text, 8);
    result.readingTime = calculateReadingTime(readableContent.text);
  }

  result.headings = extractHeadings(html);

  if (!result.description && result.summary) {
    result.description = result.summary;
  }

  return result;
}

function getVideoEmbedUrl(url) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      let videoId = '';
      if (hostname.includes('youtu.be')) {
        videoId = urlObj.pathname.slice(1);
      } else {
        videoId = urlObj.searchParams.get('v');
      }
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1`;
      }
    }

    if (hostname.includes('bilibili.com')) {
      const match = url.match(/\/video\/(BV[a-zA-Z0-9]+)/);
      if (match) {
        return `https://player.bilibili.com/player.html?bvid=${match[1]}&autoplay=1`;
      }
    }

    if (hostname.includes('vimeo.com')) {
      const match = url.match(/vimeo\.com\/(\d+)/);
      if (match) {
        return `https://player.vimeo.com/video/${match[1]}?autoplay=1&muted=1`;
      }
    }

    return null;
  } catch (e) {
    return null;
  }
}

const TYPE_COMPATIBILITY = {
  webpage: { supportsEmbed: true, supportsQuickRead: true, supportsSize: true, supportsDisableSecurity: true },
  image: { supportsEmbed: false, supportsQuickRead: false, supportsSize: true, supportsDisableSecurity: true },
  video: { supportsEmbed: false, supportsQuickRead: false, supportsSize: true, supportsDisableSecurity: true },
  'video-site': { supportsEmbed: true, supportsQuickRead: false, supportsSize: true, supportsDisableSecurity: true },
  audio: { supportsEmbed: false, supportsQuickRead: false, supportsSize: true, supportsDisableSecurity: true },
  'audio-site': { supportsEmbed: true, supportsQuickRead: false, supportsSize: true, supportsDisableSecurity: true }
};

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
    return { valid: false, error: '正则表达式语法错误: ' + e.message };
  }
}

function safeRegexMatch(pattern, str, flags = '', _overrides) {
  const v = validateRegexPattern(pattern);
  if (!v.valid) return false;
  try {
    const r = new RegExp(pattern, flags);
    let done = _overrides?.done || false;
    let result = false;
    const start = _overrides?.now ? _overrides.now() : Date.now();
    setTimeout(() => { done = true; }, 50);
    try {
      result = r.test(str);
    } catch (e) {
      return false;
    }
    if (done) return false;
    if ((_overrides?.now || Date.now)() - start > 30) return false;
    return result;
  } catch (e) {
    return false;
  }
}

function filterCompatibleActions(rule) {
  if (!rule?.actions || !rule.actions.forceType) return rule?.actions || null;
  const comp = TYPE_COMPATIBILITY[rule.actions.forceType];
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

function matchRuleForUrl(url, rules) {
  if (!rules || rules.length === 0 || !url) return null;

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    const pathname = urlObj.pathname;
    const fullUrl = url;

    const getPriority = (r) => r.priority || 0;
    const sortedRules = [...rules]
      .filter(r => r.enabled && r.matchValue)
      .sort((a, b) => getPriority(b) - getPriority(a));

    for (const rule of sortedRules) {
      let matched = false;
      const rawMatchValue = rule.matchType === 'suffix' ? normalizeSuffix(rule.matchValue) : rule.matchValue;
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
          matched = safeRegexMatch(rule.matchValue, fullUrl, flags);
          break;
        default:
          matched = false;
      }

      if (matched) {
        return { ...rule, actions: filterCompatibleActions(rule) };
      }
    }
  } catch (e) {
    return null;
  }

  return null;
}

function processHtmlForSnapshot(html, baseUrl, _resolveUrl) {
  const doResolve = _resolveUrl || resolveUrl;
  try {
    const baseTagMatch = html.match(/<base[^>]*href=["']([^"']*)["']/i);
    const effectiveBase = baseTagMatch ? doResolve(baseUrl, baseTagMatch[1]) : baseUrl;

    let processed = html;

    processed = processed.replace(/<script[\s\S]*?<\/script>/gi, '');
    processed = processed.replace(/<noscript[\s\S]*?<\/noscript>/gi, '');
    processed = processed.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
    processed = processed.replace(/on\w+\s*=\s*[^>\s]+/gi, '');

    processed = processed.replace(/(<[^>]*\s(?:href|src|srcset|poster|data-src|data-href)\s*=\s*["'])([^"']*)(["'])/gi, (match, prefix, url, suffix) => {
      try {
        const resolved = doResolve(effectiveBase, url);
        return prefix + resolved + suffix;
      } catch (e) {
        return match;
      }
    });

    processed = processed.replace(/(<[^>]*\s(?:href|src|srcset|poster|data-src|data-href)\s*=\s*)([^"'\s>]+)([\s>])/gi, (match, prefix, url, suffix) => {
      try {
        const resolved = doResolve(effectiveBase, url);
        return prefix + '"' + resolved + '"' + suffix;
      } catch (e) {
        return match;
      }
    });

    processed = processed.replace(/srcset\s*=\s*["']([^"']*)["']/gi, (match, srcsetContent) => {
      const newSrcset = srcsetContent.split(',').map(item => {
        const trimmed = item.trim();
        const parts = trimmed === '' ? [] : trimmed.split(/\s+/);
        if (parts.length > 0) {
          try {
            parts[0] = doResolve(effectiveBase, parts[0]);
          } catch (e) {
          }
        }
        return parts.join(' ');
      }).join(', ');
      return 'srcset="' + newSrcset + '"';
    });

    if (!/<base\s/i.test(processed)) {
      processed = processed.replace(/<head[^>]*>/i, match => match + `<base href="${effectiveBase}">`);
    }

    processed = processed.replace(/<form[^>]*>/gi, '<form onsubmit="return false;">');

    return processed;
  } catch (e) {
    console.warn('Error processing HTML for snapshot:', e);
    return html;
  }
}

module.exports = {
  CACHE_TIERS,
  detectCacheTier,
  extractReadableContent,
  extractHeadings,
  extractKeywords,
  calculateReadingTime,
  generateSummary,
  decodeHtmlEntities,
  resolveUrl,
  extractMetaTags,
  getVideoEmbedUrl,
  TYPE_COMPATIBILITY,
  normalizeSuffix,
  validateRegexPattern,
  safeRegexMatch,
  filterCompatibleActions,
  matchRuleForUrl,
  processHtmlForSnapshot
};
