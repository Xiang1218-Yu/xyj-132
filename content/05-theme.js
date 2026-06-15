(function () {
  'use strict';

  if (window.top !== window.self) {
    return;
  }

  window.QLP = window.QLP || {};
  const _ = QLP;

  _.applyThemeToPanel = function applyThemeToPanel(panel) {
    if (!panel || !_.settings.theme) return;

    const theme = _.settings.theme;

    panel.style.borderRadius = theme.borderRadius;
    panel.style.fontSize = theme.fontSize;

    const preset = _.THEME_PRESETS[theme.preset] || _.THEME_PRESETS.default;
    const isDark = theme.mode === 'dark' || (theme.mode === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const header = panel.querySelector('.qlp-preview-header');

    if (header) {
      header.style.background = `linear-gradient(135deg, ${theme.primaryColor} 0%, ${theme.secondaryColor} 100%)`;
    }

    if (theme.smartContrast) {
      const bgColor = isDark ? preset.darkBg : preset.lightBg;
      const contrastResult = _.getSmartContrastColors(theme.primaryColor, theme.secondaryColor, bgColor);

      if (header) {
        header.style.background = `linear-gradient(135deg, ${contrastResult.adjustedPrimary} 0%, ${contrastResult.adjustedSecondary} 100%)`;
        header.style.color = contrastResult.textColor;

        const actionBtns = header.querySelectorAll('.qlp-action-btn');
        actionBtns.forEach(btn => {
          btn.style.color = contrastResult.textColor;
          btn.style.background = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.18)';
        });

        const titleEl = header.querySelector('.qlp-preview-title');
        if (titleEl) titleEl.style.color = contrastResult.textColor;
      }

      panel.style.setProperty('--qlp-primary-color', contrastResult.adjustedPrimary);
      panel.style.setProperty('--qlp-secondary-color', contrastResult.adjustedSecondary);
    }

    if (isDark) {
      panel.classList.add('qlp-dark-theme');
      if (preset.darkBg && preset.darkBg !== '#1f2937') {
        panel.style.background = preset.darkBg;
      }
    } else {
      panel.classList.remove('qlp-dark-theme');
      if (preset.lightBg && preset.lightBg !== '#ffffff') {
        panel.style.background = preset.lightBg;
      }
    }
  };

  _.applyThemeToRoot = function applyThemeToRoot() {
    if (!_.settings.theme) return;
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
  };

  _.applyComponentVisibility = function applyComponentVisibility(panel) {
    if (!panel || !_.settings.theme || !_.settings.theme.componentVisibility) return;

    const visibility = _.settings.theme.componentVisibility;

    const header = panel.querySelector('.qlp-preview-header');
    const footer = panel.querySelector('.qlp-preview-footer');

    if (header) {
      header.style.display = visibility['header'] === false ? 'none' : '';
    }
    if (footer) {
      footer.style.display = visibility['footer'] === false ? 'none' : '';
    }
  };

  _.renderContentWithOrder = function renderContentWithOrder(contentHtml, securityBadge) {
    const order = _.settings.theme.componentOrder;
    const visibility = _.settings.theme.componentVisibility || {};
    let result = '';

    for (const component of order) {
      if (visibility[component] === false) continue;

      if (component === 'security' && securityBadge && _.settings.enableSecurityCheck) {
        result += securityBadge;
      } else if (component === 'content') {
        result += contentHtml;
      }
    }

    if (!order.includes('content') || visibility['content'] === false) {
      if (visibility['content'] !== false) {
        result = (securityBadge && _.settings.enableSecurityCheck && visibility['security'] !== false ? securityBadge : '') + contentHtml;
      }
    }

    return result;
  };

})();
