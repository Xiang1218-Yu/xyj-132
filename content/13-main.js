(function () {
  if (window.top !== window.self) return;

  const _ = window.QLP = window.QLP || {};

  function deepMerge(target, source) {
    const result = { ...target };
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }
  _.deepMerge = deepMerge;

  function loadSettings() {
    if (!chrome?.storage?.sync) {
      _.settings = deepMerge({}, _.DEFAULT_SETTINGS);
      applyThemeToRoot();
      return;
    }
    chrome.storage.sync.get(_.DEFAULT_SETTINGS, (result) => {
      _.settings = deepMerge(_.DEFAULT_SETTINGS, result);
      applyThemeToRoot();
    });
  }
  _.loadSettings = loadSettings;

  function applyThemeToRoot() {
    if (!_.settings || !_.settings.theme) return;
    const theme = _.settings.theme;
    const root = document.documentElement;

    root.style.setProperty('--qlp-primary-color', theme.primaryColor);
    root.style.setProperty('--qlp-secondary-color', theme.secondaryColor);
    root.style.setProperty('--qlp-border-radius', theme.borderRadius);
    root.style.setProperty('--qlp-font-size', theme.fontSize);

    let shadowValue = '0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 20px rgba(0, 0, 0, 0.1)';
    if (theme.shadowIntensity === 'low') {
      shadowValue = '0 8px 24px rgba(0, 0, 0, 0.1), 0 4px 8px rgba(0, 0, 0, 0.06)';
    } else if (theme.shadowIntensity === 'high') {
      shadowValue = '0 30px 80px rgba(0, 0, 0, 0.25), 0 12px 30px rgba(0, 0, 0, 0.15)';
    } else if (theme.shadowIntensity === 'none') {
      shadowValue = 'none';
    }
    root.style.setProperty('--qlp-shadow', shadowValue);
  }
  _.applyThemeToRoot = applyThemeToRoot;

  function init() {
    loadSettings();

    document.addEventListener('mouseover', _.handleLinkHover, true);
    document.addEventListener('mouseout', _.handleLinkLeave, true);
    document.addEventListener('click', _.handleLinkClick, true);
    document.addEventListener('keydown', _.handleKeyDown);
    document.addEventListener('keyup', _.handleKeyUp);
    document.addEventListener('click', _.handleDocClick);
    document.addEventListener('mousemove', _.handleMouseMove, true);
    window.addEventListener('scroll', _.handleScroll, true);

    const observer = new MutationObserver(() => {
      if (_.isBatchModeActive) {
        document.querySelectorAll('a[href]').forEach(link => {
          if (_.isValidUrl(link.href) && !_.isInBlacklist(window.location.href)) {
            if (!link._qlpBatchListener) {
              link.addEventListener('mouseenter', _.handleBatchModeLinkHover);
              link._qlpBatchListener = true;
            }
          }
        });
      }
    });

    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    }

    if (chrome?.storage?.onChanged) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'sync') {
          for (const key in changes) {
            if (changes[key].newValue !== undefined) {
              if (changes[key].newValue && typeof changes[key].newValue === 'object' && !Array.isArray(changes[key].newValue)) {
                _.settings[key] = deepMerge(_.settings[key] || {}, changes[key].newValue);
              } else {
                _.settings[key] = changes[key].newValue;
              }
            }
          }
          applyThemeToRoot();
          const existingPanel = document.getElementById('qlp-preview-panel');
          if (existingPanel) {
            _.applyThemeToPanel(existingPanel);
            _.applyComponentVisibility(existingPanel);
          }
          const batchPanel = document.getElementById('qlp-batch-compare-panel');
          if (batchPanel) {
            const batchHeader = batchPanel.querySelector('.qlp-compare-header');
            if (batchHeader) {
              batchHeader.style.background = `linear-gradient(135deg, ${_.settings.theme.primaryColor} 0%, ${_.settings.theme.secondaryColor} 100%)`;
            }
          }
          document.documentElement.style.setProperty('--qlp-primary-color', _.settings.theme.primaryColor);
          document.documentElement.style.setProperty('--qlp-secondary-color', _.settings.theme.secondaryColor);
        }
      });
    }

    if (chrome?.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'rePreview' && request.url) {
          _.handleRePreview(request.url);
          sendResponse({ success: true });
        }
      });
    }
  }
  _.init = init;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
