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

    container.innerHTML = `
      <div class="qlp-webpage-preview">
        ${mediaHtml}
        <div class="qlp-webpage-info">
          <div class="qlp-webpage-header">
            ${icon ? `<img src="${safeIcon}" class="qlp-favicon" alt="" onerror="this.style.display='none'" />` : ''}
            <span class="qlp-site-name">${siteName}</span>
          </div>
          <div class="qlp-webpage-title">${title}</div>
          ${description ? `<div class="qlp-webpage-description">${description}</div>` : ''}
        </div>
      </div>
    `;
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
            点击右上角按钮在新标签页中打开查看完整内容
          </div>
        </div>
      </div>
    `;
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

  function handleScroll() {
    if (previewPanel && previewPanel.classList.contains('qlp-visible')) {
      hidePreview();
    }
  }

  function loadSettings() {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (result) => {
      settings = { ...DEFAULT_SETTINGS, ...result };
    });
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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
