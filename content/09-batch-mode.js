(function () {
  'use strict';

  if (window.top !== window.self) {
    return;
  }

  window.QLP = window.QLP || {};
  const _ = QLP;

  _.isBatchModeActive = false;
  _.batchCollectedLinks = [];
  _.linkMarkerElements = new Map();
  _.batchComparePanel = null;

  _.startBatchMode = function startBatchMode() {
    _.isBatchModeActive = true;
    _.batchCollectedLinks = [];
    _.linkMarkerElements.clear();
    _.hidePreview();
    
    document.body.classList.add('qlp-batch-mode-active');
    _.showBatchModeIndicator();
    
    document.querySelectorAll('a[href]').forEach(link => {
      if (_.isValidUrl(link.href) && !_.isInBlacklist(window.location.href)) {
        link.addEventListener('mouseenter', _.handleBatchModeLinkHover);
      }
    });
  };

  _.handleBatchModeLinkHover = function handleBatchModeLinkHover(event) {
    if (!_.isBatchModeActive) return;
    
    const link = event.target.closest('a');
    if (!link || !link.href || !_.isValidUrl(link.href)) return;
    
    const absoluteUrl = _.getAbsoluteUrl(link.href);
    const existingIdx = _.batchCollectedLinks.findIndex(l => l.url === absoluteUrl);
    
    if (existingIdx === -1) {
      const securityInfo = _.evaluateUrlSecurity(absoluteUrl);
      const linkType = _.getLinkType(absoluteUrl);
      const linkData = {
        url: absoluteUrl,
        title: link.textContent?.trim() || link.title || absoluteUrl,
        type: linkType,
        security: securityInfo,
        favicon: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(_.getHostname(absoluteUrl))}&sz=32`,
        timestamp: Date.now(),
        element: link
      };
      
      _.batchCollectedLinks.push(linkData);
      
      if (_.settings.batchMode.enableFloatingMarker) {
        _.addLinkMarker(link, securityInfo, _.batchCollectedLinks.length);
      }
      
      chrome.runtime.sendMessage({
        action: 'addPreviewHistory',
        item: {
          url: absoluteUrl,
          title: linkData.title,
          type: linkType,
          favicon: linkData.favicon,
          siteName: _.getHostname(absoluteUrl),
          security: securityInfo
        }
      });
      
      _.updateBatchCount();
    }
  };

  _.addLinkMarker = function addLinkMarker(link, securityInfo, index) {
    const marker = document.createElement('div');
    marker.className = 'qlp-link-marker';
    
    const levelInfo = _.getSecurityLevelInfo(securityInfo.level);
    marker.style.borderColor = levelInfo.borderColor;
    marker.style.background = levelInfo.bgColor;
    marker.style.color = levelInfo.color;
    marker.innerHTML = `<span class="qlp-marker-number">${index}</span><span class="qlp-marker-icon">${levelInfo.icon}</span>`;
    
    const rect = link.getBoundingClientRect();
    marker.style.left = (rect.right + 4) + 'px';
    marker.style.top = (rect.top + window.scrollY) + 'px';
    
    document.body.appendChild(marker);
    _.linkMarkerElements.set(link, marker);
  };

  _.updateLinkMarkers = function updateLinkMarkers() {
    _.linkMarkerElements.forEach((marker, link) => {
      const rect = link.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        marker.style.left = (rect.right + 4) + 'px';
        marker.style.top = (rect.top + window.scrollY) + 'px';
        marker.style.display = 'flex';
      } else {
        marker.style.display = 'none';
      }
    });
  };

  _.showBatchModeIndicator = function showBatchModeIndicator() {
    let indicator = document.getElementById('qlp-batch-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'qlp-batch-indicator';
      indicator.className = 'qlp-batch-indicator';
      indicator.innerHTML = `
        <span class="qlp-indicator-icon">📋</span>
        <span class="qlp-indicator-text">批量预览模式</span>
        <span class="qlp-indicator-count" id="qlp-batch-count">0</span>
        <span class="qlp-indicator-hint">松开 ${_.settings.batchMode.hotkey} 对比 / Esc 取消</span>
      `;
      document.body.appendChild(indicator);
    }
    indicator.style.display = 'flex';
  };

  _.updateBatchCount = function updateBatchCount() {
    const countEl = document.getElementById('qlp-batch-count');
    if (countEl) {
      countEl.textContent = _.batchCollectedLinks.length;
    }
  };

  _.endBatchMode = function endBatchMode() {
    _.isBatchModeActive = false;
    
    document.body.classList.remove('qlp-batch-mode-active');
    
    const indicator = document.getElementById('qlp-batch-indicator');
    if (indicator) {
      indicator.style.display = 'none';
    }
    
    _.linkMarkerElements.forEach(marker => marker.remove());
    _.linkMarkerElements.clear();
    
    document.querySelectorAll('a[href]').forEach(link => {
      link.removeEventListener('mouseenter', _.handleBatchModeLinkHover);
    });
    
    if (_.batchCollectedLinks.length > 0) {
      if (_.settings.batchMode.autoShowCompare) {
        _.showBatchCompareView();
      }
    }
  };

  _.cancelBatchMode = function cancelBatchMode() {
    _.isBatchModeActive = false;
    _.batchCollectedLinks = [];
    
    document.body.classList.remove('qlp-batch-mode-active');
    
    const indicator = document.getElementById('qlp-batch-indicator');
    if (indicator) {
      indicator.style.display = 'none';
    }
    
    _.linkMarkerElements.forEach(marker => marker.remove());
    _.linkMarkerElements.clear();
    
    document.querySelectorAll('a[href]').forEach(link => {
      link.removeEventListener('mouseenter', _.handleBatchModeLinkHover);
    });
  };

  _.createBatchComparePanel = function createBatchComparePanel() {
    if (_.batchComparePanel) return _.batchComparePanel;
    
    const panel = document.createElement('div');
    panel.className = 'qlp-batch-compare-panel';
    panel.id = 'qlp-batch-compare-panel';
    panel.innerHTML = `
      <div class="qlp-compare-header">
        <div class="qlp-compare-title">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
          </svg>
          链接批量对比视图
          <span class="qlp-compare-count">(${_.batchCollectedLinks.length} 个链接)</span>
        </div>
        <div class="qlp-compare-actions">
          <select class="qlp-compare-sort" id="qlp-compare-sort">
            <option value="order">按选择顺序</option>
            <option value="security-high">安全性: 高到低</option>
            <option value="security-low">安全性: 低到高</option>
            <option value="type">按类型分组</option>
          </select>
          <button class="qlp-compare-action-btn" id="qlp-compare-export" title="导出结果">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
            </svg>
            导出
          </button>
          <button class="qlp-compare-action-btn" id="qlp-compare-close" title="关闭 (Esc)">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="qlp-compare-content" id="qlp-compare-content">
        ${_.renderBatchCompareCards()}
      </div>
    `;
    
    document.body.appendChild(panel);
    _.applyThemeToPanel(panel);
    
    const batchHeader = panel.querySelector('.qlp-compare-header');
    if (batchHeader) {
      batchHeader.style.background = `linear-gradient(135deg, ${_.settings.theme.primaryColor} 0%, ${_.settings.theme.secondaryColor} 100%)`;
    }
    
    panel.querySelector('#qlp-compare-close').addEventListener('click', () => {
      _.hideBatchCompareView();
    });
    
    panel.querySelector('#qlp-compare-sort').addEventListener('change', (e) => {
      _.sortAndRenderCompareCards(e.target.value);
    });
    
    panel.querySelector('#qlp-compare-export').addEventListener('click', () => {
      _.exportBatchResults();
    });
    
    panel.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    
    _.batchComparePanel = panel;
    return panel;
  };

  _.renderBatchCompareCards = function renderBatchCompareCards() {
    if (_.batchCollectedLinks.length === 0) {
      return `
        <div class="qlp-compare-empty">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
          <p>没有选择任何链接</p>
          <p class="qlp-compare-empty-hint">按住 ${_.settings.batchMode.hotkey} 键并将鼠标移过链接来收集</p>
        </div>
      `;
    }
    
    return _.batchCollectedLinks.map((link, index) => {
      const secInfo = link.security || { level: 'unknown', score: 0, risks: [] };
      const levelInfo = _.getSecurityLevelInfo(secInfo.level);
      const typeLabels = {
        'video': '视频', 'video-site': '视频',
        'audio': '音频', 'audio-site': '音频',
        'image': '图片', 'webpage': '网页', 'unknown': '链接'
      };
      
      const risksHtml = secInfo.risks && secInfo.risks.length > 0
        ? secInfo.risks.map(r => `<span class="qlp-risk-tag qlp-risk-${r.severity}">${_.escapeHtml(r.message)}</span>`).join('')
        : '<span class="qlp-risk-safe">✓ 无风险</span>';
      
      return `
        <div class="qlp-compare-card qlp-card-security-${secInfo.level}" data-url="${_.escapeHtml(link.url)}" data-index="${index}">
          <div class="qlp-compare-card-header">
            <div class="qlp-compare-card-index">${index + 1}</div>
            <img class="qlp-compare-card-favicon" src="${_.escapeHtml(link.favicon)}" alt="" onerror="this.style.display='none'">
            <div class="qlp-compare-card-title" title="${_.escapeHtml(link.title)}">${_.escapeHtml(link.title.length > 30 ? link.title.slice(0, 30) + '...' : link.title)}</div>
            <div class="qlp-compare-card-security" style="background: ${levelInfo.bgColor}; color: ${levelInfo.color}; border-color: ${levelInfo.borderColor};">
              <span class="qlp-security-icon">${levelInfo.icon}</span>
              <span class="qlp-security-label">${levelInfo.label}</span>
              <span class="qlp-security-score">${secInfo.score}</span>
            </div>
          </div>
          <div class="qlp-compare-card-body">
            <div class="qlp-compare-card-url" title="${_.escapeHtml(link.url)}">${_.escapeHtml(link.url.length > 50 ? link.url.slice(0, 50) + '...' : link.url)}</div>
            <div class="qlp-compare-card-meta">
              <span class="qlp-compare-card-type">${typeLabels[link.type] || '链接'}</span>
              <span class="qlp-compare-card-domain">${_.escapeHtml(_.getHostname(link.url))}</span>
            </div>
            ${_.settings.enableSecurityCheck ? `
              <div class="qlp-compare-card-risks">
                ${risksHtml}
              </div>
            ` : ''}
          </div>
          <div class="qlp-compare-card-footer">
            <button class="qlp-compare-card-btn qlp-btn-preview" data-url="${_.escapeHtml(link.url)}">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
              </svg>
              预览
            </button>
            <a class="qlp-compare-card-btn qlp-btn-open" href="${_.escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
              </svg>
              打开
            </a>
            <button class="qlp-compare-card-btn qlp-btn-remove" data-index="${index}">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
              </svg>
              移除
            </button>
          </div>
        </div>
      `;
    }).join('');
  };

  _.sortAndRenderCompareCards = function sortAndRenderCompareCards(sortType) {
    const sorted = [..._.batchCollectedLinks];
    
    switch (sortType) {
      case 'security-high':
        sorted.sort((a, b) => (b.security?.score || 0) - (a.security?.score || 0));
        break;
      case 'security-low':
        sorted.sort((a, b) => (a.security?.score || 0) - (b.security?.score || 0));
        break;
      case 'type':
        sorted.sort((a, b) => a.type.localeCompare(b.type));
        break;
      case 'order':
      default:
        sorted.sort((a, b) => a.timestamp - b.timestamp);
        break;
    }
    
    _.batchCollectedLinks = sorted;
    
    const content = document.getElementById('qlp-compare-content');
    if (content) {
      content.innerHTML = _.renderBatchCompareCards();
      _.bindCompareCardEvents();
    }
  };

  _.bindCompareCardEvents = function bindCompareCardEvents() {
    const panel = _.batchComparePanel;
    if (!panel) return;
    
    panel.querySelectorAll('.qlp-btn-preview').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const url = btn.dataset.url;
        const fakeLink = { href: url, textContent: '', title: '' };
        const fakeEvent = { clientX: window.innerWidth / 2, clientY: 100, target: { getBoundingClientRect: () => ({ left: window.innerWidth / 2, top: 50, bottom: 70 }) } };
        _.hideBatchCompareView();
        setTimeout(() => _.showPreview(fakeLink, fakeEvent), 100);
      });
    });
    
    panel.querySelectorAll('.qlp-btn-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt(btn.dataset.index, 10);
        _.batchCollectedLinks.splice(index, 1);
        const content = document.getElementById('qlp-compare-content');
        if (content) {
          content.innerHTML = _.renderBatchCompareCards();
          _.bindCompareCardEvents();
        }
        const countEl = panel.querySelector('.qlp-compare-count');
        if (countEl) countEl.textContent = `(${_.batchCollectedLinks.length} 个链接)`;
      });
    });
  };

  _.showBatchCompareView = function showBatchCompareView() {
    _.hidePreview();
    const panel = _.createBatchComparePanel();
    const countEl = panel.querySelector('.qlp-compare-count');
    if (countEl) countEl.textContent = `(${_.batchCollectedLinks.length} 个链接)`;
    const content = document.getElementById('qlp-compare-content');
    if (content) {
      content.innerHTML = _.renderBatchCompareCards();
    }
    panel.classList.add('qlp-visible');
    _.bindCompareCardEvents();
  };

  _.hideBatchCompareView = function hideBatchCompareView() {
    if (_.batchComparePanel) {
      _.batchComparePanel.classList.remove('qlp-visible');
    }
  };

  _.exportBatchResults = function exportBatchResults() {
    const data = _.batchCollectedLinks.map(link => ({
      title: link.title,
      url: link.url,
      type: link.type,
      securityLevel: link.security?.level || 'unknown',
      securityScore: link.security?.score || 0,
      risks: link.security?.risks?.map(r => r.message) || [],
      domain: _.getHostname(link.url)
    }));
    
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `link-preview-batch-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
})();
