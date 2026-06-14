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

function extractMetaTags(html, url) {
  const result = {
    title: '',
    description: '',
    image: '',
    favicon: '',
    siteName: '',
    video: '',
    type: ''
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
    blacklist: []
  };

  chrome.storage.sync.get(defaultSettings, (result) => {
    chrome.storage.sync.set({ ...defaultSettings, ...result });
  });
});
