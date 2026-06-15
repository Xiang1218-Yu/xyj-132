(function () {
  'use strict';

  if (window.top !== window.self) {
    return;
  }

  window.QLP = window.QLP || {};
  const _ = QLP;

  _.createLoadingHtml = function createLoadingHtml(options = {}) {
    const {
      text = '正在加载...',
      showProgress = true,
      indeterminate = true,
      showMeta = false,
      percent = 0,
      loadedSize = '',
      totalSize = ''
    } = options;

    let progressHtml = '';
    if (showProgress) {
      progressHtml = `
        <div class="qlp-loading-progress">
          <div class="qlp-loading-progress-bar ${indeterminate ? 'indeterminate' : ''}" 
               style="width: ${indeterminate ? '30%' : percent + '%'}"></div>
        </div>
      `;
    }

    let metaHtml = '';
    if (showMeta) {
      metaHtml = `
        <div class="qlp-loading-meta">
          <span class="qlp-loading-percent">${percent}%</span>
          ${loadedSize || totalSize ? `<span class="qlp-loading-size">${loadedSize || '--'} / ${totalSize || '--'}</span>` : ''}
        </div>
      `;
    }

    return `
      <div class="qlp-loading">
        <div class="qlp-spinner"></div>
        <div class="qlp-loading-text">${text}</div>
        ${progressHtml}
        ${metaHtml}
      </div>
    `;
  };

  _.createErrorHtml = function createErrorHtml(options = {}) {
    const {
      error = null,
      title = '',
      message = '',
      showRetry = true,
      retryCount = 0,
      maxRetries = _.LOAD_CONFIG.maxRetries,
      showDetails = true
    } = options;

    const errorInfo = _.getErrorCategory(error);
    const displayTitle = title || errorInfo.label;
    const displayMessage = message || (error?.message ? String(error.message) : '请检查网络连接后重试');
    const remainingRetries = Math.max(0, maxRetries - retryCount);

    return `
      <div class="qlp-error-container">
        <div class="qlp-error-icon">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
        </div>
        <div class="qlp-error-title">${displayTitle}</div>
        <div class="qlp-error-message">${displayMessage}</div>
        ${showDetails && error ? `<div class="qlp-error-details" title="${_.escapeHtml(String(error.message || error))}">${_.escapeHtml(String(error.message || error))}</div>` : ''}
        <div class="qlp-error-actions">
          ${showRetry && remainingRetries > 0 ? `
            <button class="qlp-retry-btn" data-action="retry">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
              </svg>
              重新加载
            </button>
          ` : ''}
          <a class="qlp-retry-btn" href="${_.escapeHtml(options.url || '#')}" target="_blank" rel="noopener noreferrer" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
            </svg>
            在新标签页打开
          </a>
        </div>
        ${showRetry && retryCount > 0 ? `<div class="qlp-retry-count">已重试 ${retryCount} 次，还可重试 ${remainingRetries} 次</div>` : ''}
      </div>
    `;
  };

  _.updateLoadingProgress = function updateLoadingProgress(container, percent, loadedSize, totalSize) {
    const progressBar = container.querySelector('.qlp-loading-progress-bar');
    const percentEl = container.querySelector('.qlp-loading-percent');
    const sizeEl = container.querySelector('.qlp-loading-size');

    if (progressBar) {
      progressBar.classList.remove('indeterminate');
      progressBar.style.width = percent + '%';
    }
    if (percentEl) {
      percentEl.textContent = Math.round(percent) + '%';
    }
    if (sizeEl && loadedSize && totalSize) {
      sizeEl.textContent = `${_.formatFileSize(loadedSize)} / ${_.formatFileSize(totalSize)}`;
    }
  };

  _.loadImageWithProgress = function loadImageWithProgress(url, onProgress, onLoad, onError, timeout = _.LOAD_CONFIG.imageTimeout) {
    const xhr = new XMLHttpRequest();
    let timedOut = false;
    let completed = false;

    const timeoutId = setTimeout(() => {
      timedOut = true;
      completed = true;
      xhr.abort();
      if (onError) onError(new Error('加载超时，请检查网络连接'));
    }, timeout);

    xhr.open('GET', url, true);
    xhr.responseType = 'blob';

    xhr.onprogress = (e) => {
      if (timedOut || completed) return;
      if (e.lengthComputable && onProgress) {
        const percent = (e.loaded / e.total) * 100;
        onProgress(percent, e.loaded, e.total);
      }
    };

    xhr.onload = () => {
      if (timedOut || completed) return;
      clearTimeout(timeoutId);
      completed = true;

      if (xhr.status >= 200 && xhr.status < 300) {
        const blob = xhr.response;
        const imgUrl = URL.createObjectURL(blob);
        if (onLoad) onLoad(imgUrl, xhr.getResponseHeader('content-type'));
      } else {
        if (onError) onError(new Error(`HTTP ${xhr.status}: ${xhr.statusText || '请求失败'}`));
      }
    };

    xhr.onerror = () => {
      if (timedOut || completed) return;
      clearTimeout(timeoutId);
      completed = true;
      if (onError) onError(new Error('网络错误，无法加载图片'));
    };

    xhr.onabort = () => {
      if (timedOut || completed) return;
      clearTimeout(timeoutId);
      completed = true;
    };

    try {
      xhr.send();
    } catch (e) {
      clearTimeout(timeoutId);
      if (onError) onError(e);
    }

    return {
      abort: () => {
        clearTimeout(timeoutId);
        completed = true;
        xhr.abort();
      }
    };
  };

  _.loadPreviewContent = function loadPreviewContent(url, type, container, securityInfo = null, ruleActions = null) {
    const securityBadge = securityInfo && _.settings.enableSecurityCheck ? _.createSecurityBadge(securityInfo) : '';

    switch (type) {
      case 'image':
        _.loadImagePreview(url, container, securityBadge);
        break;
      case 'video':
        _.loadVideoPreview(url, container, securityBadge);
        break;
      case 'audio':
        _.loadAudioPreview(url, container, securityBadge);
        break;
      case 'video-site':
      case 'audio-site':
      case 'webpage':
      default:
        _.loadWebpagePreview(url, container, type, securityBadge, ruleActions);
        break;
    }
  };

  _.loadImagePreview = function loadImagePreview(url, container, securityBadge = '', retryCount = 0) {
    let loadController = null;
    let objectUrl = null;

    const loadingHtml = _.createLoadingHtml({
      text: '正在加载图片...',
      showProgress: true,
      indeterminate: true,
      showMeta: true,
      percent: 0
    });
    container.innerHTML = _.renderContentWithOrder(loadingHtml, securityBadge);

    function onProgress(percent, loaded, total) {
      _.updateLoadingProgress(container, percent, loaded, total);
    }

    function onLoad(imgUrl, contentType) {
      objectUrl = imgUrl;
      const contentHtml = `
        <div class="qlp-image-container">
          <img src="${imgUrl}" alt="图片预览" class="qlp-preview-image" />
        </div>
      `;
      container.innerHTML = _.renderContentWithOrder(contentHtml, securityBadge);
    }

    function onError(error) {
      const errorHtml = _.createErrorHtml({
        error: error,
        title: '图片加载失败',
        url: url,
        retryCount: retryCount,
        maxRetries: _.LOAD_CONFIG.maxRetries
      });
      container.innerHTML = _.renderContentWithOrder(errorHtml, securityBadge);

      const retryBtn = container.querySelector('[data-action="retry"]');
      if (retryBtn) {
        retryBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
            objectUrl = null;
          }
          _.loadImagePreview(url, container, securityBadge, retryCount + 1);
        });
      }
    }

    loadController = _.loadImageWithProgress(
      url,
      onProgress,
      onLoad,
      onError,
      _.LOAD_CONFIG.imageTimeout
    );

    const cleanupObserver = new MutationObserver(() => {
      if (!document.body.contains(container)) {
        if (loadController && loadController.abort) {
          loadController.abort();
        }
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
        cleanupObserver.disconnect();
      }
    });
    if (container.parentNode) {
      cleanupObserver.observe(container.parentNode, { childList: true, subtree: true });
    }
  };

  _.loadVideoPreview = function loadVideoPreview(url, container, securityBadge = '', retryCount = 0) {
    const loadingHtml = _.createLoadingHtml({
      text: '正在加载视频...',
      showProgress: true,
      indeterminate: true,
      showMeta: true,
      percent: 0
    });
    container.innerHTML = _.renderContentWithOrder(loadingHtml, securityBadge);

    let loadTimeout = null;
    let loaded = false;
    let errored = false;

    function handleError(error) {
      if (loaded || errored) return;
      errored = true;
      if (loadTimeout) {
        clearTimeout(loadTimeout);
        loadTimeout = null;
      }

      const errorHtml = _.createErrorHtml({
        error: error || new Error('视频加载失败'),
        title: '视频加载失败',
        url: url,
        retryCount: retryCount,
        maxRetries: _.LOAD_CONFIG.maxRetries
      });
      container.innerHTML = _.renderContentWithOrder(errorHtml, securityBadge);

      const retryBtn = container.querySelector('[data-action="retry"]');
      if (retryBtn) {
        retryBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          _.loadVideoPreview(url, container, securityBadge, retryCount + 1);
        });
      }
    }

    function handleProgress(event) {
      const media = event.target;
      if (media.buffered && media.buffered.length > 0 && media.duration) {
        const bufferedEnd = media.buffered.end(media.buffered.length - 1);
        const percent = Math.min(100, (bufferedEnd / media.duration) * 100);
        const loadedBytes = media.buffered.length * media.duration * 0.5;
        _.updateLoadingProgress(container, percent, loadedBytes, media.duration * 0.5);
      }
    }

    function handleLoadedData(event) {
      loaded = true;
      if (loadTimeout) {
        clearTimeout(loadTimeout);
        loadTimeout = null;
      }

      const video = event.target;
      const contentHtml = `
        <div class="qlp-media-container">
          <video src="${url}" controls class="qlp-preview-media" preload="metadata" muted autoplay>
            您的浏览器不支持视频播放
          </video>
        </div>
      `;
      container.innerHTML = _.renderContentWithOrder(contentHtml, securityBadge);
      const newVideo = container.querySelector('video');
      if (newVideo) {
        newVideo.play().catch(() => {});
      }
    }

    const video = document.createElement('video');
    video.src = url;
    video.preload = 'auto';
    video.muted = true;

    video.addEventListener('progress', handleProgress);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('canplay', handleLoadedData);
    video.addEventListener('error', () => {
      handleError(new Error('视频文件无法加载或格式不支持'));
    });
    video.addEventListener('stalled', () => {
      const warning = container.querySelector('.qlp-timeout-warning');
      if (!warning) {
        const loadingEl = container.querySelector('.qlp-loading');
        if (loadingEl) {
          const warnDiv = document.createElement('div');
          warnDiv.className = 'qlp-timeout-warning';
          warnDiv.innerHTML = `
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
            </svg>
            加载速度较慢，请稍候...
          `;
          loadingEl.appendChild(warnDiv);
        }
      }
    });

    loadTimeout = setTimeout(() => {
      if (!loaded) {
        handleError(new Error('加载超时，请检查网络连接'));
      }
    }, _.LOAD_CONFIG.videoTimeout);

    video.load();
  };

  _.loadAudioPreview = function loadAudioPreview(url, container, securityBadge = '', retryCount = 0) {
    const loadingHtml = _.createLoadingHtml({
      text: '正在加载音频...',
      showProgress: true,
      indeterminate: true,
      showMeta: true,
      percent: 0
    });
    container.innerHTML = _.renderContentWithOrder(loadingHtml, securityBadge);

    let loadTimeout = null;
    let loaded = false;
    let errored = false;

    function handleError(error) {
      if (loaded || errored) return;
      errored = true;
      if (loadTimeout) {
        clearTimeout(loadTimeout);
        loadTimeout = null;
      }

      const errorHtml = _.createErrorHtml({
        error: error || new Error('音频加载失败'),
        title: '音频加载失败',
        url: url,
        retryCount: retryCount,
        maxRetries: _.LOAD_CONFIG.maxRetries
      });
      container.innerHTML = _.renderContentWithOrder(errorHtml, securityBadge);

      const retryBtn = container.querySelector('[data-action="retry"]');
      if (retryBtn) {
        retryBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          _.loadAudioPreview(url, container, securityBadge, retryCount + 1);
        });
      }
    }

    function handleProgress(event) {
      const media = event.target;
      if (media.buffered && media.buffered.length > 0 && media.duration) {
        const bufferedEnd = media.buffered.end(media.buffered.length - 1);
        const percent = Math.min(100, (bufferedEnd / media.duration) * 100);
        _.updateLoadingProgress(container, percent, bufferedEnd, media.duration);
      }
    }

    function handleLoadedData(event) {
      loaded = true;
      if (loadTimeout) {
        clearTimeout(loadTimeout);
        loadTimeout = null;
      }

      const contentHtml = `
        <div class="qlp-audio-container">
          <div class="qlp-audio-icon">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
          </div>
          <audio src="${url}" controls class="qlp-preview-audio" preload="metadata" autoplay>
            您的浏览器不支持音频播放
          </audio>
        </div>
      `;
      container.innerHTML = _.renderContentWithOrder(contentHtml, securityBadge);
      const audio = container.querySelector('audio');
      if (audio) {
        audio.play().catch(() => {});
      }
    }

    const audio = document.createElement('audio');
    audio.src = url;
    audio.preload = 'auto';

    audio.addEventListener('progress', handleProgress);
    audio.addEventListener('loadeddata', handleLoadedData);
    audio.addEventListener('canplay', handleLoadedData);
    audio.addEventListener('error', () => {
      handleError(new Error('音频文件无法加载或格式不支持'));
    });
    audio.addEventListener('stalled', () => {
      const warning = container.querySelector('.qlp-timeout-warning');
      if (!warning) {
        const loadingEl = container.querySelector('.qlp-loading');
        if (loadingEl) {
          const warnDiv = document.createElement('div');
          warnDiv.className = 'qlp-timeout-warning';
          warnDiv.innerHTML = `
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
            </svg>
            加载速度较慢，请稍候...
          `;
          loadingEl.appendChild(warnDiv);
        }
      }
    });

    loadTimeout = setTimeout(() => {
      if (!loaded) {
        handleError(new Error('加载超时，请检查网络连接'));
      }
    }, _.LOAD_CONFIG.audioTimeout);

    audio.load();
  };

  _.getFaviconFromUrl = function getFaviconFromUrl(url) {
    try {
      const urlObj = new URL(url);
      return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(urlObj.hostname)}&sz=32`;
    } catch (e) {
      return '';
    }
  };

  _.getHostname = function getHostname(url) {
    try {
      return new URL(url).hostname;
    } catch (e) {
      return url;
    }
  };

  _.canEmbedUrl = function canEmbedUrl(url) {
    try {
      const hostname = _.getHostname(url);
      const noEmbedDomains = [
        'google.com', 'google.com.hk', 'google.co.jp',
        'facebook.com', 'fb.com',
        'twitter.com', 'x.com',
        'instagram.com',
        'linkedin.com',
        'apple.com',
        'microsoft.com',
        'paypal.com',
        'github.com'
      ];
      return !noEmbedDomains.some(d => hostname === d || hostname.endsWith('.' + d));
    } catch (e) {
      return true;
    }
  };

  _.loadWebpagePreview = function loadWebpagePreview(url, container, type, securityBadge = '', ruleActions = null, retryCount = 0) {
    const loadingHtml = _.createLoadingHtml({
      text: '正在获取页面信息...',
      showProgress: true,
      indeterminate: true,
      showMeta: false,
      percent: 0
    });
    container.innerHTML = _.renderContentWithOrder(loadingHtml, securityBadge);

    let completed = false;
    let timeoutId = null;
    let progressInterval = null;
    let progressPercent = 0;

    progressInterval = setInterval(() => {
      if (progressPercent < 90) {
        progressPercent += Math.random() * 10;
        if (progressPercent > 90) progressPercent = 90;
        const progressBar = container.querySelector('.qlp-loading-progress-bar');
        const percentEl = container.querySelector('.qlp-loading-percent');
        if (progressBar) {
          progressBar.classList.remove('indeterminate');
          progressBar.style.width = progressPercent + '%';
        }
        if (percentEl) {
          percentEl.textContent = Math.round(progressPercent) + '%';
        }
      }
    }, 500);

    timeoutId = setTimeout(() => {
      if (completed) return;
      completed = true;
      clearInterval(progressInterval);
      clearTimeout(timeoutId);
      handleLoadError(new Error('获取页面信息超时'));
    }, _.LOAD_CONFIG.webpageTimeout);

    function handleLoadError(error) {
      if (completed) return;
      completed = true;
      clearInterval(progressInterval);
      clearTimeout(timeoutId);

      if (retryCount < _.LOAD_CONFIG.maxRetries) {
        const errorHtml = _.createErrorHtml({
          error: error,
          title: '页面加载失败',
          url: url,
          retryCount: retryCount,
          maxRetries: _.LOAD_CONFIG.maxRetries,
          message: '正在尝试使用备用模式加载...'
        });
        container.innerHTML = _.renderContentWithOrder(errorHtml, securityBadge);

        const retryBtn = container.querySelector('[data-action="retry"]');
        if (retryBtn) {
          retryBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            _.loadWebpagePreview(url, container, type, securityBadge, ruleActions, retryCount + 1);
          });
        }

        setTimeout(() => {
          _.renderFallbackPreview(url, container, type, securityBadge, retryCount + 1);
        }, 500);
      } else {
        _.renderFallbackPreview(url, container, type, securityBadge, retryCount);
      }
    }

    try {
      chrome.runtime.sendMessage({ action: 'fetchPageInfo', url: url }, (response) => {
        if (completed) return;

        if (chrome.runtime.lastError) {
          handleLoadError(new Error(chrome.runtime.lastError.message || '扩展通信错误'));
          return;
        }

        if (response && response.success) {
          completed = true;
          clearInterval(progressInterval);
          clearTimeout(timeoutId);
          
          const progressBar = container.querySelector('.qlp-loading-progress-bar');
          if (progressBar) {
            progressBar.classList.remove('indeterminate');
            progressBar.style.width = '100%';
          }
          
          setTimeout(() => {
            _.renderRichPreview(url, response.data, container, type, securityBadge, ruleActions);
          }, 200);
        } else {
          handleLoadError(new Error(response?.error || '无法获取页面信息'));
        }
      });
    } catch (e) {
      handleLoadError(e);
    }
  };

  _.renderRichPreview = function renderRichPreview(url, data, container, type, securityBadge = '', ruleActions = null) {
    const icon = data.favicon || _.getFaviconFromUrl(url);
    const image = data.image || '';
    const title = _.escapeHtml(data.title || url);
    const description = _.escapeHtml(data.description || '');
    const siteName = _.escapeHtml(data.siteName || _.getHostname(url));
    const safeIcon = _.escapeHtml(icon);
    const safeImage = image ? _.escapeHtml(image) : '';
    const safeUrl = _.escapeHtml(url);

    let mediaHtml = '';
    if (type === 'video-site' && data.video) {
      const safeVideo = _.escapeHtml(data.video);
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
    const canEmbed = _.canEmbedUrl(url);
    const hasSummary = data.summary && data.summary.length > 0;
    const hasKeywords = data.keywords && data.keywords.length > 0;
    const hasHeadings = data.headings && data.headings.length > 0;
    const hasReadingTime = data.readingTime && data.readingTime.minutes > 0;
    const hasQuickRead = hasSummary || hasKeywords || hasHeadings || hasReadingTime;

    let keywordsHtml = '';
    if (hasKeywords) {
      keywordsHtml = data.keywords.map(kw => 
        `<span class="qlp-keyword-tag">${_.escapeHtml(kw)}</span>`
      ).join('');
    }

    let headingsHtml = '';
    if (hasHeadings) {
      headingsHtml = data.headings.map(h => {
        const indent = (h.level - 1) * 12;
        return `
          <div class="qlp-heading-item" style="padding-left: ${indent}px;">
            <span class="qlp-heading-level">H${h.level}</span>
            <span class="qlp-heading-text">${_.escapeHtml(h.text)}</span>
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

    const contentHtml = `
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
            <div class="qlp-quickread-summary">${_.escapeHtml(data.summary)}</div>
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
    
    container.innerHTML = _.renderContentWithOrder(contentHtml, securityBadge);

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

    if (ruleActions) {
      if (ruleActions.autoEmbed && toggleBtn && !toggleBtn.classList.contains('qlp-embed-active')) {
        setTimeout(() => {
          toggleBtn.click();
        }, 200);
      } else if (ruleActions.autoQuickRead && quickreadToggle && !quickreadToggle.classList.contains('qlp-quickread-active')) {
        setTimeout(() => {
          quickreadToggle.click();
        }, 200);
      }
    }
  };

  _.renderFallbackPreview = function renderFallbackPreview(url, container, type, securityBadge = '') {
    const icon = _.getFaviconFromUrl(url);
    const hostname = _.getHostname(url);
    const typeLabels = {
      'video-site': '视频网站',
      'audio-site': '音乐网站',
      'webpage': '网页链接',
      'unknown': '链接'
    };
    const safeUrl = _.escapeHtml(url);
    const safeHostname = _.escapeHtml(hostname);
    const safeIcon = _.escapeHtml(icon);
    const safeType = typeLabels[type] || '链接';

    const contentHtml = `
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
              <div class="qlp-embed-progress-container">
                <div class="qlp-embed-progress-bar indeterminate"></div>
              </div>
              <div class="qlp-embed-loading-meta">
                <span class="qlp-embed-percent">0%</span>
                <span class="qlp-embed-loading-hint">如果加载时间较长，将自动切换到快照模式</span>
              </div>
            </div>
            <div class="qlp-embed-error" style="display: none;">
              <div class="qlp-embed-error-icon">
                <svg viewBox="0 0 24 24" width="36" height="36" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
              </div>
              <div class="qlp-embed-error-title">无法直接加载网页</div>
              <div class="qlp-embed-error-message">该网页可能设置了防嵌入策略或跨域限制</div>
              <div class="qlp-embed-error-details">
                <span class="qlp-embed-error-tag">嵌入限制</span>
              </div>
              <div class="qlp-embed-error-actions">
                <button class="qlp-embed-retry-btn qlp-snapshot-fallback" style="display:none;">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style="margin-right:6px;">
                    <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                  </svg>
                  使用快照模式
                </button>
                <a class="qlp-embed-open-btn" href="${safeUrl}" target="_blank" rel="noopener noreferrer">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style="margin-right:6px;">
                    <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
                  </svg>
                  在新标签页打开
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    container.innerHTML = _.renderContentWithOrder(contentHtml, securityBadge);

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
    let progressInterval = null;
    let progressPercent = 0;

    function stopProgressAnimation() {
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }
    }

    function startProgressAnimation(type = 'iframe') {
      stopProgressAnimation();
      progressPercent = 0;
      const progressBar = embedLoading?.querySelector('.qlp-embed-progress-bar');
      const percentEl = embedLoading?.querySelector('.qlp-embed-percent');
      const loadingHint = embedLoading?.querySelector('.qlp-embed-loading-hint');
      const loadingText = embedLoading?.querySelector('.qlp-loading-text');

      if (loadingText) {
        loadingText.textContent = type === 'snapshot' ? '正在加载网页快照...' : '正在加载网页预览...';
      }

      if (loadingHint) {
        loadingHint.textContent = type === 'snapshot' 
          ? '正在获取页面快照，请稍候...' 
          : '如果加载时间较长，将自动切换到快照模式';
      }

      if (progressBar) {
        progressBar.classList.add('indeterminate');
      }
      if (percentEl) {
        percentEl.textContent = '';
      }

      setTimeout(() => {
        if (progressBar && progressPercent === 0) {
          progressBar.classList.remove('indeterminate');
          progressBar.style.width = '0%';
          if (percentEl) percentEl.textContent = '0%';
          
          progressInterval = setInterval(() => {
            const increment = type === 'snapshot' ? 3 : 5;
            const maxProgress = type === 'snapshot' ? 80 : 60;
            
            if (progressPercent < maxProgress) {
              progressPercent += Math.random() * increment;
              if (progressPercent > maxProgress) progressPercent = maxProgress;
              if (progressBar) progressBar.style.width = progressPercent + '%';
              if (percentEl) percentEl.textContent = Math.round(progressPercent) + '%';
            }
          }, type === 'snapshot' ? 400 : 500);
        }
      }, 300);
    }

    function completeProgressAnimation() {
      stopProgressAnimation();
      const progressBar = embedLoading?.querySelector('.qlp-embed-progress-bar');
      const percentEl = embedLoading?.querySelector('.qlp-embed-percent');
      
      if (progressBar) {
        progressBar.classList.remove('indeterminate');
        progressBar.style.width = '100%';
      }
      if (percentEl) {
        percentEl.textContent = '100%';
      }
    }

    function updateErrorDisplay(errorType = 'embed', message = '') {
      if (!embedError) return;
      
      const errorTitle = embedError.querySelector('.qlp-embed-error-title');
      const errorMessage = embedError.querySelector('.qlp-embed-error-message');
      const errorTag = embedError.querySelector('.qlp-embed-error-tag');
      const snapshotBtnInError = embedError.querySelector('.qlp-embed-retry-btn');
      
      const errorCategories = {
        timeout: {
          title: '加载超时',
          message: '网络连接较慢或服务器响应超时，请稍后再试',
          tag: '超时'
        },
        embed: {
          title: '无法直接加载网页',
          message: '该网页可能设置了防嵌入策略（X-Frame-Options）或跨域限制',
          tag: '嵌入限制'
        },
        network: {
          title: '网络错误',
          message: '无法连接到服务器，请检查网络连接',
          tag: '网络错误'
        },
        snapshot_failed: {
          title: '无法加载预览',
          message: '该网页无法生成预览快照，请在新标签页中打开',
          tag: '预览失败'
        }
      };
      
      const category = errorCategories[errorType] || errorCategories.embed;
      
      if (errorTitle) errorTitle.textContent = category.title;
      if (errorMessage) errorMessage.textContent = message || category.message;
      if (errorTag) errorTag.textContent = category.tag;
      
      if (snapshotBtnInError) {
        if (errorType === 'snapshot_failed' || snapshotTried) {
          snapshotBtnInError.style.display = 'none';
        } else {
          snapshotBtnInError.style.display = 'inline-flex';
        }
      }
    }

    function showEmbedError(errorType = 'embed', message = '') {
      stopProgressAnimation();
      if (embedLoading) embedLoading.style.display = 'none';
      if (embedError) {
        embedError.style.display = 'flex';
        updateErrorDisplay(errorType, message);
      }
      if (iframe) iframe.style.display = 'none';
    }

    function hideEmbedError() {
      stopProgressAnimation();
      if (embedLoading) embedLoading.style.display = 'none';
      if (embedError) embedError.style.display = 'none';
      if (iframe) iframe.style.display = 'block';
    }

    function loadSnapshotMode() {
      if (snapshotTried) return;
      snapshotTried = true;

      if (embedLoading) {
        embedLoading.style.display = 'flex';
        startProgressAnimation('snapshot');
      }
      if (embedError) embedError.style.display = 'none';
      if (iframe) iframe.style.display = 'none';

      let snapshotTimeout = setTimeout(() => {
        if (!iframeLoaded) {
          showEmbedError('timeout', '快照加载超时，请在新标签页中打开');
        }
      }, 15000);

      chrome.runtime.sendMessage(
        { action: 'fetchPageSnapshot', url: url },
        (response) => {
          clearTimeout(snapshotTimeout);
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
              iframeLoaded = true;
              completeProgressAnimation();
              setTimeout(() => {
                hideEmbedError();
              }, 200);
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
              showEmbedError('snapshot_failed');
            }
          } else {
            showEmbedError('snapshot_failed', response?.error || '无法获取页面快照');
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
      stopProgressAnimation();
      
      if (embedLoading) {
        embedLoading.style.display = 'flex';
        startProgressAnimation('iframe');
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
                    showEmbedError('embed');
                  }
                } else {
                  iframeLoaded = true;
                  completeProgressAnimation();
                  setTimeout(() => {
                    hideEmbedError();
                  }, 200);
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
                completeProgressAnimation();
                setTimeout(() => {
                  hideEmbedError();
                }, 200);
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
            showEmbedError('embed');
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
          showEmbedError('network');
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
  };
})();
