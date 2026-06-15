(function () {
  'use strict';

  if (window.top !== window.self) {
    return;
  }

  window.QLP = window.QLP || {};
  const _ = QLP;

  _.shortcutHintPanel = null;

  _.showShortcutHint = function showShortcutHint() {
    if (!_.settings.shortcuts || !_.settings.shortcuts.enabled) return;
    if (!_.previewPanel) return;
    
    if (!_.shortcutHintPanel) {
      _.shortcutHintPanel = document.createElement('div');
      _.shortcutHintPanel.className = 'qlp-shortcut-hint-panel';
      _.shortcutHintPanel.id = 'qlp-shortcut-hint-panel';
      document.body.appendChild(_.shortcutHintPanel);
    }

    const actions = _.settings.shortcuts.actions;
    _.shortcutHintPanel.innerHTML = actions.map(a => 
      `<div class="qlp-shortcut-item">
        <span class="qlp-shortcut-key">${a.key}</span>
        <span class="qlp-shortcut-label">${a.label}</span>
      </div>`
    ).join('');

    _.applyThemeToShortcutPanel();

    const panelRect = _.previewPanel.getBoundingClientRect();
    let left = panelRect.left;
    let top = panelRect.bottom + 5;
    if (top + 60 > window.innerHeight - 10) {
      top = panelRect.top - 60;
    }
    _.shortcutHintPanel.style.left = left + 'px';
    _.shortcutHintPanel.style.top = top + 'px';

    _.shortcutHintPanel.classList.add('qlp-visible');
  };

  _.applyThemeToShortcutPanel = function applyThemeToShortcutPanel() {
    if (!_.shortcutHintPanel || !_.settings.theme) return;
    const theme = _.settings.theme;
    const isDark = theme.mode === 'dark' || 
      (theme.mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      _.shortcutHintPanel.style.background = 'rgba(26, 26, 46, 0.95)';
      _.shortcutHintPanel.style.color = '#fff';
    } else {
      _.shortcutHintPanel.style.background = 'rgba(255, 255, 255, 0.95)';
      _.shortcutHintPanel.style.color = '#333';
    }
    _.shortcutHintPanel.style.borderRadius = theme.borderRadius;
    _.shortcutHintPanel.style.boxShadow = 'var(--qlp-shadow)';
  };

  _.hideShortcutHint = function hideShortcutHint() {
    if (_.shortcutHintPanel) {
      _.shortcutHintPanel.classList.remove('qlp-visible');
    }
  };

  _.executeShortcutAction = function executeShortcutAction(action) {
    if (!_.currentLink) return;
    switch (action) {
      case 'copy':
        _.copyCurrentLink();
        break;
      case 'favorite':
        _.toggleFavoriteCurrent();
        break;
      case 'openNewTab':
        window.open(_.currentLink, '_blank');
        break;
      case 'qrcode':
        _.toggleQrcodePanel();
        break;
      case 'share':
        if (navigator.share) {
          navigator.share({
            title: _.currentLinkTitle || _.currentLink,
            url: _.currentLink
          }).catch(() => {});
        } else {
          _.copyCurrentLink();
        }
        break;
    }
  };

  _.copyCurrentLink = function copyCurrentLink() {
    if (!_.currentLink) return;
    navigator.clipboard.writeText(_.currentLink).then(() => {
      _.showToast('链接已复制');
    }).catch(() => {
      const textarea = document.createElement('textarea');
      textarea.value = _.currentLink;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        _.showToast('链接已复制');
      } catch (e) {
        _.showToast('复制失败');
      }
      document.body.removeChild(textarea);
    });
  };

  _.handleRePreview = function handleRePreview(url) {
    if (!url || !_.isValidUrl(url)) return;
    const fakeLink = { href: url, textContent: '', title: '' };
    const fakeEvent = { clientX: window.innerWidth / 2, clientY: 100, target: { getBoundingClientRect: () => ({ left: window.innerWidth / 2, top: 50, bottom: 70 }) } };
    _.showPreview(fakeLink, fakeEvent);
  };
})();
