(function () {
  'use strict';

  if (window.top !== window.self) {
    return;
  }

  window.QLP = window.QLP || {};
  const _ = QLP;

  _.checkFavoriteStatus = function checkFavoriteStatus(url) {
    if (!chrome?.runtime) {
      _.isFavoriteCurrent = false;
      _.updateFavoriteButtonState();
      return;
    }
    chrome.runtime.sendMessage({ action: 'isFavorite', url: url }, (response) => {
      if (response && response.success) {
        _.isFavoriteCurrent = response.isFavorite;
        _.updateFavoriteButtonState();
      }
    });
  };

  _.updateFavoriteButtonState = function updateFavoriteButtonState() {
    if (!_.previewPanel) return;
    const btn = _.previewPanel.querySelector('#qlp-favorite-btn');
    const icon = btn?.querySelector('.qlp-favorite-icon');
    if (btn && icon) {
      if (_.isFavoriteCurrent) {
        btn.classList.add('qlp-favorited');
        icon.style.fill = '#ff6b6b';
      } else {
        btn.classList.remove('qlp-favorited');
        icon.style.fill = 'currentColor';
      }
    }
  };

  _.toggleFavoriteCurrent = function toggleFavoriteCurrent() {
    if (!_.currentLink || !chrome?.runtime) return;
    if (_.isFavoriteCurrent) {
      if (!confirm('确定要取消收藏这个链接吗？')) return;
      chrome.runtime.sendMessage({ action: 'getFavorites' }, (response) => {
        if (response && response.success && response.favorites) {
          const fav = response.favorites.find(f => f.url === _.currentLink);
          if (fav) {
            chrome.runtime.sendMessage({ action: 'deleteFavorite', favoriteId: fav.id }, (resp) => {
              if (resp && resp.success) {
                _.isFavoriteCurrent = false;
                _.updateFavoriteButtonState();
                _.showToast('已取消收藏');
              }
            });
          }
        }
      });
    } else {
      const previewContent = document.querySelector('#qlp-preview-content');
      let description = '';
      let image = '';
      let pageText = '';

      if (previewContent) {
        const descEl = previewContent.querySelector('.qlp-webpage-desc, .qlp-video-desc, .qlp-page-desc, .qlp-webpage-description');
        if (descEl) {
          description = descEl.textContent?.trim() || '';
        }
        const imgEl = previewContent.querySelector('img');
        if (imgEl && imgEl.src && imgEl.src.startsWith('http')) {
          image = imgEl.src;
        }
        pageText = previewContent.textContent?.trim().slice(0, 2000) || '';
      }

      const item = {
        url: _.currentLink,
        title: _.currentLinkTitle || _.currentLinkData?.title || _.currentLink,
        description: description || _.currentLinkData?.description || '',
        image: image || _.currentLinkData?.image || '',
        favicon: _.currentLinkData?.favicon || '',
        type: _.currentLinkData?.type || 'webpage',
        siteName: _.currentLinkData?.siteName || '',
        categoryId: 'default',
        notes: '',
        security: _.currentLinkData?.security || null,
        pageText: pageText,
        offlineAvailable: true,
        cachedAt: Date.now()
      };

      try {
        const snapshot = _.generateFavoriteSnapshot(_.currentLink, item);
        if (snapshot) {
          item.snapshot = snapshot;
        }
      } catch (e) {
        console.debug('Snapshot generation skipped:', e);
      }

      chrome.runtime.sendMessage({ action: 'addFavorite', item: item }, (response) => {
        if (response && response.success) {
          _.isFavoriteCurrent = true;
          _.updateFavoriteButtonState();
          _.showToast('已收藏（支持离线查看）');
        } else if (response && response.error === 'duplicate') {
          _.isFavoriteCurrent = true;
          _.updateFavoriteButtonState();
          _.showToast('已收藏');
        }
      });
    }
  };

  _.generateFavoriteSnapshot = function generateFavoriteSnapshot(url, data) {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillRect(20, 20, canvas.width - 40, canvas.height - 40);

    ctx.fillStyle = '#333';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const title = data.title || url;
    const maxTitleWidth = canvas.width - 80;
    let displayTitle = title;
    if (ctx.measureText(title).width > maxTitleWidth) {
      let truncated = title;
      while (ctx.measureText(truncated + '...').width > maxTitleWidth && truncated.length > 0) {
        truncated = truncated.slice(0, -1);
      }
      displayTitle = truncated + '...';
    }
    ctx.fillText(displayTitle, 40, 45);

    ctx.fillStyle = '#666';
    ctx.font = '12px sans-serif';
    const maxUrlWidth = canvas.width - 80;
    let displayUrl = url;
    if (ctx.measureText(url).width > maxUrlWidth) {
      let truncated = url;
      while (ctx.measureText(truncated + '...').width > maxUrlWidth && truncated.length > 0) {
        truncated = truncated.slice(0, -1);
      }
      displayUrl = truncated + '...';
    }
    ctx.fillText(displayUrl, 40, 75);

    ctx.fillStyle = '#888';
    ctx.font = '13px sans-serif';
    const desc = data.description || '暂无描述';
    const words = desc.split('');
    let line = '';
    let y = 110;
    const maxWidth = canvas.width - 80;
    const lineHeight = 20;
    const maxLines = 5;
    let lineCount = 0;

    for (const char of words) {
      const testLine = line + char;
      if (ctx.measureText(testLine).width <= maxWidth) {
        line = testLine;
      } else {
        if (lineCount < maxLines) {
          ctx.fillText(line, 40, y);
          y += lineHeight;
          lineCount++;
          line = char;
        } else {
          break;
        }
      }
    }
    if (line && lineCount < maxLines) {
      ctx.fillText(line, 40, y);
    }

    ctx.fillStyle = '#667eea';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('离线缓存 · ' + new Date().toLocaleDateString('zh-CN'), 40, canvas.height - 50);

    try {
      return canvas.toDataURL('image/jpeg', 0.85);
    } catch (e) {
      return null;
    }
  };
})();
