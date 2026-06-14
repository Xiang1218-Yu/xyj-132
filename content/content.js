(function () {
  'use strict';

  if (window.top !== window.self) {
    return;
  }

  const DEFAULT_SETTINGS = {
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

  let settings = { ...DEFAULT_SETTINGS };
  let hoverTimer = null;
  let hideTimer = null;
  let previewPanel = null;
  let currentLink = null;
  let isPanelHovered = false;

  const NO_EMBED_DOMAINS = [
  ];

  function canEmbedUrl(url) {
    return true;
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
      const urlObj = new URL(url, window.location.href);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch (e) {
      return false;
    }
  }

  function getAbsoluteUrl(url) {
    try {
      return new URL(url, window.location.href).href;
    } catch (e) {
      return url;
    }
  }

  function getLinkType(url) {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname.toLowerCase();
      const hostname = urlObj.hostname.toLowerCase();

      const videoExts = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv', '.flv', '.wmv'];
      const audioExts = ['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a', '.wma'];
      const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico'];

      for (const ext of videoExts) {
        if (pathname.endsWith(ext)) return 'video';
      }
      for (const ext of audioExts) {
        if (pathname.endsWith(ext)) return 'audio';
      }
      for (const ext of imageExts) {
        if (pathname.endsWith(ext)) return 'image';
      }

      const videoSites = [
        'youtube.com', 'youtu.be', 'bilibili.com', 'vimeo.com',
        'dailymotion.com', 'youku.com', 'iqiyi.com', 'tudou.com',
        'mgtv.com', 'le.com', 'pptv.com'
      ];
      for (const site of videoSites) {
        if (hostname.includes(site)) return 'video-site';
      }

      const audioSites = [
        'music.163.com', 'y.qq.com', 'kuwo.cn', 'kugou.com',
        'xiami.com', 'spotify.com', 'soundcloud.com', 'music.apple.com'
      ];
      for (const site of audioSites) {
        if (hostname.includes(site)) return 'audio-site';
      }

      return 'webpage';
    } catch (e) {
      return 'unknown';
    }
  }

  function isInBlacklist(url) {
    if (!settings.blacklist || settings.blacklist.length === 0) return false;
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      return settings.blacklist.some(domain => hostname.includes(domain.toLowerCase()));
    } catch (e) {
      return false;
    }
  }

  function isSameOrigin(url) {
    try {
      return new URL(url).origin === window.location.origin;
    } catch (e) {
      return false;
    }
  }

  function createPreviewPanel() {
    if (previewPanel) return previewPanel;

    const panel = document.createElement('div');
    panel.className = 'qlp-preview-panel';
    panel.id = 'qlp-preview-panel';
    panel.innerHTML = `
      <div class="qlp-preview-header">
        <div class="qlp-preview-title" id="qlp-preview-title">加载中...</div>
        <div class="qlp-preview-actions">
          <a class="qlp-action-btn" id="qlp-open-new-tab" title="在新标签页打开" target="_blank" rel="noopener noreferrer">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
            </svg>
          </a>
          <button class="qlp-action-btn" id="qlp-close-btn" title="关闭 (Esc)">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="qlp-preview-content" id="qlp-preview-content">
        <div class="qlp-loading">
          <div class="qlp-spinner"></div>
          <div class="qlp-loading-text">正在加载预览...</div>
        </div>
      </div>
      <div class="qlp-preview-footer" id="qlp-preview-footer">
        <span class="qlp-preview-url" id="qlp-preview-url"></span>
      </div>
    `;

    document.body.appendChild(panel);

    panel.querySelector('#qlp-close-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      hidePreview();
    });
    panel.querySelector('#qlp-open-new-tab').addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentLink) {
        e.currentTarget.href = currentLink;
      }
    });

    panel.addEventListener('mouseenter', () => {
      isPanelHovered = true;
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
    });

    panel.addEventListener('mouseleave', () => {
      isPanelHovered = false;
      if (settings.triggerMode === 'hover') {
        scheduleHide();
      }
    });

    panel.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    panel.addEventListener('wheel', (e) => {
      e.stopPropagation();
      const contentArea = panel.querySelector('#qlp-preview-content');
      if (contentArea) {
        const isScrollable = contentArea.scrollHeight > contentArea.clientHeight;
        if (isScrollable) {
          const atTop = contentArea.scrollTop === 0;
          const atBottom = contentArea.scrollTop + contentArea.clientHeight >= contentArea.scrollHeight - 1;
          
          if ((e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBottom)) {
            e.preventDefault();
          }
        } else {
          e.preventDefault();
        }
      } else {
        e.preventDefault();
      }
    }, { passive: false, capture: true });

    panel.addEventListener('scroll', (e) => {
      e.stopPropagation();
    }, true);

    const contentArea = panel.querySelector('#qlp-preview-content');
    if (contentArea) {
      contentArea.addEventListener('wheel', (e) => {
        e.stopPropagation();
        const isScrollable = contentArea.scrollHeight > contentArea.clientHeight;
        if (isScrollable) {
          const atTop = contentArea.scrollTop === 0;
          const atBottom = contentArea.scrollTop + contentArea.clientHeight >= contentArea.scrollHeight - 1;
          
          if ((e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBottom)) {
            e.preventDefault();
          }
        } else {
          e.preventDefault();
        }
      }, { passive: false, capture: true });

      contentArea.addEventListener('scroll', (e) => {
        e.stopPropagation();
      }, true);
    }

    previewPanel = panel;
    return panel;
  }

  function showPreview(link, event) {
    if (!link || !link.href) return;
    if (!isValidUrl(link.href)) return;
    if (isInBlacklist(window.location.href)) return;

    const absoluteUrl = getAbsoluteUrl(link.href);
    const linkType = getLinkType(absoluteUrl);

    const typeEnabled = {
      'video': settings.enableVideoPreview,
      'video-site': settings.enableVideoPreview,
      'audio': settings.enableAudioPreview,
      'audio-site': settings.enableAudioPreview,
      'image': settings.enableImagePreview,
      'webpage': settings.enableWebpagePreview,
      'unknown': settings.enableWebpagePreview
    };

    if (!typeEnabled[linkType]) return;

    currentLink = absoluteUrl;
    const panel = createPreviewPanel();

    const linkText = link.textContent?.trim() || link.title || '';
    panel.querySelector('#qlp-preview-title').textContent = linkText ? 
      (linkText.length > 50 ? linkText.slice(0, 50) + '...' : linkText) : '链接预览';
    panel.querySelector('#qlp-preview-url').textContent = absoluteUrl;

    const openBtn = panel.querySelector('#qlp-open-new-tab');
    openBtn.href = absoluteUrl;

    const content = panel.querySelector('#qlp-preview-content');
    content.innerHTML = `
      <div class="qlp-loading">
        <div class="qlp-spinner"></div>
        <div class="qlp-loading-text">正在加载预览...</div>
      </div>
    `;

    positionPreviewPanel(event, panel);
    panel.classList.add('qlp-visible');

    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }

    try {
      const hostname = new URL(absoluteUrl).hostname;
      chrome.runtime.sendMessage({
        action: 'addPreviewHistory',
        item: {
          url: absoluteUrl,
          title: linkText || hostname,
          type: linkType,
          favicon: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=32`,
          siteName: hostname
        }
      });
    } catch (e) {}

    loadPreviewContent(absoluteUrl, linkType, content);
  }

  function positionPreviewPanel(event, panel) {
    let triggerX, triggerY, triggerBottom;

    if (event && event.target && event.target.getBoundingClientRect) {
      const rect = event.target.getBoundingClientRect();
      triggerX = rect.left;
      triggerY = rect.top;
      triggerBottom = rect.bottom;
    } else if (event && typeof event.clientX === 'number') {
      triggerX = event.clientX;
      triggerY = event.clientY;
      triggerBottom = event.clientY + 20;
    } else {
      triggerX = window.innerWidth / 2;
      triggerY = window.innerHeight / 2;
      triggerBottom = triggerY + 20;
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const panelWidth = settings.previewWidth;
    const panelHeight = settings.previewHeight + 60;

    let left = triggerX + 15;
    let top = triggerBottom + 10;

    if (left + panelWidth > viewportWidth - 10) {
      left = viewportWidth - panelWidth - 10;
    }
    if (left < 10) left = 10;

    if (top + panelHeight > viewportHeight - 10) {
      top = triggerY - panelHeight - 10;
    }
    if (top < 10) top = 10;

    panel.style.width = panelWidth + 'px';
    panel.style.left = left + 'px';
    panel.style.top = top + 'px';
  }

  function scheduleHide() {
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      if (!isPanelHovered) {
        hidePreview();
      }
    }, 300);
  }

  function loadPreviewContent(url, type, container) {
    switch (type) {
      case 'image':
        loadImagePreview(url, container);
        break;
      case 'video':
        loadVideoPreview(url, container);
        break;
      case 'audio':
        loadAudioPreview(url, container);
        break;
      case 'video-site':
      case 'audio-site':
      case 'webpage':
      default:
        loadWebpagePreview(url, container, type);
        break;
    }
  }

  function loadImagePreview(url, container) {
    const img = new Image();
    img.onload = () => {
      container.innerHTML = `
        <div class="qlp-image-container">
          <img src="${url}" alt="图片预览" class="qlp-preview-image" />
        </div>
      `;
    };
    img.onerror = () => {
      container.innerHTML = `
        <div class="qlp-loading">
          <div class="qlp-loading-text">图片加载失败</div>
        </div>
      `;
    };
    img.src = url;
  }

  function loadVideoPreview(url, container) {
    container.innerHTML = `
      <div class="qlp-media-container">
        <video src="${url}" controls class="qlp-preview-media" preload="metadata" muted>
          您的浏览器不支持视频播放
        </video>
      </div>
    `;
    const video = container.querySelector('video');
    if (video) {
      video.addEventListener('loadeddata', () => {
        video.play().catch(() => {});
      });
    }
  }

  function loadAudioPreview(url, container) {
    container.innerHTML = `
      <div class="qlp-audio-container">
        <div class="qlp-audio-icon">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
          </svg>
        </div>
        <audio src="${url}" controls class="qlp-preview-audio" preload="metadata">
          您的浏览器不支持音频播放
        </audio>
      </div>
    `;
  }

  function loadWebpagePreview(url, container, type) {
    chrome.runtime.sendMessage({ action: 'fetchPageInfo', url: url }, (response) => {
      if (chrome.runtime.lastError) {
        renderFallbackPreview(url, container, type);
        return;
      }

      if (response && response.success) {
        renderRichPreview(url, response.data, container, type);
      } else {
        renderFallbackPreview(url, container, type);
      }
    });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function renderRichPreview(url, data, container, type) {
    const icon = data.favicon || getFaviconFromUrl(url);
    const image = data.image || '';
    const title = escapeHtml(data.title || url);
    const description = escapeHtml(data.description || '');
    const siteName = escapeHtml(data.siteName || getHostname(url));
    const safeIcon = escapeHtml(icon);
    const safeImage = image ? escapeHtml(image) : '';
    const safeUrl = escapeHtml(url);

    let mediaHtml = '';
    if (type === 'video-site' && data.video) {
      const safeVideo = escapeHtml(data.video);
      mediaHtml = `
        <div class="qlp-media-container">
          <iframe src="${safeVideo}" class="qlp-preview-iframe" allow="autoplay; encrypted-media" allowfullscreen loading="lazy"></iframe>
        </div>
      `;
    } else if (image) {
      mediaHtml = `
        <div class="qlp-og-image-container">
          <img src="${safeImage}" alt="${title}" class="qlp-og-image" loading="lazy" />
        </div>
      `;
    }

    const urlObj = new URL(url);
    const canEmbed = canEmbedUrl(url);
    const hasSummary = data.summary && data.summary.length > 0;
    const hasKeywords = data.keywords && data.keywords.length > 0;
    const hasHeadings = data.headings && data.headings.length > 0;
    const hasReadingTime = data.readingTime && data.readingTime.minutes > 0;
    const hasQuickRead = hasSummary || hasKeywords || hasHeadings || hasReadingTime;

    let keywordsHtml = '';
    if (hasKeywords) {
      keywordsHtml = data.keywords.map(kw => 
        `<span class="qlp-keyword-tag">${escapeHtml(kw)}</span>`
      ).join('');
    }

    let headingsHtml = '';
    if (hasHeadings) {
      headingsHtml = data.headings.map(h => {
        const indent = (h.level - 1) * 12;
        return `
          <div class="qlp-heading-item" style="padding-left: ${indent}px;">
            <span class="qlp-heading-level">H${h.level}</span>
            <span class="qlp-heading-text">${escapeHtml(h.text)}</span>
          </div>
        `;
      }).join('');
    }

    let readingTimeHtml = '';
    if (hasReadingTime) {
      readingTimeHtml = `
        <div class="qlp-reading-time">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
          </svg>
          <span class="qlp-reading-minutes">${data.readingTime.minutes} 分钟阅读</span>
          <span class="qlp-reading-words">约 ${data.readingTime.words} 字</span>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="qlp-webpage-preview">
        ${mediaHtml}
        <div class="qlp-webpage-info">
          <div class="qlp-webpage-header">
            ${icon ? `<img src="${safeIcon}" class="qlp-favicon" alt="" onerror="this.style.display='none'" />` : ''}
            <span class="qlp-site-name">${siteName}</span>
            <div class="qlp-header-actions">
              ${hasQuickRead ? `<button class="qlp-quickread-toggle" title="速读摘要">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                </svg>
                速读
              </button>` : ''}
              ${canEmbed ? `<button class="qlp-embed-toggle" data-url="${safeUrl}" title="切换网页预览模式">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                  <path d="M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 7H9.5v-.5h-2v3h2V13H11v1c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1zm7 0h-1.5v-.5h-2v3h2V13H18v1c0 .55-.45 1-1 1h-3c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1z"/>
                </svg>
                网页预览
              </button>` : `<span class="qlp-no-embed-hint" title="该网站禁止嵌入预览">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
                无法嵌入
              </span>`}
            </div>
          </div>
          <div class="qlp-webpage-title">${title}</div>
          ${description ? `<div class="qlp-webpage-description">${description}</div>` : ''}
          <div class="qlp-webpage-url" title="${safeUrl}">${safeUrl}</div>
          ${!canEmbed ? `<div class="qlp-embed-notice">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
              该网站设置了安全策略，无法在弹窗中预览，请点击右上角在新标签页打开
            </div>` : ''}
        </div>
        ${hasQuickRead ? `<div class="qlp-quickread-panel" style="display: none;">
          <div class="qlp-quickread-header">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
            </svg>
            <span class="qlp-quickread-title">速读摘要</span>
            <button class="qlp-quickread-close" title="关闭速读摘要">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
          ${readingTimeHtml}
          ${hasSummary ? `
          <div class="qlp-quickread-section">
            <div class="qlp-quickread-section-title">内容摘要</div>
            <div class="qlp-quickread-summary">${escapeHtml(data.summary)}</div>
          </div>
          ` : ''}
          ${hasKeywords ? `
          <div class="qlp-quickread-section">
            <div class="qlp-quickread-section-title">关键词</div>
            <div class="qlp-keywords">${keywordsHtml}</div>
          </div>
          ` : ''}
          ${hasHeadings ? `
          <div class="qlp-quickread-section">
            <div class="qlp-quickread-section-title">文章结构</div>
            <div class="qlp-headings">${headingsHtml}</div>
          </div>
          ` : ''}
        </div>` : ''}
        <div class="qlp-embed-container" style="display: none;">
          <div class="qlp-embed-header">
            <span class="qlp-embed-url">${safeUrl}</span>
            <button class="qlp-embed-refresh" title="刷新">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
              </svg>
            </button>
            <button class="qlp-embed-back" title="返回摘要">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
              </svg>
            </button>
          </div>
          <div class="qlp-embed-iframe-wrapper">
            <iframe src="about:blank" class="qlp-embed-iframe" sandbox="allow-scripts allow-same-origin allow-popups allow-forms" loading="lazy" data-src="${safeUrl}"></iframe>
            <div class="qlp-embed-loading" style="display: none;">
              <div class="qlp-spinner"></div>
              <div class="qlp-loading-text">正在加载网页...</div>
            </div>
            <div class="qlp-embed-error" style="display: none;">
              <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
              <div class="qlp-embed-error-title">无法加载网页</div>
              <div class="qlp-embed-error-desc">该网站可能禁止了 iframe 嵌入</div>
              <a class="qlp-embed-open-btn" href="${safeUrl}" target="_blank" rel="noopener noreferrer">在新标签页打开</a>
            </div>
          </div>
        </div>
      </div>
    `;

    const toggleBtn = container.querySelector('.qlp-embed-toggle');
    const embedContainer = container.querySelector('.qlp-embed-container');
    const infoDiv = container.querySelector('.qlp-webpage-info');
    const mediaContainer = container.querySelector('.qlp-media-container, .qlp-og-image-container');
    const iframe = container.querySelector('.qlp-embed-iframe');
    const embedLoading = container.querySelector('.qlp-embed-loading');
    const embedError = container.querySelector('.qlp-embed-error');
    const backBtn = container.querySelector('.qlp-embed-back');
    const refreshBtn = container.querySelector('.qlp-embed-refresh');
    const quickreadToggle = container.querySelector('.qlp-quickread-toggle');
    const quickreadPanel = container.querySelector('.qlp-quickread-panel');
    const quickreadClose = container.querySelector('.qlp-quickread-close');

    function showEmbedError() {
      if (embedLoading) embedLoading.style.display = 'none';
      if (embedError) embedError.style.display = 'flex';
      if (iframe) iframe.style.display = 'none';
    }

    function hideEmbedError() {
      if (embedLoading) embedLoading.style.display = 'none';
      if (embedError) embedError.style.display = 'none';
      if (iframe) iframe.style.display = 'block';
    }

    if (iframe) {
      let loadTimeout = null;
      
      iframe.addEventListener('load', () => {
        if (loadTimeout) {
          clearTimeout(loadTimeout);
          loadTimeout = null;
        }
        try {
          if (iframe.src && iframe.src !== 'about:blank') {
            setTimeout(() => {
              try {
                const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                if (!iframeDoc || iframeDoc.body.innerHTML === '' || iframeDoc.body.innerHTML === '<html><head></head><body></body></html>') {
                  showEmbedError();
                } else {
                  hideEmbedError();
                }
              } catch (e) {
                hideEmbedError();
              }
            }, 1000);
          }
        } catch (e) {
          hideEmbedError();
        }
      });

      iframe.addEventListener('error', () => {
        if (loadTimeout) {
          clearTimeout(loadTimeout);
          loadTimeout = null;
        }
        showEmbedError();
      });
    }

    if (backBtn) {
      backBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (embedContainer) embedContainer.style.display = 'none';
        if (infoDiv) infoDiv.style.display = '';
        if (mediaContainer) mediaContainer.style.display = '';
        if (toggleBtn) toggleBtn.classList.remove('qlp-embed-active');
        if (iframe) iframe.src = 'about:blank';
      });
    }

    if (refreshBtn) {
      refreshBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (iframe) {
          const src = iframe.getAttribute('data-src');
          if (embedLoading) embedLoading.style.display = 'flex';
          if (embedError) embedError.style.display = 'none';
          iframe.style.display = 'block';
          iframe.src = 'about:blank';
          setTimeout(() => {
            iframe.src = src;
          }, 50);
        }
      });
    }

    if (toggleBtn) {
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isActive = toggleBtn.classList.contains('qlp-embed-active');
        
        if (isActive) {
          toggleBtn.classList.remove('qlp-embed-active');
          embedContainer.style.display = 'none';
          if (infoDiv) infoDiv.style.display = '';
          if (mediaContainer) mediaContainer.style.display = '';
          if (iframe) iframe.src = 'about:blank';
        } else {
          toggleBtn.classList.add('qlp-embed-active');
          embedContainer.style.display = 'block';
          if (infoDiv) infoDiv.style.display = 'none';
          if (mediaContainer) mediaContainer.style.display = 'none';
          if (quickreadPanel && quickreadPanel.style.display !== 'none') {
            quickreadPanel.style.display = 'none';
            if (quickreadToggle) quickreadToggle.classList.remove('qlp-quickread-active');
          }
          if (iframe) {
            const src = iframe.getAttribute('data-src');
            if (embedLoading) embedLoading.style.display = 'flex';
            if (embedError) embedError.style.display = 'none';
            iframe.style.display = 'block';
            iframe.src = src;
            
            if (loadTimeout) clearTimeout(loadTimeout);
            loadTimeout = setTimeout(() => {
              if (embedLoading && embedLoading.style.display !== 'none') {
                showEmbedError();
              }
            }, 8000);
          }
        }
      });
    }

    if (quickreadToggle && quickreadPanel) {
      quickreadToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const isActive = quickreadToggle.classList.contains('qlp-quickread-active');

        if (isActive) {
          quickreadToggle.classList.remove('qlp-quickread-active');
          quickreadPanel.style.display = 'none';
          if (infoDiv) infoDiv.style.display = '';
          if (mediaContainer) mediaContainer.style.display = '';
        } else {
          quickreadToggle.classList.add('qlp-quickread-active');
          quickreadPanel.style.display = 'block';
          if (infoDiv) infoDiv.style.display = 'none';
          if (mediaContainer) mediaContainer.style.display = 'none';
          if (toggleBtn && toggleBtn.classList.contains('qlp-embed-active')) {
            toggleBtn.classList.remove('qlp-embed-active');
            embedContainer.style.display = 'none';
            if (iframe) iframe.src = 'about:blank';
          }
        }
      });
    }

    if (quickreadClose && quickreadPanel && quickreadToggle) {
      quickreadClose.addEventListener('click', (e) => {
        e.stopPropagation();
        quickreadPanel.style.display = 'none';
        quickreadToggle.classList.remove('qlp-quickread-active');
        if (infoDiv) infoDiv.style.display = '';
        if (mediaContainer) mediaContainer.style.display = '';
      });
    }
  }

  function renderFallbackPreview(url, container, type) {
    const icon = getFaviconFromUrl(url);
    const hostname = getHostname(url);
    const typeLabels = {
      'video-site': '视频网站',
      'audio-site': '音乐网站',
      'webpage': '网页链接',
      'unknown': '链接'
    };
    const safeUrl = escapeHtml(url);
    const safeHostname = escapeHtml(hostname);
    const safeIcon = escapeHtml(icon);
    const safeType = typeLabels[type] || '链接';

    container.innerHTML = `
      <div class="qlp-webpage-preview">
        <div class="qlp-webpage-info qlp-fallback-info">
          <div class="qlp-webpage-header">
            ${icon ? `<img src="${safeIcon}" class="qlp-favicon" alt="" onerror="this.style.display='none'" />` : ''}
            <span class="qlp-site-name">${safeHostname}</span>
            <span class="qlp-type-badge">${safeType}</span>
          </div>
          <div class="qlp-webpage-title">${safeUrl}</div>
          <div class="qlp-webpage-description">
            正在加载预览内容...
          </div>
          <button class="qlp-embed-toggle qlp-embed-toggle-full qlp-embed-active" data-url="${safeUrl}">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 7H9.5v-.5h-2v3h2V13H11v1c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1zm7 0h-1.5v-.5h-2v3h2V13H18v1c0 .55-.45 1-1 1h-3c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1z"/>
            </svg>
            加载预览中...
          </button>
        </div>
        <div class="qlp-embed-container">
          <div class="qlp-embed-header">
            <span class="qlp-embed-url">${safeUrl}</span>
            <button class="qlp-snapshot-btn" title="快照模式" style="display:none;">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
              </svg>
            </button>
            <button class="qlp-embed-refresh" title="刷新">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
              </svg>
            </button>
            <button class="qlp-embed-back" title="返回摘要">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
              </svg>
            </button>
          </div>
          <div class="qlp-embed-iframe-wrapper">
            <iframe src="about:blank" class="qlp-embed-iframe" sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation" loading="eager" referrerpolicy="no-referrer" data-src="${safeUrl}"></iframe>
            <div class="qlp-embed-loading">
              <div class="qlp-spinner"></div>
              <div class="qlp-loading-text">正在加载网页预览...</div>
              <div style="margin-top:8px;font-size:11px;color:#9ca3af;">如果加载时间较长，将自动切换到快照模式</div>
            </div>
            <div class="qlp-embed-error" style="display: none;">
              <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
              <div class="qlp-embed-error-title">无法直接加载网页</div>
              <div class="qlp-embed-error-desc">正在尝试快照模式加载...</div>
              <button class="qlp-snapshot-fallback" style="display:none; margin-bottom:12px;">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style="margin-right:6px;">
                  <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                </svg>
                使用快照模式
              </button>
              <a class="qlp-embed-open-btn" href="${safeUrl}" target="_blank" rel="noopener noreferrer">在新标签页打开</a>
            </div>
          </div>
        </div>
      </div>
    `;

    const toggleBtn = container.querySelector('.qlp-embed-toggle');
    const embedContainer = container.querySelector('.qlp-embed-container');
    const infoDiv = container.querySelector('.qlp-webpage-info');
    const iframe = container.querySelector('.qlp-embed-iframe');
    const iframeWrapper = container.querySelector('.qlp-embed-iframe-wrapper');
    const embedLoading = container.querySelector('.qlp-embed-loading');
    const embedError = container.querySelector('.qlp-embed-error');
    const backBtn = container.querySelector('.qlp-embed-back');
    const refreshBtn = container.querySelector('.qlp-embed-refresh');
    const snapshotBtn = container.querySelector('.qlp-snapshot-btn');
    const snapshotFallback = container.querySelector('.qlp-snapshot-fallback');
    const descEl = container.querySelector('.qlp-webpage-description');

    if (iframeWrapper) {
      iframeWrapper.addEventListener('wheel', (e) => {
        e.stopPropagation();
        const isScrollable = iframeWrapper.scrollHeight > iframeWrapper.clientHeight;
        if (isScrollable) {
          const atTop = iframeWrapper.scrollTop === 0;
          const atBottom = iframeWrapper.scrollTop + iframeWrapper.clientHeight >= iframeWrapper.scrollHeight - 1;
          
          if ((e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBottom)) {
            e.preventDefault();
          }
        }
      }, { passive: false, capture: true });

      iframeWrapper.addEventListener('scroll', (e) => {
        e.stopPropagation();
      }, true);
    }

    if (embedContainer) {
      embedContainer.addEventListener('wheel', (e) => {
        e.stopPropagation();
      }, { passive: false, capture: true });

      embedContainer.addEventListener('scroll', (e) => {
        e.stopPropagation();
      }, true);
    }

    let loadTimeout = null;
    let snapshotTried = false;
    let iframeLoaded = false;

    function showEmbedError(allowSnapshot = true) {
      if (embedLoading) embedLoading.style.display = 'none';
      if (embedError) {
        embedError.style.display = 'flex';
        const errorDesc = embedError.querySelector('.qlp-embed-error-desc');
        const errorTitle = embedError.querySelector('.qlp-embed-error-title');
        if (snapshotTried) {
          if (errorTitle) errorTitle.textContent = '无法加载预览';
          if (errorDesc) errorDesc.textContent = '该网页无法预览，请在新标签页中打开';
          if (snapshotFallback) snapshotFallback.style.display = 'none';
        } else {
          if (errorTitle) errorTitle.textContent = '无法直接加载网页';
          if (errorDesc) errorDesc.textContent = allowSnapshot ? '正在尝试快照模式加载...' : '请尝试快照模式或在新标签页打开';
          if (snapshotFallback && allowSnapshot) {
            snapshotFallback.style.display = 'inline-flex';
            snapshotFallback.className = 'qlp-snapshot-fallback qlp-embed-open-btn';
          }
        }
      }
      if (iframe) iframe.style.display = 'none';
    }

    function hideEmbedError() {
      if (embedLoading) embedLoading.style.display = 'none';
      if (embedError) embedError.style.display = 'none';
      if (iframe) iframe.style.display = 'block';
    }

    function loadSnapshotMode() {
      if (snapshotTried) return;
      snapshotTried = true;
      iframeLoaded = true;

      if (embedLoading) {
        embedLoading.style.display = 'flex';
        const loadingText = embedLoading.querySelector('.qlp-loading-text');
        if (loadingText) loadingText.textContent = '正在加载网页快照...';
      }
      if (embedError) embedError.style.display = 'none';
      if (iframe) iframe.style.display = 'none';

      chrome.runtime.sendMessage(
        { action: 'fetchPageSnapshot', url: url },
        (response) => {
          if (response && response.success && response.data && response.data.html) {
            try {
              if (iframe) {
                iframe.src = 'about:blank';
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                iframeDoc.open();
                iframeDoc.write(response.data.html);
                iframeDoc.close();
                iframe.style.display = 'block';
              }
              hideEmbedError();
              if (snapshotBtn) snapshotBtn.style.display = 'flex';
              if (descEl) descEl.textContent = '已使用快照模式加载（部分交互功能可能不可用）';
              if (toggleBtn) {
                toggleBtn.innerHTML = `
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                    <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                  </svg>
                  快照模式
                `;
              }
            } catch (e) {
              console.warn('Snapshot render failed:', e);
              showEmbedError(false);
            }
          } else {
            showEmbedError(false);
          }
        }
      );
    }

    function startIframeLoad() {
      if (loadTimeout) {
        clearTimeout(loadTimeout);
        loadTimeout = null;
      }
      iframeLoaded = false;
      snapshotTried = false;
      if (embedLoading) {
        embedLoading.style.display = 'flex';
        const loadingText = embedLoading.querySelector('.qlp-loading-text');
        if (loadingText) loadingText.textContent = '正在加载网页预览...';
      }
      if (embedError) embedError.style.display = 'none';
      if (iframe) {
        iframe.style.display = 'block';
        const src = iframe.getAttribute('data-src');
        iframe.src = src;
      }

      loadTimeout = setTimeout(() => {
        if (!iframeLoaded) {
          loadSnapshotMode();
        }
      }, 6000);
    }

    if (iframe) {
      iframe.addEventListener('load', () => {
        if (loadTimeout) {
          clearTimeout(loadTimeout);
          loadTimeout = null;
        }
        try {
          if (iframe.src && iframe.src !== 'about:blank') {
            setTimeout(() => {
              try {
                const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                if (!iframeDoc || iframeDoc.body.innerHTML === '' || iframeDoc.body.innerHTML === '<html><head></head><body></body></html>') {
                  if (!snapshotTried) {
                    loadSnapshotMode();
                  } else {
                    showEmbedError(false);
                  }
                } else {
                  iframeLoaded = true;
                  hideEmbedError();
                  if (descEl) descEl.textContent = '网页预览已加载';
                  if (toggleBtn) {
                    toggleBtn.innerHTML = `
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                        <path d="M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 7H9.5v-.5h-2v3h2V13H11v1c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1zm7 0h-1.5v-.5h-2v3h2V13H18v1c0 .55-.45 1-1 1h-3c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1z"/>
                      </svg>
                      预览已加载
                    `;
                  }
                }
              } catch (e) {
                iframeLoaded = true;
                hideEmbedError();
                if (descEl) descEl.textContent = '网页预览已加载';
                if (toggleBtn) {
                  toggleBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                      <path d="M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 7H9.5v-.5h-2v3h2V13H11v1c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1zm7 0h-1.5v-.5h-2v3h2V13H18v1c0 .55-.45 1-1 1h-3c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1z"/>
                    </svg>
                    预览已加载
                  `;
                }
              }
            }, 1500);
          }
        } catch (e) {
          if (!snapshotTried) {
            loadSnapshotMode();
          } else {
            showEmbedError(false);
          }
        }
      });

      iframe.addEventListener('error', () => {
        if (loadTimeout) {
          clearTimeout(loadTimeout);
          loadTimeout = null;
        }
        if (!snapshotTried) {
          loadSnapshotMode();
        } else {
          showEmbedError(false);
        }
      });
    }

    if (backBtn) {
      backBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (embedContainer) embedContainer.style.display = 'none';
        if (infoDiv) infoDiv.style.display = '';
        if (toggleBtn) toggleBtn.classList.remove('qlp-embed-active');
        if (iframe) iframe.src = 'about:blank';
        if (loadTimeout) {
          clearTimeout(loadTimeout);
          loadTimeout = null;
        }
      });
    }

    if (refreshBtn) {
      refreshBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        startIframeLoad();
      });
    }

    if (snapshotBtn) {
      snapshotBtn.style.cssText = 'display:flex;align-items:center;justify-content:center;width:28px;height:28px;border:none;background:#e5e7eb;color:#4b5563;border-radius:6px;cursor:pointer;transition:all 0.2s ease;padding:0;flex-shrink:0;';
      snapshotBtn.addEventListener('mouseenter', () => {
        snapshotBtn.style.background = '#d1d5db';
        snapshotBtn.style.color = '#1f2937';
      });
      snapshotBtn.addEventListener('mouseleave', () => {
        snapshotBtn.style.background = '#e5e7eb';
        snapshotBtn.style.color = '#4b5563';
      });
      snapshotBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        loadSnapshotMode();
      });
    }

    if (snapshotFallback) {
      snapshotFallback.addEventListener('click', (e) => {
        e.stopPropagation();
        loadSnapshotMode();
      });
    }

    if (toggleBtn) {
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isActive = toggleBtn.classList.contains('qlp-embed-active');
        
        if (isActive) {
          toggleBtn.classList.remove('qlp-embed-active');
          embedContainer.style.display = 'none';
          if (infoDiv) infoDiv.style.display = '';
          if (iframe) iframe.src = 'about:blank';
          if (loadTimeout) {
            clearTimeout(loadTimeout);
            loadTimeout = null;
          }
          if (descEl) descEl.textContent = '点击下方按钮可尝试在预览中打开网页，或点击右上角在新标签页打开';
          toggleBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 7H9.5v-.5h-2v3h2V13H11v1c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1zm7 0h-1.5v-.5h-2v3h2V13H18v1c0 .55-.45 1-1 1h-3c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1z"/>
            </svg>
            尝试网页预览
          `;
        } else {
          toggleBtn.classList.add('qlp-embed-active');
          embedContainer.style.display = 'block';
          if (infoDiv) infoDiv.style.display = 'none';
          startIframeLoad();
        }
      });
    }

    setTimeout(() => {
      startIframeLoad();
    }, 100);
  }

  function getFaviconFromUrl(url) {
    try {
      const urlObj = new URL(url);
      return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(urlObj.hostname)}&sz=32`;
    } catch (e) {
      return '';
    }
  }

  function getHostname(url) {
    try {
      return new URL(url).hostname;
    } catch (e) {
      return url;
    }
  }

  function hidePreview() {
    if (hoverTimer) {
      clearTimeout(hoverTimer);
      hoverTimer = null;
    }
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    if (previewPanel) {
      previewPanel.classList.remove('qlp-visible');
      currentLink = null;
      isPanelHovered = false;
      const content = previewPanel.querySelector('#qlp-preview-content');
      if (content) {
        const videos = content.querySelectorAll('video');
        videos.forEach(v => { v.pause(); v.src = ''; });
        const audios = content.querySelectorAll('audio');
        audios.forEach(a => { a.pause(); a.src = ''; });
        const iframes = content.querySelectorAll('iframe');
        iframes.forEach(f => { f.src = 'about:blank'; });
      }
    }
  }

  function handleLinkHover(event) {
    if (settings.triggerMode !== 'hover') return;
    if (isInBlacklist(window.location.href)) return;

    const link = event.target.closest('a');
    if (!link || !link.href || !isValidUrl(link.href)) return;

    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }

    if (hoverTimer) clearTimeout(hoverTimer);

    hoverTimer = setTimeout(() => {
      showPreview(link, event);
    }, settings.hoverDelay);
  }

  function handleLinkLeave(event) {
    if (settings.triggerMode !== 'hover') return;

    const link = event.target.closest('a');
    if (!link || !link.href) return;

    if (hoverTimer) {
      clearTimeout(hoverTimer);
      hoverTimer = null;
    }

    scheduleHide();
  }

  function handleLinkClick(event) {
    if (settings.triggerMode !== 'click') return;
    if (isInBlacklist(window.location.href)) return;

    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.button !== 0) {
      return;
    }

    const link = event.target.closest('a');
    if (!link || !link.href || !isValidUrl(link.href)) return;

    if (previewPanel && previewPanel.classList.contains('qlp-visible')) {
      hidePreview();
      event.preventDefault();
      event.stopPropagation();
    } else {
      event.preventDefault();
      event.stopPropagation();
      showPreview(link, event);
    }
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      hidePreview();
    }
  }

  function handleDocClick(event) {
    if (previewPanel && previewPanel.classList.contains('qlp-visible')) {
      if (!previewPanel.contains(event.target) && !event.target.closest('a')) {
        hidePreview();
      }
    }
  }

  function handleScroll(event) {
    if (!previewPanel || !previewPanel.classList.contains('qlp-visible')) {
      return;
    }

    let scrollTarget = event.target;
    if (event.composedPath && event.composedPath().length > 0) {
      scrollTarget = event.composedPath()[0];
    }

    const isDocumentScroll = scrollTarget === document || 
                            scrollTarget === document.documentElement || 
                            scrollTarget === document.body ||
                            scrollTarget === window;

    if (isDocumentScroll) {
      hidePreview();
      return;
    }

    if (previewPanel && previewPanel.contains && !previewPanel.contains(scrollTarget)) {
      hidePreview();
    }
  }

  function loadSettings() {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (result) => {
      settings = { ...DEFAULT_SETTINGS, ...result };
    });
  }

  function handleRePreview(url) {
    if (!url || !isValidUrl(url)) return;
    const fakeLink = { href: url, textContent: '', title: '' };
    const fakeEvent = { clientX: window.innerWidth / 2, clientY: 100, target: { getBoundingClientRect: () => ({ left: window.innerWidth / 2, top: 50, bottom: 70 }) } };
    showPreview(fakeLink, fakeEvent);
  }

  function init() {
    loadSettings();

    document.addEventListener('mouseover', handleLinkHover, true);
    document.addEventListener('mouseout', handleLinkLeave, true);
    document.addEventListener('click', handleLinkClick, true);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleDocClick);
    window.addEventListener('scroll', handleScroll, true);

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync') {
        for (const key in changes) {
          settings[key] = changes[key].newValue;
        }
      }
    });

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'rePreview' && request.url) {
        handleRePreview(request.url);
        sendResponse({ success: true });
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
