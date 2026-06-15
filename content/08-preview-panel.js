(function () {
  'use strict';

  if (window.top !== window.self) {
    return;
  }

  window.QLP = window.QLP || {};
  const _ = QLP;

  _.hoverTimer = null;
  _.hideTimer = null;
  _.currentLink = null;
  _.currentLinkTitle = '';
  _.currentLinkData = null;
  _.isFavoriteCurrent = false;
  _.isPanelHovered = false;

  _.createPreviewPanel = function createPreviewPanel() {
    if (_.previewPanel) return _.previewPanel;

    const panel = document.createElement('div');
    panel.className = 'qlp-preview-panel';
    panel.id = 'qlp-preview-panel';

    const settings = _.settings;
    const safePrimary = _.escapeHtml(settings.theme.primaryColor);
    const safeSecondary = _.escapeHtml(settings.theme.secondaryColor);

    panel.innerHTML = `
      <div class="qlp-panel-resize-handle qlp-resize-nw" data-dir="nw"></div>
      <div class="qlp-panel-resize-handle qlp-resize-ne" data-dir="ne"></div>
      <div class="qlp-panel-resize-handle qlp-resize-sw" data-dir="sw"></div>
      <div class="qlp-panel-resize-handle qlp-resize-se" data-dir="se"></div>
      <div class="qlp-panel-resize-handle qlp-resize-n" data-dir="n"></div>
      <div class="qlp-panel-resize-handle qlp-resize-s" data-dir="s"></div>
      <div class="qlp-panel-resize-handle qlp-resize-e" data-dir="e"></div>
      <div class="qlp-panel-resize-handle qlp-resize-w" data-dir="w"></div>

      <div class="qlp-preview-header" style="background: linear-gradient(135deg, ${safePrimary} 0%, ${safeSecondary} 100%);">
        <div class="qlp-header-left">
          <img id="qlp-link-favicon" class="qlp-link-favicon" src="" alt="" onerror="this.style.display='none'" />
          <span id="qlp-link-title" class="qlp-link-title"></span>
        </div>
        <div class="qlp-header-right">
          <button id="qlp-shortcut-hint-btn" class="qlp-header-btn" title="快捷键 (Shift+?)">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M20 5H4c-1.1 0-1.99.9-1.99 2L2 17c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zm-1 2H5v-2h2v2zm0-3H5V8h2v2zm9 7H8v-2h8v2zm0-4h-2v-2h2v2zm0-3h-2V8h2v2zm3 3h-2v-2h2v2zm0-3h-2V8h2v2z"/>
            </svg>
          </button>
          <button id="qlp-favorite-btn" class="qlp-header-btn" title="收藏 (F)">
            <svg class="qlp-favorite-icon" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </button>
          <button id="qlp-qrcode-btn" class="qlp-header-btn" title="二维码 (Q)">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M3 11h8V3H3v8zm2-6h4v4H5V5zm8-2v8h8V3h-8zm6 6h-4V5h4v4zM3 21h8v-8H3v8zm2-6h4v4H5v-4zm13-2h-2v2h2v2h-2v2h2v-2h2v-2h-2v-2h-2zm-2 0h-2v2h-2v2h2v2h2v-2h2v-2h-2v-2z"/>
            </svg>
          </button>
          <button id="qlp-copy-btn" class="qlp-header-btn" title="复制链接 (C)">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
            </svg>
          </button>
          <button id="qlp-share-btn" class="qlp-header-btn" title="分享 (S)">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
            </svg>
          </button>
          <a id="qlp-open-new-tab" class="qlp-header-btn" href="" target="_blank" rel="noopener noreferrer" title="在新标签页打开 (O)">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
            </svg>
          </a>
          <button id="qlp-close-btn" class="qlp-header-btn" title="关闭 (Esc)">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="qlp-anchor-indicator" style="display:none;"></div>

      <div class="qlp-preview-body" style="width: ${settings.previewWidth}px; height: ${settings.previewHeight}px;">
        <div id="qlp-preview-content" class="qlp-preview-content"></div>
      </div>

      <div class="qlp-preview-footer">
        <span id="qlp-link-url" class="qlp-footer-url" title=""></span>
        <div class="qlp-footer-spacer"></div>
        <span id="qlp-link-type" class="qlp-footer-type"></span>
      </div>
    `;

    document.body.appendChild(panel);
    _.previewPanel = panel;

    _.applyThemeToPanel(panel);
    _.applyComponentVisibility(panel);
    _.bindPreviewPanelEvents(panel);

    return panel;
  };

  _.bindPreviewPanelEvents = function bindPreviewPanelEvents(panel) {
    panel.addEventListener('mouseenter', () => {
      _.isPanelHovered = true;
      if (_.hideTimer) {
        clearTimeout(_.hideTimer);
        _.hideTimer = null;
      }
    });

    panel.addEventListener('mouseleave', () => {
      _.isPanelHovered = false;
      if (_.settings.triggerMode === 'hover') {
        _.scheduleHide();
      }
    });

    panel.querySelector('#qlp-close-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      _.hidePreview();
    });

    panel.querySelector('#qlp-copy-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      _.copyCurrentLink();
    });

    panel.querySelector('#qlp-favorite-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      _.toggleFavoriteCurrent();
    });

    panel.querySelector('#qlp-qrcode-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      _.toggleQrcodePanel();
    });

    panel.querySelector('#qlp-share-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      _.executeShortcutAction('share');
    });

    panel.querySelector('#qlp-shortcut-hint-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      const hintPanel = document.getElementById('qlp-shortcut-hint-panel');
      if (hintPanel && hintPanel.classList.contains('qlp-visible')) {
        _.hideShortcutHint();
      } else {
        _.showShortcutHint();
      }
    });

    const resizeHandles = panel.querySelectorAll('.qlp-panel-resize-handle');
    resizeHandles.forEach(handle => {
      handle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const dir = handle.dataset.dir;
        const startX = e.clientX;
        const startY = e.clientY;
        const body = panel.querySelector('.qlp-preview-body');
        const startWidth = body.offsetWidth;
        const startHeight = body.offsetHeight;
        const minW = 280;
        const minH = 200;
        const maxW = Math.min(window.innerWidth * 0.8, 800);
        const maxH = Math.min(window.innerHeight * 0.8, 800);

        function onResizeMove(ev) {
          ev.preventDefault();
          let newW = startWidth;
          let newH = startHeight;

          if (dir.includes('e')) newW = Math.max(minW, Math.min(maxW, startWidth + (ev.clientX - startX)));
          if (dir.includes('w')) newW = Math.max(minW, Math.min(maxW, startWidth - (ev.clientX - startX)));
          if (dir.includes('s')) newH = Math.max(minH, Math.min(maxH, startHeight + (ev.clientY - startY)));
          if (dir.includes('n')) newH = Math.max(minH, Math.min(maxH, startHeight - (ev.clientY - startY)));

          body.style.width = newW + 'px';
          body.style.height = newH + 'px';
        }

        function onResizeUp() {
          document.removeEventListener('mousemove', onResizeMove);
          document.removeEventListener('mouseup', onResizeUp);
          const body = panel.querySelector('.qlp-preview-body');
          _.settings.previewWidth = body.offsetWidth;
          _.settings.previewHeight = body.offsetHeight;
          if (chrome.storage && chrome.storage.sync) {
            chrome.storage.sync.set({
              previewWidth: body.offsetWidth,
              previewHeight: body.offsetHeight
            });
          }
        }

        document.addEventListener('mousemove', onResizeMove);
        document.addEventListener('mouseup', onResizeUp);
      });
    });
  };

  _.scheduleHide = function scheduleHide() {
    if (_.hideTimer) {
      clearTimeout(_.hideTimer);
    }
    _.hideTimer = setTimeout(() => {
      if (!_.isPanelHovered) {
        _.hidePreview();
      }
    }, _.settings.hideDelay);
  };

  _.hidePreview = function hidePreview() {
    if (_.hoverTimer) {
      clearTimeout(_.hoverTimer);
      _.hoverTimer = null;
    }
    if (_.hideTimer) {
      clearTimeout(_.hideTimer);
      _.hideTimer = null;
    }
    if (_.previewPanel) {
      _.previewPanel.classList.remove('qlp-visible');
      _.currentLink = null;
      _.currentLinkTitle = '';
      _.currentLinkData = null;
      _.isFavoriteCurrent = false;
      _.isPanelHovered = false;
      const content = _.previewPanel.querySelector('#qlp-preview-content');
      if (content) {
        const videos = content.querySelectorAll('video');
        videos.forEach(v => { v.pause(); v.src = ''; });
        const audios = content.querySelectorAll('audio');
        audios.forEach(a => { a.pause(); a.src = ''; });
        const iframes = content.querySelectorAll('iframe');
        iframes.forEach(f => { f.src = 'about:blank'; });
      }
    }
    _.hideQrcodePanel();
    _.hideShortcutHint();
  };

  _.getAbsoluteUrl = function getAbsoluteUrl(href) {
    try {
      return new URL(href, window.location.href).href;
    } catch (e) {
      return href;
    }
  };

  _.isInBlacklist = function isInBlacklist(url) {
    try {
      const hostname = _.getHostname(url);
      return _.settings.blacklist.some(pattern => {
        if (!pattern) return false;
        try {
          if (pattern.startsWith('*.')) {
            const domain = pattern.slice(2);
            return hostname === domain || hostname.endsWith('.' + domain);
          }
          return hostname === pattern || hostname.endsWith('.' + pattern);
        } catch (e) {
          return false;
        }
      });
    } catch (e) {
      return false;
    }
  };

  _.handleLinkHover = function handleLinkHover(event) {
    if (_.isBatchModeActive) return;
    if (_.settings.triggerMode !== 'hover') return;
    if (_.isInBlacklist(window.location.href)) return;

    const link = event.target.closest('a');
    if (!link || !link.href || !_.isValidUrl(link.href)) return;

    if (_.hideTimer) {
      clearTimeout(_.hideTimer);
      _.hideTimer = null;
    }

    if (_.hoverTimer) clearTimeout(_.hoverTimer);

    _.hoverTimer = setTimeout(() => {
      _.showPreview(link, event);
    }, _.settings.hoverDelay);
  };

  _.handleLinkLeave = function handleLinkLeave(event) {
    if (_.isBatchModeActive) return;
    if (_.settings.triggerMode !== 'hover') return;

    const link = event.target.closest('a');
    if (!link || !link.href) return;

    if (_.hoverTimer) {
      clearTimeout(_.hoverTimer);
      _.hoverTimer = null;
    }

    _.scheduleHide();
  };

  _.handleLinkClick = function handleLinkClick(event) {
    if (_.isBatchModeActive) return;
    if (_.settings.triggerMode !== 'click') return;
    if (_.isInBlacklist(window.location.href)) return;

    const batchHotkey = _.settings.batchMode.hotkey;
    const modifierPressed =
      (batchHotkey !== 'Alt' && event.altKey) ||
      (batchHotkey !== 'Control' && (event.ctrlKey || event.metaKey)) ||
      (batchHotkey !== 'Shift' && event.shiftKey) ||
      event.button !== 0;

    if (modifierPressed) {
      return;
    }

    const link = event.target.closest('a');
    if (!link || !link.href || !_.isValidUrl(link.href)) return;

    if (_.previewPanel && _.previewPanel.classList.contains('qlp-visible')) {
      _.hidePreview();
      event.preventDefault();
      event.stopPropagation();
    } else {
      event.preventDefault();
      event.stopPropagation();
      _.showPreview(link, event);
    }
  };

  _.handleDocClick = function handleDocClick(event) {
    if (_.isBatchModeActive) return;
    
    if (_.batchComparePanel && _.batchComparePanel.classList.contains('qlp-visible')) {
      if (!_.batchComparePanel.contains(event.target)) {
        _.hideBatchCompareView();
        return;
      }
    }
    
    if (_.previewPanel && _.previewPanel.classList.contains('qlp-visible')) {
      if (!_.previewPanel.contains(event.target) && !event.target.closest('a')) {
        _.hidePreview();
      }
    }
  };

  _.handleScroll = function handleScroll(event) {
    if (_.isBatchModeActive) {
      _.updateLinkMarkers();
      return;
    }
    
    if (!_.previewPanel || !_.previewPanel.classList.contains('qlp-visible')) {
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
      _.hidePreview();
      return;
    }

    if (_.previewPanel && _.previewPanel.contains && !_.previewPanel.contains(scrollTarget)) {
      _.hidePreview();
    }
  };

  _.showPreview = function showPreview(link, event) {
    const panel = _.createPreviewPanel();
    const absoluteUrl = _.getAbsoluteUrl(link.href);

    if (!_.isValidUrl(absoluteUrl) || _.isInBlacklist(absoluteUrl)) {
      return;
    }

    _.currentLink = absoluteUrl;
    _.currentLinkTitle = link.textContent?.trim() || link.title || absoluteUrl;

    const linkType = _.getLinkType(absoluteUrl);
    const securityInfo = _.settings.enableSecurityCheck ? _.evaluateUrlSecurity(absoluteUrl) : null;
    const ruleActions = _.matchPreviewRule(absoluteUrl);

    _.currentLinkData = {
      url: absoluteUrl,
      type: linkType,
      security: securityInfo,
      title: _.currentLinkTitle,
      favicon: _.getFaviconFromUrl(absoluteUrl),
      siteName: _.getHostname(absoluteUrl)
    };

    const favicon = panel.querySelector('#qlp-link-favicon');
    const title = panel.querySelector('#qlp-link-title');
    const url = panel.querySelector('#qlp-link-url');
    const type = panel.querySelector('#qlp-link-type');
    const openNewTab = panel.querySelector('#qlp-open-new-tab');
    const content = panel.querySelector('#qlp-preview-content');

    const safeUrl = _.escapeHtml(absoluteUrl);
    const safeTitle = _.escapeHtml(_.currentLinkTitle.length > 60 ? _.currentLinkTitle.slice(0, 60) + '...' : _.currentLinkTitle);
    const safeDisplayUrl = _.escapeHtml(absoluteUrl.length > 70 ? absoluteUrl.slice(0, 70) + '...' : absoluteUrl);

    if (favicon) {
      favicon.src = _.getFaviconFromUrl(absoluteUrl);
      favicon.style.display = '';
    }
    if (title) {
      title.textContent = safeTitle;
      title.title = _.currentLinkTitle;
    }
    if (url) {
      url.textContent = safeDisplayUrl;
      url.title = absoluteUrl;
    }
    if (type) {
      const typeLabels = {
        'image': '图片', 'video': '视频', 'audio': '音频',
        'video-site': '视频网站', 'audio-site': '音乐网站',
        'webpage': '网页', 'unknown': '链接'
      };
      type.textContent = typeLabels[linkType] || '链接';
    }
    if (openNewTab) {
      openNewTab.href = absoluteUrl;
    }

    content.innerHTML = '';
    _.applyThemeToPanel(panel);
    _.applyComponentVisibility(panel);

    const body = panel.querySelector('.qlp-preview-body');
    if (body) {
      body.style.width = _.settings.previewWidth + 'px';
      body.style.height = _.settings.previewHeight + 'px';
    }

    _.positionPreviewPanel(panel, link, event, _.settings.previewWidth, _.settings.previewHeight + 60);

    panel.classList.add('qlp-visible');

    if (ruleActions && ruleActions.delay !== undefined) {
      setTimeout(() => {
        if (_.currentLink === absoluteUrl) {
          _.loadPreviewContent(absoluteUrl, linkType, content, securityInfo, ruleActions);
        }
      }, ruleActions.delay);
    } else {
      _.loadPreviewContent(absoluteUrl, linkType, content, securityInfo, ruleActions);
    }

    if (_.settings.shortcuts && _.settings.shortcuts.enabled && _.settings.shortcuts.showHintOnOpen) {
      setTimeout(() => {
        if (_.previewPanel && _.previewPanel.classList.contains('qlp-visible')) {
          _.showShortcutHint();
          setTimeout(() => {
            _.hideShortcutHint();
          }, 3000);
        }
      }, 500);
    }

    _.checkFavoriteStatus(absoluteUrl);

    chrome.runtime.sendMessage({
      action: 'addPreviewHistory',
      item: {
        url: absoluteUrl,
        title: _.currentLinkTitle,
        type: linkType,
        favicon: _.currentLinkData.favicon,
        siteName: _.getHostname(absoluteUrl),
        security: securityInfo
      }
    });
  };

  _.handleMouseMove = function handleMouseMove(event) {
    _.currentMousePos.x = event.clientX;
    _.currentMousePos.y = event.clientY;
    _.lastMouseMoveEvent = event;

    if (_.settings.positioning.enableMouseFollow && _.previewPanel && _.previewPanel.classList.contains('qlp-visible') && !_.isPanelHovered) {
      const mode = _.settings.positioning.mode;
      const panelWidth = _.settings.previewWidth;
      const panelHeight = _.settings.previewHeight + 60;
      const posSettings = _.settings.positioning;
      const trigger = _.getTriggerPosition(event);
      let result;

      if (mode === 'fixed') {
        return;
      }

      if (mode === 'mouse' || mode === 'auto') {
        result = _.calculateMouseFollowPosition(event, panelWidth, panelHeight, trigger.rect);
      } else if (mode === 'anchor') {
        const anchorDir = posSettings.anchorPosition !== 'auto'
          ? posSettings.anchorPosition
          : _.currentAnchorPoint.direction;
        result = _.calculateAnchorPositionWithMouseOffset(
          anchorDir,
          trigger.rect,
          panelWidth,
          panelHeight,
          event
        );
      }

      if (result) {
        _.targetPanelPos.left = result.left;
        _.targetPanelPos.top = result.top;

        _.currentAnchorPoint.x = result.anchorX || trigger.x;
        _.currentAnchorPoint.y = result.anchorY || trigger.y;
        _.currentAnchorPoint.direction = result.direction;

        if (posSettings.smoothTransition) {
          _.startMouseFollowAnimation(_.previewPanel);
        } else {
          _.previewPanel.style.left = result.left + 'px';
          _.previewPanel.style.top = result.top + 'px';
        }

        if (posSettings.showAnchorIndicator && result.direction !== 'fixed') {
          _.updateAnchorIndicator(_.previewPanel, _.currentAnchorPoint.x, _.currentAnchorPoint.y, result.direction);
        }
      }
    }
  };

  _.calculateAnchorPositionWithMouseOffset = function calculateAnchorPositionWithMouseOffset(anchorDirection, triggerRect, panelWidth, panelHeight, event) {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 10;
    const offsetX = _.settings.positioning.offsetX;
    const offsetY = _.settings.positioning.offsetY;
    const sensitivity = _.settings.positioning.mouseFollowSensitivity * 0.5;

    const triggerCenterX = triggerRect.left + triggerRect.width / 2;
    const triggerCenterY = triggerRect.top + triggerRect.height / 2;

    const mouseOffsetX = (event.clientX - triggerCenterX) * sensitivity;
    const mouseOffsetY = (event.clientY - triggerCenterY) * sensitivity;

    let left, top, anchorX, anchorY;

    switch (anchorDirection) {
      case 'top':
        left = triggerCenterX - panelWidth / 2 + mouseOffsetX;
        top = triggerRect.top - panelHeight - offsetY + mouseOffsetY;
        anchorX = triggerCenterX;
        anchorY = triggerRect.top;
        if (left < margin) left = margin;
        if (left + panelWidth > viewportWidth - margin) left = viewportWidth - panelWidth - margin;
        if (top < margin) {
          top = triggerRect.bottom + offsetY + mouseOffsetY;
          anchorDirection = 'bottom';
        }
        break;
      case 'bottom':
        left = triggerCenterX - panelWidth / 2 + mouseOffsetX;
        top = triggerRect.bottom + offsetY + mouseOffsetY;
        anchorX = triggerCenterX;
        anchorY = triggerRect.bottom;
        if (left < margin) left = margin;
        if (left + panelWidth > viewportWidth - margin) left = viewportWidth - panelWidth - margin;
        if (top + panelHeight > viewportHeight - margin) {
          top = triggerRect.top - panelHeight - offsetY + mouseOffsetY;
          anchorDirection = 'top';
        }
        break;
      case 'left':
        left = triggerRect.left - panelWidth - offsetX + mouseOffsetX;
        top = triggerCenterY - panelHeight / 2 + mouseOffsetY;
        anchorX = triggerRect.left;
        anchorY = triggerCenterY;
        if (top < margin) top = margin;
        if (top + panelHeight > viewportHeight - margin) top = viewportHeight - panelHeight - margin;
        if (left < margin) {
          left = triggerRect.right + offsetX + mouseOffsetX;
          anchorDirection = 'right';
        }
        break;
      case 'right':
        left = triggerRect.right + offsetX + mouseOffsetX;
        top = triggerCenterY - panelHeight / 2 + mouseOffsetY;
        anchorX = triggerRect.right;
        anchorY = triggerCenterY;
        if (top < margin) top = margin;
        if (top + panelHeight > viewportHeight - margin) top = viewportHeight - panelHeight - margin;
        if (left + panelWidth > viewportWidth - margin) {
          left = triggerRect.left - panelWidth - offsetX + mouseOffsetX;
          anchorDirection = 'left';
        }
        break;
      default:
        return _.selectOptimalAnchor(triggerRect, panelWidth, panelHeight);
    }

    if (left + panelWidth > viewportWidth - margin) left = viewportWidth - panelWidth - margin;
    if (left < margin) left = margin;
    if (top + panelHeight > viewportHeight - margin) top = viewportHeight - panelHeight - margin;
    if (top < margin) top = margin;

    return { direction: anchorDirection, left, top, anchorX, anchorY };
  };

  _.handleKeyDown = function handleKeyDown(event) {
    if (event.key === 'Escape') {
      _.hidePreview();
      _.hideQrcodePanel();
      if (_.isBatchModeActive) {
        _.cancelBatchMode();
      }
      return;
    }

    if (_.currentLink && _.settings.shortcuts && _.settings.shortcuts.enabled && !_.isBatchModeActive) {
      const target = event.target;
      const isInputFocused = target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true' ||
        target.tagName === 'SELECT'
      );
      
      if (!isInputFocused) {
        const action = _.settings.shortcuts.actions.find(a => a.key === event.key);
        if (action) {
          event.preventDefault();
          event.stopPropagation();
          _.executeShortcutAction(action.action);
          return;
        }
      }
    }
    
    if (!_.settings.batchMode.enabled) return;
    
    const hotkey = _.settings.batchMode.hotkey;
    const isHotkeyPressed =
      (hotkey === 'Shift' && event.key === 'Shift') ||
      (hotkey === 'Control' && (event.key === 'Control' || event.key === 'Meta')) ||
      (hotkey === 'Alt' && event.key === 'Alt');

    if (isHotkeyPressed && !_.isBatchModeActive && !event.repeat) {
      if (_.settings.triggerMode === 'click' && hotkey === 'Alt' && event.altKey) {
        return;
      }
      _.startBatchMode();
    }
  };

  _.handleKeyUp = function handleKeyUp(event) {
    if (!_.settings.batchMode.enabled) return;
    
    if (!_.isBatchModeActive) return;

    const hotkey = _.settings.batchMode.hotkey;
    let shouldEnd = false;

    if (hotkey === 'Shift') {
      shouldEnd = !event.shiftKey;
    } else if (hotkey === 'Control') {
      shouldEnd = !event.ctrlKey && !event.metaKey;
    } else if (hotkey === 'Alt') {
      shouldEnd = !event.altKey;
    }

    if (shouldEnd) {
      _.endBatchMode();
    }
  };
})();
