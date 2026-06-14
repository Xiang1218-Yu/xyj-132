const CACHE = new Map();
const CACHE_MAX_SIZE = 100;
const CACHE_TTL = 10 * 60 * 1000;

function getFromCache(url) {
  const cached = CACHE.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  CACHE.delete(url);
  return null;
}

function setToCache(url, data) {
  if (CACHE.size >= CACHE_MAX_SIZE) {
    const oldestKey = CACHE.keys().next().value;
    CACHE.delete(oldestKey);
  }
  CACHE.set(url, {
    data: data,
    timestamp: Date.now()
  });
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

async function fetchPageInfo(url) {
  const cached = getFromCache(url);
  if (cached) {
    return cached;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      credentials: 'omit'
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      return {
        title: url,
        description: '',
        image: '',
        favicon: '',
        siteName: new URL(url).hostname,
        type: 'unknown'
      };
    }

    const html = await response.text();
    const metaInfo = extractMetaTags(html, url);

    const videoEmbed = getVideoEmbedUrl(url);
    if (videoEmbed) {
      metaInfo.video = videoEmbed;
    }

    setToCache(url, metaInfo);
    return metaInfo;
  } catch (error) {
    console.warn('Failed to fetch page info:', url, error.message);
    throw error;
  }
}

const HISTORY_MAX_ITEMS = 500;

function addPreviewHistory(item) {
  chrome.storage.local.get({ previewHistory: [] }, (result) => {
    let history = result.previewHistory;
    const existingIdx = history.findIndex(h => h.url === item.url);
    if (existingIdx !== -1) {
      history.splice(existingIdx, 1);
    }
    history.unshift({
      url: item.url,
      title: item.title || '',
      type: item.type || 'webpage',
      favicon: item.favicon || '',
      siteName: item.siteName || '',
      timestamp: Date.now()
    });
    if (history.length > HISTORY_MAX_ITEMS) {
      history = history.slice(0, HISTORY_MAX_ITEMS);
    }
    chrome.storage.local.set({ previewHistory: history });
  });
}

function getPreviewHistory(callback) {
  chrome.storage.local.get({ previewHistory: [] }, (result) => {
    callback(result.previewHistory);
  });
}

function clearPreviewHistory(callback) {
  chrome.storage.local.set({ previewHistory: [] }, () => {
    if (callback) callback();
  });
}

function deletePreviewHistoryItem(url, callback) {
  chrome.storage.local.get({ previewHistory: [] }, (result) => {
    let history = result.previewHistory.filter(h => h.url !== url);
    chrome.storage.local.set({ previewHistory: history }, () => {
      if (callback) callback(history);
    });
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchPageInfo') {
    fetchPageInfo(request.url)
      .then(data => {
        sendResponse({ success: true, data: data });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  if (request.action === 'fetchPageSnapshot') {
    fetchPageSnapshot(request.url)
      .then(data => {
        sendResponse({ success: true, data: data });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  if (request.action === 'addPreviewHistory') {
    addPreviewHistory(request.item);
    sendResponse({ success: true });
    return false;
  }

  if (request.action === 'getPreviewHistory') {
    getPreviewHistory((history) => {
      sendResponse({ success: true, data: history });
    });
    return true;
  }

  if (request.action === 'clearPreviewHistory') {
    clearPreviewHistory(() => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'deletePreviewHistoryItem') {
    deletePreviewHistoryItem(request.url, (history) => {
      sendResponse({ success: true, data: history });
    });
    return true;
  }
});

async function fetchPageSnapshot(url) {
  const cacheKey = 'snapshot:' + url;
  const cached = getFromCache(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      credentials: 'omit'
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      throw new Error('Not HTML content');
    }

    const html = await response.text();
    const processedHtml = processHtmlForSnapshot(html, url);
    const metaInfo = extractMetaTags(html, url);

    const result = {
      html: processedHtml,
      meta: metaInfo,
      originalUrl: url
    };

    setToCache(cacheKey, result);
    return result;
  } catch (error) {
    console.warn('Failed to fetch page snapshot:', url, error.message);
    throw error;
  }
}

function processHtmlForSnapshot(html, baseUrl) {
  try {
    const baseTagMatch = html.match(/<base[^>]*href=["']([^"']*)["']/i);
    const effectiveBase = baseTagMatch ? resolveUrl(baseUrl, baseTagMatch[1]) : baseUrl;

    let processed = html;

    processed = processed.replace(/<script[\s\S]*?<\/script>/gi, '');
    processed = processed.replace(/<noscript[\s\S]*?<\/noscript>/gi, '');
    processed = processed.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
    processed = processed.replace(/on\w+\s*=\s*[^>\s]+/gi, '');

    processed = processed.replace(/(<[^>]*\s(?:href|src|srcset|poster|data-src|data-href)\s*=\s*["'])([^"']*)(["'])/gi, (match, prefix, url, suffix) => {
      try {
        const resolved = resolveUrl(effectiveBase, url);
        return prefix + resolved + suffix;
      } catch (e) {
        return match;
      }
    });

    processed = processed.replace(/(<[^>]*\s(?:href|src|srcset|poster|data-src|data-href)\s*=\s*)([^"'\s>]+)([\s>])/gi, (match, prefix, url, suffix) => {
      try {
        const resolved = resolveUrl(effectiveBase, url);
        return prefix + '"' + resolved + '"' + suffix;
      } catch (e) {
        return match;
      }
    });

    processed = processed.replace(/srcset\s*=\s*["']([^"']*)["']/gi, (match, srcsetContent) => {
      const newSrcset = srcsetContent.split(',').map(item => {
        const parts = item.trim().split(/\s+/);
        if (parts.length > 0) {
          try {
            parts[0] = resolveUrl(effectiveBase, parts[0]);
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

chrome.runtime.onInstalled.addListener(() => {
  const defaultSettings = {
    triggerMode: 'hover',
    hoverDelay: 500,
    previewWidth: 600,
    previewHeight: 400,
    enableVideoPreview: true,
    enableAudioPreview: true,
    enableImagePreview: true,
    enableWebpagePreview: true,
    blacklist: [],
    enableSecurityCheck: true,
    securityRules: {
      checkPhishing: true,
      checkMalicious: true,
      checkSuspicious: true,
      checkRedirect: true
    },
    batchMode: {
      enabled: true,
      hotkey: 'Shift',
      enableFloatingMarker: true,
      autoShowCompare: true
    },
    theme: {
      mode: 'system',
      primaryColor: '#667eea',
      secondaryColor: '#764ba2',
      borderRadius: '12px',
      shadowIntensity: 'medium',
      fontSize: '14px',
      componentOrder: ['header', 'content', 'security', 'footer'],
      componentVisibility: {
        header: true,
        content: true,
        security: true,
        footer: true
      }
    }
  };

  chrome.storage.sync.get(defaultSettings, (result) => {
    chrome.storage.sync.set({ ...defaultSettings, ...result });
  });
});
