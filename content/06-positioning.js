(function () {
  'use strict';

  if (window.top !== window.self) {
    return;
  }

  window.QLP = window.QLP || {};
  const _ = QLP;

  _.getTriggerPosition = function getTriggerPosition(event) {
    let triggerX, triggerY, triggerRect;

    if (event && event.target && event.target.getBoundingClientRect) {
      triggerRect = event.target.getBoundingClientRect();
      triggerX = triggerRect.left + triggerRect.width / 2;
      triggerY = triggerRect.top + triggerRect.height / 2;
    } else if (event && typeof event.clientX === 'number') {
      triggerX = event.clientX;
      triggerY = event.clientY;
      triggerRect = { left: event.clientX, top: event.clientY, right: event.clientX, bottom: event.clientY, width: 0, height: 0 };
    } else {
      triggerX = window.innerWidth / 2;
      triggerY = window.innerHeight / 2;
      triggerRect = { left: triggerX - 50, top: triggerY - 20, right: triggerX + 50, bottom: triggerY + 20, width: 100, height: 40 };
    }

    return { x: triggerX, y: triggerY, rect: triggerRect };
  };

  _.selectOptimalAnchor = function selectOptimalAnchor(triggerRect, panelWidth, panelHeight) {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 10;
    const offsetX = _.settings.positioning.offsetX;
    const offsetY = _.settings.positioning.offsetY;

    const directions = [
      { name: 'bottom', score: 0, left: 0, top: 0, anchorX: 0, anchorY: 0 },
      { name: 'top', score: 0, left: 0, top: 0, anchorX: 0, anchorY: 0 },
      { name: 'right', score: 0, left: 0, top: 0, anchorX: 0, anchorY: 0 },
      { name: 'left', score: 0, left: 0, top: 0, anchorX: 0, anchorY: 0 }
    ];

    const triggerCenterX = triggerRect.left + triggerRect.width / 2;
    const triggerCenterY = triggerRect.top + triggerRect.height / 2;

    directions.forEach(dir => {
      let left, top, anchorX, anchorY;

      switch (dir.name) {
        case 'bottom':
          left = triggerRect.left + offsetX;
          top = triggerRect.bottom + offsetY;
          anchorX = triggerCenterX;
          anchorY = triggerRect.bottom;
          if (left + panelWidth > viewportWidth - margin) left = viewportWidth - panelWidth - margin;
          if (left < margin) left = margin;
          if (top + panelHeight > viewportHeight - margin) dir.score -= 50;
          dir.score += Math.max(0, viewportHeight - triggerRect.bottom);
          break;
        case 'top':
          left = triggerRect.left + offsetX;
          top = triggerRect.top - panelHeight - offsetY;
          anchorX = triggerCenterX;
          anchorY = triggerRect.top;
          if (left + panelWidth > viewportWidth - margin) left = viewportWidth - panelWidth - margin;
          if (left < margin) left = margin;
          if (top < margin) dir.score -= 50;
          dir.score += Math.max(0, triggerRect.top);
          break;
        case 'right':
          left = triggerRect.right + offsetX;
          top = triggerRect.top;
          anchorX = triggerRect.right;
          anchorY = triggerCenterY;
          if (left + panelWidth > viewportWidth - margin) dir.score -= 50;
          if (top + panelHeight > viewportHeight - margin) top = viewportHeight - panelHeight - margin;
          if (top < margin) top = margin;
          dir.score += Math.max(0, viewportWidth - triggerRect.right);
          break;
        case 'left':
          left = triggerRect.left - panelWidth - offsetX;
          top = triggerRect.top;
          anchorX = triggerRect.left;
          anchorY = triggerCenterY;
          if (left < margin) dir.score -= 50;
          if (top + panelHeight > viewportHeight - margin) top = viewportHeight - panelHeight - margin;
          if (top < margin) top = margin;
          dir.score += Math.max(0, triggerRect.left);
          break;
      }

      dir.left = left;
      dir.top = top;
      dir.anchorX = anchorX;
      dir.anchorY = anchorY;

      if (dir.name === 'bottom' || dir.name === 'top') {
        dir.score += 20;
      }
    });

    directions.sort((a, b) => b.score - a.score);

    return {
      direction: directions[0].name,
      left: directions[0].left,
      top: directions[0].top,
      anchorX: directions[0].anchorX,
      anchorY: directions[0].anchorY
    };
  };

  _.calculateAnchorPosition = function calculateAnchorPosition(anchorDirection, triggerRect, panelWidth, panelHeight) {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 10;
    const offsetX = _.settings.positioning.offsetX;
    const offsetY = _.settings.positioning.offsetY;

    const triggerCenterX = triggerRect.left + triggerRect.width / 2;
    const triggerCenterY = triggerRect.top + triggerRect.height / 2;

    let left, top, anchorX, anchorY;

    switch (anchorDirection) {
      case 'top':
        left = triggerCenterX - panelWidth / 2;
        top = triggerRect.top - panelHeight - offsetY;
        anchorX = triggerCenterX;
        anchorY = triggerRect.top;
        if (left < margin) left = margin;
        if (left + panelWidth > viewportWidth - margin) left = viewportWidth - panelWidth - margin;
        if (top < margin) {
          top = triggerRect.bottom + offsetY;
          anchorDirection = 'bottom';
        }
        break;
      case 'bottom':
        left = triggerCenterX - panelWidth / 2;
        top = triggerRect.bottom + offsetY;
        anchorX = triggerCenterX;
        anchorY = triggerRect.bottom;
        if (left < margin) left = margin;
        if (left + panelWidth > viewportWidth - margin) left = viewportWidth - panelWidth - margin;
        if (top + panelHeight > viewportHeight - margin) {
          top = triggerRect.top - panelHeight - offsetY;
          anchorDirection = 'top';
        }
        break;
      case 'left':
        left = triggerRect.left - panelWidth - offsetX;
        top = triggerCenterY - panelHeight / 2;
        anchorX = triggerRect.left;
        anchorY = triggerCenterY;
        if (top < margin) top = margin;
        if (top + panelHeight > viewportHeight - margin) top = viewportHeight - panelHeight - margin;
        if (left < margin) {
          left = triggerRect.right + offsetX;
          anchorDirection = 'right';
        }
        break;
      case 'right':
        left = triggerRect.right + offsetX;
        top = triggerCenterY - panelHeight / 2;
        anchorX = triggerRect.right;
        anchorY = triggerCenterY;
        if (top < margin) top = margin;
        if (top + panelHeight > viewportHeight - margin) top = viewportHeight - panelHeight - margin;
        if (left + panelWidth > viewportWidth - margin) {
          left = triggerRect.left - panelWidth - offsetX;
          anchorDirection = 'left';
        }
        break;
      default:
        return _.selectOptimalAnchor(triggerRect, panelWidth, panelHeight);
    }

    return { direction: anchorDirection, left, top, anchorX, anchorY };
  };

  _.calculateFixedPosition = function calculateFixedPosition(panelWidth, panelHeight) {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 10;
    const fixed = _.settings.positioning.fixedPosition || {};

    let left;
    let top;

    if (fixed.left !== null && fixed.left !== undefined) {
      left = fixed.left;
    } else if (fixed.right !== null && fixed.right !== undefined) {
      left = viewportWidth - panelWidth - fixed.right;
    } else {
      left = (viewportWidth - panelWidth) / 2;
    }

    if (fixed.top !== null && fixed.top !== undefined) {
      top = fixed.top;
    } else if (fixed.bottom !== null && fixed.bottom !== undefined) {
      top = viewportHeight - panelHeight - fixed.bottom;
    } else {
      top = (viewportHeight - panelHeight) / 2;
    }

    if (left + panelWidth > viewportWidth - margin) left = viewportWidth - panelWidth - margin;
    if (left < margin) left = margin;
    if (top + panelHeight > viewportHeight - margin) top = viewportHeight - panelHeight - margin;
    if (top < margin) top = margin;

    return { left, top, direction: 'fixed' };
  };

  _.calculateMouseFollowPosition = function calculateMouseFollowPosition(event, panelWidth, panelHeight, triggerRect) {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 10;
    const offsetX = _.settings.positioning.offsetX;
    const offsetY = _.settings.positioning.offsetY;

    const mouseX = event ? event.clientX : _.currentMousePos.x;
    const mouseY = event ? event.clientY : _.currentMousePos.y;

    let left = mouseX + offsetX;
    let top = mouseY + offsetY;
    let anchorX = mouseX;
    let anchorY = mouseY;
    let direction = 'bottom-right';

    if (left + panelWidth > viewportWidth - margin) {
      left = mouseX - panelWidth - offsetX;
      direction = 'bottom-left';
    }
    if (top + panelHeight > viewportHeight - margin) {
      top = mouseY - panelHeight - offsetY;
      direction = direction.includes('left') ? 'top-left' : 'top-right';
    }
    if (left < margin) left = margin;
    if (top < margin) top = margin;

    return { left, top, anchorX, anchorY, direction };
  };

  _.updateAnchorIndicator = function updateAnchorIndicator(panel, anchorX, anchorY, direction) {
    if (!_.settings.positioning.showAnchorIndicator) return;

    let indicator = panel.querySelector('.qlp-anchor-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.className = 'qlp-anchor-indicator';
      panel.appendChild(indicator);
    }

    const panelRect = panel.getBoundingClientRect();
    const relativeX = anchorX - panelRect.left;
    const relativeY = anchorY - panelRect.top;

    indicator.style.setProperty('--anchor-x', relativeX + 'px');
    indicator.style.setProperty('--anchor-y', relativeY + 'px');
    indicator.setAttribute('data-direction', direction);
  };

  _.startMouseFollowAnimation = function startMouseFollowAnimation(panel) {
    if (_.mouseFollowRAFId) {
      cancelAnimationFrame(_.mouseFollowRAFId);
    }

    function animate() {
      if (!_.previewPanel || !_.previewPanel.classList.contains('qlp-visible')) {
        _.mouseFollowRAFId = null;
        return;
      }

      const smoothing = _.settings.positioning.mouseFollowSensitivity;
      _.currentPanelPos.left += (_.targetPanelPos.left - _.currentPanelPos.left) * smoothing;
      _.currentPanelPos.top += (_.targetPanelPos.top - _.currentPanelPos.top) * smoothing;

      const dx = Math.abs(_.targetPanelPos.left - _.currentPanelPos.left);
      const dy = Math.abs(_.targetPanelPos.top - _.currentPanelPos.top);

      if (dx > 0.5 || dy > 0.5) {
        panel.style.left = _.currentPanelPos.left + 'px';
        panel.style.top = _.currentPanelPos.top + 'px';
        _.mouseFollowRAFId = requestAnimationFrame(animate);
      } else {
        panel.style.left = _.targetPanelPos.left + 'px';
        panel.style.top = _.targetPanelPos.top + 'px';
        _.mouseFollowRAFId = null;
      }
    }

    _.mouseFollowRAFId = requestAnimationFrame(animate);
  };

  _.positionPreviewPanel = function positionPreviewPanel(event, panel, width = null, height = null) {
    const panelWidth = width || _.settings.previewWidth;
    const panelHeight = (height || _.settings.previewHeight) + 60;
    const posSettings = _.settings.positioning;
    const trigger = _.getTriggerPosition(event);

    let result;
    const mode = posSettings.mode;

    if (mode === 'fixed') {
      result = _.calculateFixedPosition(panelWidth, panelHeight);
    } else if (mode === 'mouse') {
      result = _.calculateMouseFollowPosition(event, panelWidth, panelHeight, trigger.rect);
    } else if (mode === 'anchor') {
      if (posSettings.anchorPosition !== 'auto') {
        result = _.calculateAnchorPosition(posSettings.anchorPosition, trigger.rect, panelWidth, panelHeight);
      } else if (posSettings.smartAnchor) {
        result = _.selectOptimalAnchor(trigger.rect, panelWidth, panelHeight);
      } else {
        result = _.calculateAnchorPosition('bottom', trigger.rect, panelWidth, panelHeight);
      }
    } else {
      if (posSettings.smartAnchor) {
        result = _.selectOptimalAnchor(trigger.rect, panelWidth, panelHeight);
      } else {
        result = _.calculateAnchorPosition('bottom', trigger.rect, panelWidth, panelHeight);
      }
    }

    _.currentAnchorPoint = {
      x: result.anchorX || trigger.x,
      y: result.anchorY || trigger.y,
      direction: result.direction
    };

    _.targetPanelPos.left = result.left;
    _.targetPanelPos.top = result.top;

    panel.style.width = panelWidth + 'px';

    if (posSettings.smoothTransition && (mode === 'mouse' || posSettings.enableMouseFollow)) {
      _.currentPanelPos.left = parseFloat(panel.style.left) || result.left;
      _.currentPanelPos.top = parseFloat(panel.style.top) || result.top;
      _.startMouseFollowAnimation(panel);
    } else {
      panel.style.left = result.left + 'px';
      panel.style.top = result.top + 'px';
    }

    panel.setAttribute('data-position-mode', mode);
    panel.setAttribute('data-anchor-direction', result.direction);

    if (posSettings.showAnchorIndicator && result.direction !== 'fixed') {
      setTimeout(() => {
        _.updateAnchorIndicator(panel, _.currentAnchorPoint.x, _.currentAnchorPoint.y, result.direction);
      }, 50);
    }
  };

  _.savePositionSettings = function savePositionSettings() {
    chrome.storage.sync.set({
      positioning: _.settings.positioning
    });
  };

  _.getPositionModeLabel = function getPositionModeLabel(mode) {
    const labels = {
      'auto': '智能定位',
      'mouse': '跟随鼠标',
      'anchor': '锚点定位',
      'fixed': '固定位置'
    };
    return labels[mode] || mode;
  };

  _.getAnchorDirectionLabel = function getAnchorDirectionLabel(dir) {
    const labels = {
      'auto': '自动选择',
      'top': '上方',
      'bottom': '下方',
      'left': '左侧',
      'right': '右侧'
    };
    return labels[dir] || dir;
  };

  _.detectCurrentCorner = function detectCurrentCorner(fixed) {
    const hasLeft = fixed.left !== null && fixed.left !== undefined;
    const hasRight = fixed.right !== null && fixed.right !== undefined;
    const hasTop = fixed.top !== null && fixed.top !== undefined;
    const hasBottom = fixed.bottom !== null && fixed.bottom !== undefined;
    if (!hasLeft && !hasRight && !hasTop && !hasBottom) return 'center';
    if (hasLeft && hasTop) return 'top-left';
    if (hasRight && hasTop) return 'top-right';
    if (hasLeft && hasBottom) return 'bottom-left';
    if (hasRight && hasBottom) return 'bottom-right';
    if (hasTop) return 'top-center';
    return null;
  };

  _.applyCornerToFixedPosition = function applyCornerToFixedPosition(corner) {
    const margin = 20;
    const fp = { top: null, right: null, bottom: null, left: null };
    switch (corner) {
      case 'top-left':
        fp.top = margin; fp.left = margin; break;
      case 'top-right':
        fp.top = margin; fp.right = margin; break;
      case 'bottom-left':
        fp.bottom = margin; fp.left = margin; break;
      case 'bottom-right':
        fp.bottom = margin; fp.right = margin; break;
      case 'top-center':
        fp.top = margin; break;
      case 'center':
      default:
        break;
    }
    _.settings.positioning.fixedPosition = fp;
    _.savePositionSettings();
  };

  _.updatePositionDropdownState = function updatePositionDropdownState(panel) {
    const currentMode = _.settings.positioning.mode;
    const currentAnchor = _.settings.positioning.anchorPosition;
    const currentCorner = _.detectCurrentCorner(_.settings.positioning.fixedPosition || {});

    panel.querySelectorAll('.qlp-position-option').forEach(btn => {
      btn.classList.toggle('qlp-active', btn.dataset.mode === currentMode);
    });

    panel.querySelectorAll('.qlp-anchor-dir[data-dir]').forEach(btn => {
      btn.classList.toggle('qlp-active', btn.dataset.dir === currentAnchor);
    });

    panel.querySelectorAll('.qlp-anchor-dir[data-corner]').forEach(btn => {
      btn.classList.toggle('qlp-active', btn.dataset.corner === currentCorner);
    });

    const anchorSection = panel.querySelector('#qlp-anchor-section');
    const fixedSection = panel.querySelector('#qlp-fixed-section');
    if (anchorSection) anchorSection.style.display = currentMode === 'anchor' ? 'block' : 'none';
    if (fixedSection) fixedSection.style.display = currentMode === 'fixed' ? 'block' : 'none';

    const mouseFollowToggle = panel.querySelector('#qlp-toggle-mouse-follow');
    if (mouseFollowToggle) mouseFollowToggle.checked = _.settings.positioning.enableMouseFollow;
    const indicatorToggle = panel.querySelector('#qlp-toggle-anchor-indicator');
    if (indicatorToggle) indicatorToggle.checked = _.settings.positioning.showAnchorIndicator;
    const smoothToggle = panel.querySelector('#qlp-toggle-smooth-transition');
    if (smoothToggle) smoothToggle.checked = _.settings.positioning.smoothTransition;
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

})();
