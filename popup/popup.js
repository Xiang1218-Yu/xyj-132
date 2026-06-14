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

let currentFilter = 'all';
let currentSearch = '';
let allHistory = [];

function loadSettings() {
  chrome.storage.sync.get(DEFAULT_SETTINGS, (result) => {
    document.querySelector(`input[name="triggerMode"][value="${result.triggerMode}"]`).checked = true;
    
    const hoverDelaySlider = document.getElementById('hoverDelay');
    const hoverDelayValue = document.getElementById('hoverDelayValue');
    hoverDelaySlider.value = result.hoverDelay;
    hoverDelayValue.textContent = result.hoverDelay;
    
    document.getElementById('previewWidth').value = result.previewWidth;
    document.getElementById('previewHeight').value = result.previewHeight;
    
    document.getElementById('enableImagePreview').checked = result.enableImagePreview;
    document.getElementById('enableVideoPreview').checked = result.enableVideoPreview;
    document.getElementById('enableAudioPreview').checked = result.enableAudioPreview;
    document.getElementById('enableWebpagePreview').checked = result.enableWebpagePreview;
    
    document.getElementById('blacklist').value = result.blacklist.join('\n');
    
    updateHoverDelaySection(result.triggerMode);
  });
}

function saveSettings() {
  const triggerMode = document.querySelector('input[name="triggerMode"]:checked').value;
  const hoverDelay = parseInt(document.getElementById('hoverDelay').value, 10);
  const previewWidth = parseInt(document.getElementById('previewWidth').value, 10);
  const previewHeight = parseInt(document.getElementById('previewHeight').value, 10);
  
  const blacklistText = document.getElementById('blacklist').value;
  const blacklist = blacklistText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
  
  const settings = {
    triggerMode: triggerMode,
    hoverDelay: hoverDelay,
    previewWidth: previewWidth,
    previewHeight: previewHeight,
    enableImagePreview: document.getElementById('enableImagePreview').checked,
    enableVideoPreview: document.getElementById('enableVideoPreview').checked,
    enableAudioPreview: document.getElementById('enableAudioPreview').checked,
    enableWebpagePreview: document.getElementById('enableWebpagePreview').checked,
    blacklist: blacklist
  };
  
  chrome.storage.sync.set(settings, () => {
    showToast('设置已保存');
  });
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2000);
}

function updateHoverDelaySection(triggerMode) {
  const section = document.getElementById('hover-delay-section');
  section.style.display = triggerMode === 'hover' ? 'block' : 'none';
}

function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  document.getElementById('tab-settings').style.display = tabName === 'settings' ? '' : 'none';
  document.getElementById('tab-history').style.display = tabName === 'history' ? '' : 'none';

  if (tabName === 'history') {
    loadHistory();
  }
}

function getTypeLabel(type) {
  const labels = {
    'webpage': '网页',
    'video': '视频',
    'video-site': '视频',
    'audio': '音频',
    'audio-site': '音频',
    'image': '图片',
    'unknown': '其他'
  };
  return labels[type] || '网页';
}

function getTypeClass(type) {
  if (type === 'video' || type === 'video-site') return 'type-video';
  if (type === 'audio' || type === 'audio-site') return 'type-audio';
  if (type === 'image') return 'type-image';
  return '';
}

function matchesFilterType(type, filter) {
  if (filter === 'all') return true;
  if (filter === 'video') return type === 'video' || type === 'video-site';
  if (filter === 'audio') return type === 'audio' || type === 'audio-site';
  if (filter === 'image') return type === 'image';
  if (filter === 'webpage') return type === 'webpage' || type === 'unknown';
  return true;
}

function formatTime(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days < 7) return `${days} 天前`;

  const date = new Date(timestamp);
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${m}-${d} ${h}:${min}`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderHistoryList(items) {
  const listEl = document.getElementById('historyList');
  const countEl = document.getElementById('historyCount');

  countEl.textContent = `${items.length} 条记录`;

  if (items.length === 0) {
    listEl.innerHTML = `
      <div class="history-empty">
        <svg viewBox="0 0 24 24" width="40" height="40" fill="currentColor"><path d="M13 3a9 9 0 00-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0013 21a9 9 0 000-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg>
        <p>${currentSearch || currentFilter !== 'all' ? '没有匹配的记录' : '暂无预览历史'}</p>
      </div>
    `;
    return;
  }

  const html = items.map(item => {
    const title = escapeHtml(item.title || item.url);
    const url = escapeHtml(item.url);
    const favicon = item.favicon ? escapeHtml(item.favicon) : '';
    const typeLabel = getTypeLabel(item.type);
    const typeClass = getTypeClass(item.type);
    const time = formatTime(item.timestamp);

    return `
      <div class="history-item" data-url="${url}">
        ${favicon ? `<img class="history-item-icon" src="${favicon}" alt="" onerror="this.style.display='none'">` : `<div class="history-item-icon" style="background:#e5e7eb;border-radius:4px;"></div>`}
        <div class="history-item-info">
          <div class="history-item-title" title="${title}">${title}</div>
          <div class="history-item-url" title="${url}">${url}</div>
          <div class="history-item-meta">
            <span class="history-item-type ${typeClass}">${typeLabel}</span>
            <span class="history-item-time">${time}</span>
          </div>
        </div>
        <div class="history-item-actions">
          <button class="history-action-btn preview-btn" data-url="${url}" title="重新预览">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5-7l-3 3.72L9 13l-3 4h12l-4-5z"/></svg>
          </button>
          <button class="history-action-btn delete-btn" data-url="${url}" title="删除记录">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
          </button>
        </div>
      </div>
    `;
  }).join('');

  listEl.innerHTML = html;

  listEl.querySelectorAll('.preview-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const url = btn.dataset.url;
      rePreview(url);
    });
  });

  listEl.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const url = btn.dataset.url;
      deleteHistoryItem(url);
    });
  });

  listEl.querySelectorAll('.history-item').forEach(item => {
    item.addEventListener('click', () => {
      const url = item.dataset.url;
      rePreview(url);
    });
  });
}

function loadHistory() {
  chrome.runtime.sendMessage({ action: 'getPreviewHistory' }, (response) => {
    if (chrome.runtime.lastError) {
      allHistory = [];
    } else if (response && response.success) {
      allHistory = response.data || [];
    } else {
      allHistory = [];
    }
    filterAndRender();
  });
}

function filterAndRender() {
  let filtered = allHistory;

  if (currentFilter !== 'all') {
    filtered = filtered.filter(item => matchesFilterType(item.type, currentFilter));
  }

  if (currentSearch) {
    const q = currentSearch.toLowerCase();
    filtered = filtered.filter(item => {
      return (item.title || '').toLowerCase().includes(q) ||
             (item.url || '').toLowerCase().includes(q) ||
             (item.siteName || '').toLowerCase().includes(q);
    });
  }

  renderHistoryList(filtered);
}

function rePreview(url) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'rePreview',
        url: url
      });
      window.close();
    }
  });
}

function deleteHistoryItem(url) {
  chrome.runtime.sendMessage({ action: 'deletePreviewHistoryItem', url: url }, (response) => {
    if (response && response.success) {
      allHistory = response.data || [];
      filterAndRender();
    }
  });
}

function clearAllHistory() {
  chrome.runtime.sendMessage({ action: 'clearPreviewHistory' }, (response) => {
    if (response && response.success) {
      allHistory = [];
      filterAndRender();
      showToast('历史记录已清空');
    }
  });
}

function init() {
  loadSettings();
  
  document.querySelectorAll('input[name="triggerMode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      updateHoverDelaySection(e.target.value);
    });
  });
  
  document.getElementById('hoverDelay').addEventListener('input', (e) => {
    document.getElementById('hoverDelayValue').textContent = e.target.value;
  });
  
  document.getElementById('saveBtn').addEventListener('click', saveSettings);

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
    });
  });

  const searchInput = document.getElementById('historySearch');
  const searchClear = document.getElementById('searchClear');

  searchInput.addEventListener('input', () => {
    currentSearch = searchInput.value.trim();
    searchClear.style.display = currentSearch ? '' : 'none';
    filterAndRender();
  });

  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    currentSearch = '';
    searchClear.style.display = 'none';
    filterAndRender();
  });

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      filterAndRender();
    });
  });

  document.getElementById('clearHistoryBtn').addEventListener('click', () => {
    if (allHistory.length === 0) return;
    if (confirm('确定要清空所有预览历史记录吗？')) {
      clearAllHistory();
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
