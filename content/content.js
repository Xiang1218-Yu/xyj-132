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
    blacklist: [],
    enableSecurityCheck: true,
    securityRules: {
      checkPhishing: true,
      checkMalicious: true,
      checkSuspicious: true,
      checkRedirect: true
    },
    positioning: {
      mode: 'auto',
      anchorPosition: 'auto',
      offsetX: 15,
      offsetY: 10,
      enableMouseFollow: false,
      mouseFollowSensitivity: 0.3,
      smartAnchor: true,
      fixedPosition: {
        top: 20,
        right: 20,
        bottom: null,
        left: null
      },
      showAnchorIndicator: true,
      smoothTransition: true
    },
    batchMode: {
      enabled: true,
      hotkey: 'Shift',
      enableFloatingMarker: true,
      autoShowCompare: true
    },
    theme: {
      mode: 'system',
      primaryColor: '#667eea',
      secondaryColor: '#764ba2',
      borderRadius: '12px',
      shadowIntensity: 'medium',
      fontSize: '14px',
      componentOrder: ['header', 'content', 'footer', 'security'],
      preset: 'default',
      smartContrast: true
    },
    shortcuts: {
      enabled: true,
      actions: [
        { key: '1', action: 'copy', label: '复制链接' },
        { key: '2', action: 'favorite', label: '收藏链接' },
        { key: '3', action: 'openNewTab', label: '新标签打开' },
        { key: '4', action: 'qrcode', label: '生成二维码' },
        { key: '5', action: 'share', label: '分享' }
      ]
    },
    previewRules: []
  };

  const THEME_PRESETS = {
    default: {
      name: '默认紫蓝',
      primaryColor: '#667eea',
      secondaryColor: '#764ba2',
      lightBg: '#ffffff',
      lightHeader: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      darkBg: '#1f2937',
      darkHeader: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    ocean: {
      name: '深海蓝',
      primaryColor: '#0ea5e9',
      secondaryColor: '#06b6d4',
      lightBg: '#ffffff',
      lightHeader: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)',
      darkBg: '#0c1e2e',
      darkHeader: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)'
    },
    sunset: {
      name: '日落橙',
      primaryColor: '#f97316',
      secondaryColor: '#ef4444',
      lightBg: '#ffffff',
      lightHeader: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)',
      darkBg: '#1c1008',
      darkHeader: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)'
    },
    forest: {
      name: '森林绿',
      primaryColor: '#10b981',
      secondaryColor: '#059669',
      lightBg: '#ffffff',
      lightHeader: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      darkBg: '#0a1f16',
      darkHeader: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
    },
    rose: {
      name: '玫瑰红',
      primaryColor: '#f43f5e',
      secondaryColor: '#e11d48',
      lightBg: '#ffffff',
      lightHeader: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
      darkBg: '#1f0a10',
      darkHeader: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)'
    },
    midnight: {
      name: '午夜深蓝',
      primaryColor: '#6366f1',
      secondaryColor: '#4f46e5',
      lightBg: '#ffffff',
      lightHeader: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
      darkBg: '#0f0e24',
      darkHeader: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'
    }
  };

  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  function getRelativeLuminance(r, g, b) {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  function getContrastRatio(color1, color2) {
    const l1 = getRelativeLuminance(color1.r, color1.g, color1.b);
    const l2 = getRelativeLuminance(color2.r, color2.g, color2.b);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  function getBestTextColor(bgHex) {
    const bg = hexToRgb(bgHex);
    const white = { r: 255, g: 255, b: 255 };
    const black = { r: 0, g: 0, b: 0 };
    const whiteContrast = getContrastRatio(bg, white);
    const blackContrast = getContrastRatio(bg, black);
    return whiteContrast >= blackContrast ? '#ffffff' : '#111827';
  }

  function getSmartContrastColors(primaryHex, secondaryHex, bgColorHex) {
    const bg = hexToRgb(bgColorHex);
    const primary = hexToRgb(primaryHex);
    const primaryLum = getRelativeLuminance(primary.r, primary.g, primary.b);
    const bgLum = getRelativeLuminance(bg.r, bg.g, bg.b);
    const contrastRatio = getContrastRatio(primary, bg);

    let adjustedPrimary = primaryHex;
    let adjustedSecondary = secondaryHex;
    let textColor = getBestTextColor(bgColorHex);

    if (contrastRatio < 3) {
      if (bgLum > 0.5) {
        adjustedPrimary = darkenColor(primaryHex, 0.3);
        adjustedSecondary = darkenColor(secondaryHex, 0.3);
      } else {
        adjustedPrimary = lightenColor(primaryHex, 0.4);
        adjustedSecondary = lightenColor(secondaryHex, 0.4);
      }
      textColor = getBestTextColor(bgColorHex);
    }

    return { adjustedPrimary, adjustedSecondary, textColor, contrastRatio };
  }

  function darkenColor(hex, amount) {
    const rgb = hexToRgb(hex);
    const r = Math.max(0, Math.round(rgb.r * (1 - amount)));
    const g = Math.max(0, Math.round(rgb.g * (1 - amount)));
    const b = Math.max(0, Math.round(rgb.b * (1 - amount)));
    return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
  }

  function lightenColor(hex, amount) {
    const rgb = hexToRgb(hex);
    const r = Math.min(255, Math.round(rgb.r + (255 - rgb.r) * amount));
    const g = Math.min(255, Math.round(rgb.g + (255 - rgb.g) * amount));
    const b = Math.min(255, Math.round(rgb.b + (255 - rgb.b) * amount));
    return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
  }

  let settings = { ...DEFAULT_SETTINGS };
  let hoverTimer = null;
  let hideTimer = null;
  let previewPanel = null;
  let currentLink = null;
  let currentLinkTitle = '';
  let currentLinkData = null;
  let isPanelHovered = false;
  let isBatchModeActive = false;
  let batchCollectedLinks = [];
  let batchComparePanel = null;
  let linkMarkerElements = new Map();
  let qrcodePanel = null;
  let shortcutHintPanel = null;
  let isFavoriteCurrent = false;
  let currentMousePos = { x: 0, y: 0 };
  let currentAnchorPoint = { x: 0, y: 0, direction: 'bottom' };
  let mouseFollowRAFId = null;
  let targetPanelPos = { left: 0, top: 0 };
  let currentPanelPos = { left: 0, top: 0 };
  let lastMouseMoveEvent = null;

  const NO_EMBED_DOMAINS = [
  ];

  const PHISHING_KEYWORDS = [
    'verify', 'confirm', 'update', 'wallet', 'crypto', 'bitcoin', 'ethereum',
    'prize', 'winner', 'free', 'urgent', 'immediate', 'suspended', 'limited',
    'exclusive', 'claim', 'password', 'creditcard', 'banking'
  ];

  const LOGIN_PATH_KEYWORDS = ['login', 'signin', 'account', 'secure'];

  const BRAND_KEYWORDS = [
    'paypal', 'appleid', 'googleid', 'microsoft', 'amazon',
    'facebook', 'instagram', 'twitter'
  ];

  const MALICIOUS_TLDS = [
    '.xyz', '.top', '.club', '.online', '.site', '.website', '.space',
    '.fun', '.tk', '.ml', '.ga', '.cf', '.gq', '.work', '.biz', '.info'
  ];

  const SUSPICIOUS_PATTERNS = [
    /\d{5,}/,
    /-{2,}/,
    /[a-z0-9]{20,}/i,
    /\.(php|asp|aspx|jsp|cgi)\?.*=/i,
    /javascript:/i,
    /data:/i
  ];

  const TRUSTED_DOMAINS = [
    'google.com', 'youtube.com', 'facebook.com', 'twitter.com', 'instagram.com',
    'linkedin.com', 'github.com', 'stackoverflow.com', 'apple.com', 'microsoft.com',
    'amazon.com', 'paypal.com', 'netflix.com', 'spotify.com', 'wikipedia.org',
    'baidu.com', 'zhihu.com', 'bilibili.com', 'taobao.com', 'jd.com',
    'qq.com', 'weibo.com', 'douyin.com', 'kuaishou.com', 'xiaohongshu.com'
  ];

  function evaluateUrlSecurity(url) {
    if (!settings.enableSecurityCheck) {
      return { level: 'unknown', score: 0, risks: [] };
    }

    const risks = [];
    let score = 100;
    const deducted = new Set();

    const categoryMaxDeduction = {
      phishing: 50,
      malicious: 25,
      suspicious: 20,
      redirect: 15
    };
    const categoryDeduction = {
      phishing: 0,
      malicious: 0,
      suspicious: 0,
      redirect: 0
    };

    function deductPoints(category, points, risk) {
      if (categoryDeduction[category] >= categoryMaxDeduction[category]) {
        return false;
      }
      const actualDeduction = Math.min(
        points,
        categoryMaxDeduction[category] - categoryDeduction[category]
      );
      categoryDeduction[category] += actualDeduction;
      risks.push(risk);
      score -= actualDeduction;
      return true;
    }

    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      const pathname = urlObj.pathname.toLowerCase();
      const search = urlObj.search.toLowerCase();

      if (settings.securityRules.checkPhishing) {
        for (const keyword of PHISHING_KEYWORDS) {
          const key = 'phishing-kw-' + keyword;
          if (deducted.has(key)) continue;
          if (pathname.includes(keyword) && !isTrustedDomain(hostname)) {
            deductPoints('phishing', 15, {
              type: 'phishing',
              severity: 'high',
              message: `路径包含可疑关键词: ${keyword}`
            });
            deducted.add(key);
          }
        }

        for (const keyword of LOGIN_PATH_KEYWORDS) {
          const key = 'phishing-login-' + keyword;
          if (deducted.has(key)) continue;
          if (pathname.includes(keyword) && !isTrustedDomain(hostname)) {
            deductPoints('phishing', 20, {
              type: 'phishing',
              severity: 'high',
              message: `疑似登录页面 (${keyword})，请核实网站真伪`
            });
            deducted.add(key);
            break;
          }
        }

        for (const brand of BRAND_KEYWORDS) {
          const key = 'phishing-brand-' + brand;
          if (deducted.has(key)) continue;
          const parts = hostname.replace(/^www\./, '').split('.');
          if (parts[0].includes(brand) && !isTrustedDomain(hostname)) {
            deductPoints('phishing', 25, {
              type: 'phishing',
              severity: 'high',
              message: `疑似仿冒品牌: ${brand}`
            });
            deducted.add(key);
            break;
          }
        }
      }

      if (settings.securityRules.checkMalicious) {
        const tldKey = 'malicious-tld';
        if (!deducted.has(tldKey)) {
          for (const tld of MALICIOUS_TLDS) {
            if (hostname.endsWith(tld)) {
              deductPoints('malicious', 15, {
                type: 'malicious',
                severity: 'medium',
                message: `使用可疑顶级域名: ${tld}`
              });
              deducted.add(tldKey);
              break;
            }
          }
        }

        const longDomainKey = 'malicious-longdomain';
        if (!deducted.has(longDomainKey) && hostname.startsWith('www.') && hostname.length > 50) {
          deductPoints('malicious', 10, {
            type: 'malicious',
            severity: 'medium',
            message: '域名过长，可能是伪装的恶意网站'
          });
          deducted.add(longDomainKey);
        }
      }

      if (settings.securityRules.checkSuspicious) {
        const suspiciousKey = 'suspicious-pattern';
        if (!deducted.has(suspiciousKey)) {
          for (const pattern of SUSPICIOUS_PATTERNS) {
            if (pattern.test(url)) {
              deductPoints('suspicious', 5, {
                type: 'suspicious',
                severity: 'low',
                message: 'URL 包含可疑模式'
              });
              deducted.add(suspiciousKey);
              break;
            }
          }
        }

        const httpKey = 'suspicious-http';
        if (!deducted.has(httpKey) && urlObj.protocol === 'http:') {
          deductPoints('suspicious', 10, {
            type: 'suspicious',
            severity: 'low',
            message: '非 HTTPS 连接，数据传输不安全'
          });
          deducted.add(httpKey);
        }

        const longQueryKey = 'suspicious-longquery';
        if (!deducted.has(longQueryKey) && search.length > 200) {
          deductPoints('suspicious', 5, {
            type: 'suspicious',
            severity: 'low',
            message: 'URL 参数过长'
          });
          deducted.add(longQueryKey);
        }
      }

      if (settings.securityRules.checkRedirect) {
        const redirectKey = 'redirect-param';
        if (!deducted.has(redirectKey) && /redirect|url=|link=|href=|go=/i.test(search)) {
          deductPoints('redirect', 15, {
            type: 'redirect',
            severity: 'medium',
            message: '包含跳转参数，可能跳转到外部网站'
          });
          deducted.add(redirectKey);
        }
      }

      if (isTrustedDomain(hostname)) {
        score = Math.min(100, score + 20);
        risks = risks.filter(r => r.type === 'redirect');
      }

      let level = 'unknown';
      if (score >= 80) level = 'safe';
      else if (score >= 60) level = 'low';
      else if (score >= 40) level = 'medium';
      else level = 'high';

      score = Math.max(0, Math.min(100, score));

      return { level, score, risks, hostname, categoryDeduction, categoryMaxDeduction };
    } catch (e) {
      return { level: 'unknown', score: 0, risks: [{ type: 'error', severity: 'low', message: '无法解析 URL' }] };
    }
  }

  function isTrustedDomain(hostname) {
    return TRUSTED_DOMAINS.some(domain => 
      hostname === domain || hostname.endsWith('.' + domain)
    );
  }

  function getSecurityLevelInfo(level) {
    const levels = {
      safe: {
        label: '安全',
        color: '#10b981',
        bgColor: '#d1fae5',
        borderColor: '#6ee7b7',
        icon: '✓'
      },
      low: {
        label: '低风险',
        color: '#f59e0b',
        bgColor: '#fef3c7',
        borderColor: '#fde68a',
        icon: '⚠'
      },
      medium: {
        label: '中风险',
        color: '#f97316',
        bgColor: '#ffedd5',
        borderColor: '#fdba74',
        icon: '⚡'
      },
      high: {
        label: '高风险',
        color: '#ef4444',
        bgColor: '#fee2e2',
        borderColor: '#fca5a5',
        icon: '✕'
      },
      unknown: {
        label: '未知',
        color: '#6b7280',
        bgColor: '#f3f4f6',
        borderColor: '#d1d5db',
        icon: '?'
      }
    };
    return levels[level] || levels.unknown;
  }

  function createSecurityBadge(securityInfo) {
    if (!settings.enableSecurityCheck) return '';
    
    const levelInfo = getSecurityLevelInfo(securityInfo.level);
    const risksHtml = securityInfo.risks && securityInfo.risks.length > 0 
      ? securityInfo.risks.map(r => `<div class="qlp-security-risk qlp-risk-${r.severity}">${escapeHtml(r.message)}</div>`).join('')
      : '<div class="qlp-security-risk-none">未检测到风险</div>';

    return `
      <div class="qlp-security-badge" style="border-color: ${levelInfo.borderColor}; background: ${levelInfo.bgColor};">
        <div class="qlp-security-header" style="color: ${levelInfo.color};">
          <span class="qlp-security-icon">${levelInfo.icon}</span>
          <span class="qlp-security-level">${levelInfo.label}</span>
          <span class="qlp-security-score">${securityInfo.score} 分</span>
        </div>
        ${securityInfo.risks && securityInfo.risks.length > 0 ? `
          <div class="qlp-security-risks">
            ${risksHtml}
          </div>
        ` : ''}
      </div>
    `;
  }

  function canEmbedUrl(url) {
    return true;
  }

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
      if (!url || typeof url !== 'string') return 'unknown';

      const trimmedUrl = url.trim();
      if (!trimmedUrl) return 'unknown';

      if (trimmedUrl.startsWith('data:')) {
        const dataType = trimmedUrl.slice(5).split(';')[0].toLowerCase();
        if (dataType.startsWith('image/')) return 'image';
        if (dataType.startsWith('video/')) return 'video';
        if (dataType.startsWith('audio/')) return 'audio';
        return 'webpage';
      }

      if (trimmedUrl.startsWith('blob:')) {
        return 'webpage';
      }

      if (trimmedUrl.startsWith('#') || trimmedUrl.startsWith('javascript:') ||
          trimmedUrl.startsWith('mailto:') || trimmedUrl.startsWith('tel:') ||
          trimmedUrl.startsWith('sms:') || trimmedUrl.startsWith('ftp://') ||
          trimmedUrl.startsWith('file://')) {
        return 'unknown';
      }

      const urlObj = new URL(trimmedUrl, window.location.href);
      const protocol = urlObj.protocol.toLowerCase();

      if (protocol !== 'http:' && protocol !== 'https:') {
        return 'unknown';
      }

      const pathname = urlObj.pathname.toLowerCase();
      const hostname = urlObj.hostname.toLowerCase();

      const imageExts = [
        '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico',
        '.tiff', '.tif', '.avif', '.heic', '.heif', '.raw', '.psd',
        '.jp2', '.j2k', '.jxr', '.hdp', '.wdp'
      ];
      const videoExts = [
        '.mp4', '.webm', '.mov', '.avi', '.mkv', '.flv', '.wmv',
        '.m4v', '.3gp', '.3g2', '.ts', '.mts', '.m2ts', '.vob',
        '.ogv', '.dv', '.rm', '.rmvb', '.asf'
      ];
      const audioExts = [
        '.mp3', '.wav', '.flac', '.aac', '.m4a', '.wma',
        '.opus', '.aiff', '.aif', '.ape', '.alac', '.wv',
        '.oga', '.midi', '.mid', '.amr', '.ac3', '.dts'
      ];

      const extMatch = pathname.match(/\.[a-z0-9]+$/);
      const ext = extMatch ? extMatch[0] : '';

      if (ext) {
        for (const imageExt of imageExts) {
          if (ext === imageExt) return 'image';
        }
        for (const videoExt of videoExts) {
          if (ext === videoExt) return 'video';
        }
        for (const audioExt of audioExts) {
          if (ext === audioExt) return 'audio';
        }

        if (ext === '.ogg' || ext === '.ogx') {
          if (pathname.includes('video') || pathname.includes('movie') || pathname.includes('film')) {
            return 'video';
          }
          if (pathname.includes('audio') || pathname.includes('music') || pathname.includes('song')) {
            return 'audio';
          }
          return 'audio';
        }
      }

      const videoSites = [
        { domain: 'youtube.com', exact: false },
        { domain: 'youtu.be', exact: true },
        { domain: 'bilibili.com', exact: false },
        { domain: 'b23.tv', exact: true },
        { domain: 'vimeo.com', exact: false },
        { domain: 'dailymotion.com', exact: false },
        { domain: 'dai.ly', exact: true },
        { domain: 'youku.com', exact: false },
        { domain: 'iqiyi.com', exact: false },
        { domain: 'iq.com', exact: false },
        { domain: 'tudou.com', exact: false },
        { domain: 'mgtv.com', exact: false },
        { domain: 'le.com', exact: false },
        { domain: 'pptv.com', exact: false },
        { domain: 'douyin.com', exact: false },
        { domain: 'iesdouyin.com', exact: false },
        { domain: 'tiktok.com', exact: false },
        { domain: 'twitch.tv', exact: false },
        { domain: 'netflix.com', exact: false },
        { domain: 'hulu.com', exact: false },
        { domain: 'primevideo.com', exact: false },
        { domain: 'disneyplus.com', exact: false },
        { domain: 'kuaishou.com', exact: false },
        { domain: 'jsdelivr.net', exact: false, pathCheck: '/gh/' }
      ];

      for (const site of videoSites) {
        if (site.exact) {
          if (hostname === site.domain || hostname.endsWith('.' + site.domain)) {
            if (site.pathCheck && !pathname.startsWith(site.pathCheck)) continue;
            return 'video-site';
          }
        } else {
          if (hostname === site.domain || hostname.endsWith('.' + site.domain)) {
            if (site.pathCheck && !pathname.startsWith(site.pathCheck)) continue;
            return 'video-site';
          }
        }
      }

      const audioSites = [
        { domain: 'music.163.com', exact: true },
        { domain: 'y.qq.com', exact: true },
        { domain: 'music.qq.com', exact: true },
        { domain: 'kuwo.cn', exact: false },
        { domain: 'kugou.com', exact: false },
        { domain: 'xiami.com', exact: false },
        { domain: 'spotify.com', exact: false },
        { domain: 'open.spotify.com', exact: true },
        { domain: 'soundcloud.com', exact: false },
        { domain: 'music.apple.com', exact: true },
        { domain: 'itunes.apple.com', exact: true },
        { domain: 'pandora.com', exact: false },
        { domain: 'deezer.com', exact: false },
        { domain: 'tidal.com', exact: false },
        { domain: 'bandcamp.com', exact: false },
        { domain: 'mixcloud.com', exact: false },
        { domain: 'music.126.net', exact: true }
      ];

      for (const site of audioSites) {
        if (site.exact) {
          if (hostname === site.domain || hostname.endsWith('.' + site.domain)) {
            return 'audio-site';
          }
        } else {
          if (hostname === site.domain || hostname.endsWith('.' + site.domain)) {
            return 'audio-site';
          }
        }
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

  const TYPE_COMPATIBILITY_RULES = {
    webpage: { supportsEmbed: true, supportsQuickRead: true, supportsSize: true, supportsDisableSecurity: true },
    image: { supportsEmbed: false, supportsQuickRead: false, supportsSize: true, supportsDisableSecurity: true },
    video: { supportsEmbed: false, supportsQuickRead: false, supportsSize: true, supportsDisableSecurity: true },
    'video-site': { supportsEmbed: true, supportsQuickRead: false, supportsSize: true, supportsDisableSecurity: true },
    audio: { supportsEmbed: false, supportsQuickRead: false, supportsSize: true, supportsDisableSecurity: true },
    'audio-site': { supportsEmbed: true, supportsQuickRead: false, supportsSize: true, supportsDisableSecurity: true }
  };

  function normalizeSuffix(raw) {
    if (!raw) return '';
    let s = String(raw).trim();
    if (s && !s.startsWith('.')) s = '.' + s;
    return s;
  }

  function validateRegexPattern(pattern) {
    if (!pattern) return { valid: false, error: '正则表达式不能为空' };
    if (pattern.length > 200) return { valid: false, error: '正则表达式长度不能超过 200 字符' };
    const dangerous = /(\([^)]*[+*?]\)?[+*?])|(\([^)]*\|[^)]*\)[+*?])/;
    if (dangerous.test(pattern)) return { valid: false, error: '正则包含可能导致 ReDoS 的嵌套量词模式' };
    if ((pattern.match(/\(/g) || []).length > 10) return { valid: false, error: '正则表达式分组过多' };
    if ((pattern.match(/\[.*?\]/g) || []).length > 10) return { valid: false, error: '正则表达式字符集过多' };
    try {
      new RegExp(pattern);
      return { valid: true };
    } catch (e) {
      return { valid: false, error: '正则表达式语法错误' };
    }
  }

  function safeRegexMatch(pattern, str, flags = '') {
    const v = validateRegexPattern(pattern);
    if (!v.valid) return false;
    try {
      const r = new RegExp(pattern, flags);
      let done = false;
      let result = false;
      const start = Date.now();
      const t = setTimeout(() => { done = true; }, 50);
      try {
        result = r.test(str);
      } catch (e) {
        clearTimeout(t);
        return false;
      }
      clearTimeout(t);
      if (done) return false;
      if (Date.now() - start > 30) return false;
      return result;
    } catch (e) {
      return false;
    }
  }

  function filterCompatibleActions(rule) {
    if (!rule?.actions || !rule.actions.forceType) return rule?.actions || null;
    const comp = TYPE_COMPATIBILITY_RULES[rule.actions.forceType];
    if (!comp) return rule.actions;
    const filtered = { ...rule.actions };
    if (!comp.supportsEmbed) filtered.autoEmbed = false;
    if (!comp.supportsQuickRead) filtered.autoQuickRead = false;
    if (!comp.supportsSize) {
      filtered.previewWidth = null;
      filtered.previewHeight = null;
    }
    if (!comp.supportsDisableSecurity) filtered.disableSecurityCheck = false;
    return filtered;
  }

  function matchPreviewRule(url) {
    if (!settings.previewRules || settings.previewRules.length === 0 || !url) return null;

    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      const pathname = urlObj.pathname;
      const fullUrl = url;

      const sortedRules = [...settings.previewRules]
        .filter(r => r.enabled && r.matchValue)
        .sort((a, b) => (b.priority || 0) - (a.priority || 0));

      for (const rule of sortedRules) {
        let matched = false;
        const rawMatchValue = rule.matchType === 'suffix' ? normalizeSuffix(rule.matchValue) : rule.matchValue;
        const matchValue = rule.caseSensitive ? rawMatchValue : rawMatchValue.toLowerCase();
        const testHostname = rule.caseSensitive ? hostname : hostname.toLowerCase();
        const testPathname = rule.caseSensitive ? pathname : pathname.toLowerCase();
        const testUrl = rule.caseSensitive ? fullUrl : fullUrl.toLowerCase();

        switch (rule.matchType) {
          case 'domain':
            matched = testHostname === matchValue || testHostname.endsWith('.' + matchValue);
            break;
          case 'suffix':
            if (!matchValue || matchValue === '.') break;
            if (/[\/?#&=]/.test(matchValue)) break;
            matched = testPathname.endsWith(matchValue) || testUrl.endsWith(matchValue);
            break;
          case 'keyword':
            matched = testUrl.includes(matchValue);
            break;
          case 'regex':
            const flags = rule.caseSensitive ? '' : 'i';
            matched = safeRegexMatch(rule.matchValue, fullUrl, flags);
            break;
          default:
            matched = false;
        }

        if (matched) {
          return { ...rule, actions: filterCompatibleActions(rule) };
        }
      }
    } catch (e) {
      return null;
    }

    return null;
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
          <div class="qlp-position-selector" id="qlp-position-selector">
            <button class="qlp-action-btn qlp-position-btn" id="qlp-position-btn" title="定位模式">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" class="qlp-position-icon">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
            </button>
            <div class="qlp-position-dropdown" id="qlp-position-dropdown">
              <div class="qlp-position-section">
                <div class="qlp-position-section-title">定位模式</div>
                <div class="qlp-position-options">
                  <button class="qlp-position-option" data-mode="auto" title="根据链接位置自动选择最优锚点">
                    <span class="qlp-option-icon">🎯</span>
                    <span class="qlp-option-label">智能定位</span>
                  </button>
                  <button class="qlp-position-option" data-mode="mouse" title="预览面板跟随鼠标移动">
                    <span class="qlp-option-icon">🖱️</span>
                    <span class="qlp-option-label">跟随鼠标</span>
                  </button>
                  <button class="qlp-position-option" data-mode="anchor" title="固定在链接的指定方向">
                    <span class="qlp-option-icon">📌</span>
                    <span class="qlp-option-label">锚点定位</span>
                  </button>
                  <button class="qlp-position-option" data-mode="fixed" title="固定在屏幕的固定位置">
                    <span class="qlp-option-icon">🔲</span>
                    <span class="qlp-option-label">固定位置</span>
                  </button>
                </div>
              </div>
              <div class="qlp-position-section" id="qlp-anchor-section" style="display:none;">
                <div class="qlp-position-section-title">锚点方向</div>
                <div class="qlp-anchor-directions">
                  <button class="qlp-anchor-dir" data-dir="top" title="上方">↑</button>
                  <div class="qlp-anchor-row">
                    <button class="qlp-anchor-dir" data-dir="left" title="左侧">←</button>
                    <button class="qlp-anchor-dir qlp-anchor-center" data-dir="auto" title="自动选择">◎</button>
                    <button class="qlp-anchor-dir" data-dir="right" title="右侧">→</button>
                  </div>
                  <button class="qlp-anchor-dir" data-dir="bottom" title="下方">↓</button>
                </div>
              </div>
              <div class="qlp-position-section" id="qlp-fixed-section" style="display:none;">
                <div class="qlp-position-section-title">固定位置</div>
                <div class="qlp-anchor-directions">
                  <button class="qlp-anchor-dir" data-corner="top-left" title="左上角">↖</button>
                  <button class="qlp-anchor-dir" data-corner="top-center" title="顶部居中">↑</button>
                  <button class="qlp-anchor-dir" data-corner="top-right" title="右上角">↗</button>
                  <div class="qlp-anchor-row">
                    <button class="qlp-anchor-dir" data-corner="empty" disabled style="visibility:hidden">·</button>
                    <button class="qlp-anchor-dir qlp-anchor-center" data-corner="center" title="屏幕中央">●</button>
                    <button class="qlp-anchor-dir" data-corner="empty" disabled style="visibility:hidden">·</button>
                  </div>
                  <button class="qlp-anchor-dir" data-corner="bottom-left" title="左下角">↙</button>
                  <button class="qlp-anchor-dir" data-corner="empty" disabled style="visibility:hidden">·</button>
                  <button class="qlp-anchor-dir" data-corner="bottom-right" title="右下角">↘</button>
                </div>
              </div>
              <div class="qlp-position-section">
                <div class="qlp-position-section-title">显示选项</div>
                <label class="qlp-toggle-item">
                  <input type="checkbox" id="qlp-toggle-mouse-follow">
                  <span class="qlp-toggle-slider"></span>
                  <span class="qlp-toggle-label">鼠标跟随微调</span>
                </label>
                <label class="qlp-toggle-item">
                  <input type="checkbox" id="qlp-toggle-anchor-indicator" checked>
                  <span class="qlp-toggle-slider"></span>
                  <span class="qlp-toggle-label">显示锚点指示器</span>
                </label>
                <label class="qlp-toggle-item">
                  <input type="checkbox" id="qlp-toggle-smooth-transition" checked>
                  <span class="qlp-toggle-slider"></span>
                  <span class="qlp-toggle-label">平滑过渡动画</span>
                </label>
              </div>
            </div>
          </div>
          <button class="qlp-action-btn" id="qlp-favorite-btn" title="收藏 (2)">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" class="qlp-favorite-icon">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </button>
          <button class="qlp-action-btn" id="qlp-qrcode-btn" title="二维码 (4)">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M3 11h8V3H3v8zm2-6h4v4H5V5zM3 21h8v-8H3v8zm2-6h4v4H5v-4zM13 3v8h8V3h-8zm6 6h-4V5h4v4zM13 13h2v2h-2zM15 15h2v2h-2zM17 13h2v2h-2zM19 15h2v2h-2zM13 17h2v2h-2zM15 19h2v2h-2zM17 17h2v2h-2zM19 19h2v2h-2zM21 21h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10h-2v2h2v2z"/>
            </svg>
          </button>
          <button class="qlp-action-btn" id="qlp-copy-btn" title="复制链接 (1)">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
            </svg>
          </button>
          <a class="qlp-action-btn" id="qlp-open-new-tab" title="在新标签页打开 (3)" target="_blank" rel="noopener noreferrer">
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
        <span class="qlp-shortcut-hint">按数字键快捷操作</span>
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
    panel.querySelector('#qlp-copy-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      copyCurrentLink();
    });
    panel.querySelector('#qlp-favorite-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFavoriteCurrent();
    });
    panel.querySelector('#qlp-qrcode-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleQrcodePanel();
    });

    panel.querySelector('#qlp-position-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      const dropdown = panel.querySelector('#qlp-position-dropdown');
      dropdown.classList.toggle('qlp-visible');
      updatePositionDropdownState(panel);
    });

    panel.querySelectorAll('.qlp-position-option').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const mode = btn.dataset.mode;
        settings.positioning.mode = mode;
        savePositionSettings();

        const anchorSection = panel.querySelector('#qlp-anchor-section');
        anchorSection.style.display = mode === 'anchor' ? 'block' : 'none';

        updatePositionDropdownState(panel);

        if (lastMouseMoveEvent && previewPanel) {
          positionPreviewPanel(lastMouseMoveEvent, previewPanel);
        }

        showToast(`已切换到${getPositionModeLabel(mode)}模式`);
      });
    });

    panel.querySelectorAll('.qlp-anchor-dir[data-dir]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const dir = btn.dataset.dir;
        settings.positioning.anchorPosition = dir;
        savePositionSettings();
        updatePositionDropdownState(panel);

        if (lastMouseMoveEvent && previewPanel) {
          positionPreviewPanel(lastMouseMoveEvent, previewPanel);
        }

        showToast(`锚点方向：${getAnchorDirectionLabel(dir)}`);
      });
    });

    panel.querySelectorAll('.qlp-anchor-dir[data-corner]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const corner = btn.dataset.corner;
        if (!corner || corner === 'empty') return;
        applyCornerToFixedPosition(corner);
        updatePositionDropdownState(panel);
        if (lastMouseMoveEvent && previewPanel) {
          positionPreviewPanel(lastMouseMoveEvent, previewPanel);
        }
        const cornerLabels = {
          'top-left': '左上角', 'top-right': '右上角',
          'bottom-left': '左下角', 'bottom-right': '右下角',
          'top-center': '顶部居中', 'center': '屏幕中央'
        };
        showToast(`固定位置：${cornerLabels[corner] || corner}`);
      });
    });

    panel.querySelector('#qlp-toggle-mouse-follow').addEventListener('change', (e) => {
      e.stopPropagation();
      settings.positioning.enableMouseFollow = e.target.checked;
      savePositionSettings();
    });

    panel.querySelector('#qlp-toggle-anchor-indicator').addEventListener('change', (e) => {
      e.stopPropagation();
      settings.positioning.showAnchorIndicator = e.target.checked;
      savePositionSettings();
      const indicator = panel.querySelector('.qlp-anchor-indicator');
      if (indicator) {
        indicator.style.display = e.target.checked ? '' : 'none';
      }
    });

    panel.querySelector('#qlp-toggle-smooth-transition').addEventListener('change', (e) => {
      e.stopPropagation();
      settings.positioning.smoothTransition = e.target.checked;
      savePositionSettings();
    });

    document.addEventListener('click', (e) => {
      const dropdown = panel.querySelector('#qlp-position-dropdown');
      const selector = panel.querySelector('#qlp-position-selector');
      if (dropdown && selector && !selector.contains(e.target)) {
        dropdown.classList.remove('qlp-visible');
      }
    });

    panel.addEventListener('mouseenter', () => {
      isPanelHovered = true;
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
      showShortcutHint();
    });

    panel.addEventListener('mouseleave', () => {
      isPanelHovered = false;
      hideShortcutHint();
      if (settings.triggerMode === 'hover') {
        scheduleHide();
      }
    });

    panel.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    panel.addEventListener('wheel', (e) => {
      e.stopPropagation();
      const contentArea = panel.querySelector('#qlp-preview-content');
      if (contentArea) {
        const isScrollable = contentArea.scrollHeight > contentArea.clientHeight;
        if (isScrollable) {
          const atTop = contentArea.scrollTop === 0;
          const atBottom = contentArea.scrollTop + contentArea.clientHeight >= contentArea.scrollHeight - 1;
          
          if ((e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBottom)) {
            e.preventDefault();
          }
        } else {
          e.preventDefault();
        }
      } else {
        e.preventDefault();
      }
    }, { passive: false, capture: true });

    panel.addEventListener('scroll', (e) => {
      e.stopPropagation();
    }, true);

    const contentArea = panel.querySelector('#qlp-preview-content');
    if (contentArea) {
      contentArea.addEventListener('wheel', (e) => {
        e.stopPropagation();
        const isScrollable = contentArea.scrollHeight > contentArea.clientHeight;
        if (isScrollable) {
          const atTop = contentArea.scrollTop === 0;
          const atBottom = contentArea.scrollTop + contentArea.clientHeight >= contentArea.scrollHeight - 1;
          
          if ((e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBottom)) {
            e.preventDefault();
          }
        } else {
          e.preventDefault();
        }
      }, { passive: false, capture: true });

      contentArea.addEventListener('scroll', (e) => {
        e.stopPropagation();
      }, true);
    }

    previewPanel = panel;
    return panel;
  }

  function showPreview(link, event, securityInfo = null) {
    if (!link || !link.href) return;
    if (!isValidUrl(link.href)) return;
    if (isInBlacklist(window.location.href)) return;

    const absoluteUrl = getAbsoluteUrl(link.href);
    
    const matchedRule = matchPreviewRule(absoluteUrl);
    const ruleActions = matchedRule?.actions || null;

    if (ruleActions && ruleActions.skipPreview) {
      return;
    }

    let linkType = getLinkType(absoluteUrl);
    if (ruleActions && ruleActions.forceType) {
      linkType = ruleActions.forceType;
    }

    const typeEnabled = {
      'video': settings.enableVideoPreview,
      'video-site': settings.enableVideoPreview,
      'audio': settings.enableAudioPreview,
      'audio-site': settings.enableAudioPreview,
      'image': settings.enableImagePreview,
      'webpage': settings.enableWebpagePreview,
      'unknown': settings.enableWebpagePreview
    };

    if (!ruleActions?.forceType && !typeEnabled[linkType]) return;

    let effectiveWidth = settings.previewWidth;
    let effectiveHeight = settings.previewHeight;
    if (ruleActions) {
      if (ruleActions.previewWidth) effectiveWidth = ruleActions.previewWidth;
      if (ruleActions.previewHeight) effectiveHeight = ruleActions.previewHeight;
    }

    currentLink = absoluteUrl;
    currentLinkTitle = link.textContent?.trim() || link.title || '';
    const panel = createPreviewPanel();

    const origSecurityCheck = settings.enableSecurityCheck;
    if (ruleActions && ruleActions.disableSecurityCheck) {
      settings.enableSecurityCheck = false;
    }
    const secInfo = securityInfo || evaluateUrlSecurity(absoluteUrl);
    settings.enableSecurityCheck = origSecurityCheck;

    const linkText = link.textContent?.trim() || link.title || '';
    panel.querySelector('#qlp-preview-title').textContent = linkText ? 
      (linkText.length > 50 ? linkText.slice(0, 50) + '...' : linkText) : '链接预览';
    panel.querySelector('#qlp-preview-url').textContent = absoluteUrl;

    const openBtn = panel.querySelector('#qlp-open-new-tab');
    openBtn.href = absoluteUrl;

    const content = panel.querySelector('#qlp-preview-content');
    
    const securityBadge = createSecurityBadge(secInfo);
    
    const typeLabels = {
      'image': '图片',
      'video': '视频',
      'video-site': '视频网站',
      'audio': '音频',
      'audio-site': '音频网站',
      'webpage': '网页',
      'unknown': '链接'
    };
    const typeLabel = typeLabels[linkType] || '链接';
    
    const initialLoadingHtml = createLoadingHtml({
      text: `正在加载${typeLabel}预览...`,
      showProgress: true,
      indeterminate: true,
      showMeta: false,
      percent: 0
    });
    
    content.innerHTML = renderContentWithOrder(initialLoadingHtml, securityBadge);

    applyThemeToPanel(panel);
    applyComponentVisibility(panel);
    positionPreviewPanel(event, panel, effectiveWidth, effectiveHeight);
    panel.classList.add('qlp-visible');

    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }

    try {
      const hostname = new URL(absoluteUrl).hostname;
      currentLinkData = {
        url: absoluteUrl,
        title: linkText || hostname,
        type: linkType,
        favicon: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=32`,
        siteName: hostname,
        security: secInfo
      };
      chrome.runtime.sendMessage({
        action: 'addPreviewHistory',
        item: currentLinkData
      });
    } catch (e) {
      currentLinkData = { url: absoluteUrl, title: linkText || absoluteUrl, type: linkType };
    }

    checkFavoriteStatus(absoluteUrl);
    loadPreviewContent(absoluteUrl, linkType, content, secInfo, ruleActions);
  }

  function getTriggerPosition(event) {
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
  }

  function selectOptimalAnchor(triggerRect, panelWidth, panelHeight) {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 10;
    const offsetX = settings.positioning.offsetX;
    const offsetY = settings.positioning.offsetY;

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
  }

  function calculateAnchorPosition(anchorDirection, triggerRect, panelWidth, panelHeight) {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 10;
    const offsetX = settings.positioning.offsetX;
    const offsetY = settings.positioning.offsetY;

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
        return selectOptimalAnchor(triggerRect, panelWidth, panelHeight);
    }

    return { direction: anchorDirection, left, top, anchorX, anchorY };
  }

  function calculateFixedPosition(panelWidth, panelHeight) {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 10;
    const fixed = settings.positioning.fixedPosition || {};

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
  }

  function calculateMouseFollowPosition(event, panelWidth, panelHeight, triggerRect) {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 10;
    const offsetX = settings.positioning.offsetX;
    const offsetY = settings.positioning.offsetY;

    const mouseX = event ? event.clientX : currentMousePos.x;
    const mouseY = event ? event.clientY : currentMousePos.y;

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
  }

  function updateAnchorIndicator(panel, anchorX, anchorY, direction) {
    if (!settings.positioning.showAnchorIndicator) return;

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
  }

  function startMouseFollowAnimation(panel) {
    if (mouseFollowRAFId) {
      cancelAnimationFrame(mouseFollowRAFId);
    }

    function animate() {
      if (!previewPanel || !previewPanel.classList.contains('qlp-visible')) {
        mouseFollowRAFId = null;
        return;
      }

      const smoothing = settings.positioning.mouseFollowSensitivity;
      currentPanelPos.left += (targetPanelPos.left - currentPanelPos.left) * smoothing;
      currentPanelPos.top += (targetPanelPos.top - currentPanelPos.top) * smoothing;

      const dx = Math.abs(targetPanelPos.left - currentPanelPos.left);
      const dy = Math.abs(targetPanelPos.top - currentPanelPos.top);

      if (dx > 0.5 || dy > 0.5) {
        panel.style.left = currentPanelPos.left + 'px';
        panel.style.top = currentPanelPos.top + 'px';
        mouseFollowRAFId = requestAnimationFrame(animate);
      } else {
        panel.style.left = targetPanelPos.left + 'px';
        panel.style.top = targetPanelPos.top + 'px';
        mouseFollowRAFId = null;
      }
    }

    mouseFollowRAFId = requestAnimationFrame(animate);
  }

  function positionPreviewPanel(event, panel, width = null, height = null) {
    const panelWidth = width || settings.previewWidth;
    const panelHeight = (height || settings.previewHeight) + 60;
    const posSettings = settings.positioning;
    const trigger = getTriggerPosition(event);

    let result;
    const mode = posSettings.mode;

    if (mode === 'fixed') {
      result = calculateFixedPosition(panelWidth, panelHeight);
    } else if (mode === 'mouse') {
      result = calculateMouseFollowPosition(event, panelWidth, panelHeight, trigger.rect);
    } else if (mode === 'anchor') {
      if (posSettings.anchorPosition !== 'auto') {
        result = calculateAnchorPosition(posSettings.anchorPosition, trigger.rect, panelWidth, panelHeight);
      } else if (posSettings.smartAnchor) {
        result = selectOptimalAnchor(trigger.rect, panelWidth, panelHeight);
      } else {
        result = calculateAnchorPosition('bottom', trigger.rect, panelWidth, panelHeight);
      }
    } else {
      if (posSettings.smartAnchor) {
        result = selectOptimalAnchor(trigger.rect, panelWidth, panelHeight);
      } else {
        result = calculateAnchorPosition('bottom', trigger.rect, panelWidth, panelHeight);
      }
    }

    currentAnchorPoint = {
      x: result.anchorX || trigger.x,
      y: result.anchorY || trigger.y,
      direction: result.direction
    };

    targetPanelPos.left = result.left;
    targetPanelPos.top = result.top;

    panel.style.width = panelWidth + 'px';

    if (posSettings.smoothTransition && (mode === 'mouse' || posSettings.enableMouseFollow)) {
      currentPanelPos.left = parseFloat(panel.style.left) || result.left;
      currentPanelPos.top = parseFloat(panel.style.top) || result.top;
      startMouseFollowAnimation(panel);
    } else {
      panel.style.left = result.left + 'px';
      panel.style.top = result.top + 'px';
    }

    panel.setAttribute('data-position-mode', mode);
    panel.setAttribute('data-anchor-direction', result.direction);

    if (posSettings.showAnchorIndicator && result.direction !== 'fixed') {
      setTimeout(() => {
        updateAnchorIndicator(panel, currentAnchorPoint.x, currentAnchorPoint.y, result.direction);
      }, 50);
    }
  }

  function savePositionSettings() {
    chrome.storage.sync.set({
      positioning: settings.positioning
    });
  }

  function getPositionModeLabel(mode) {
    const labels = {
      'auto': '智能定位',
      'mouse': '跟随鼠标',
      'anchor': '锚点定位',
      'fixed': '固定位置'
    };
    return labels[mode] || mode;
  }

  function getAnchorDirectionLabel(dir) {
    const labels = {
      'auto': '自动选择',
      'top': '上方',
      'bottom': '下方',
      'left': '左侧',
      'right': '右侧'
    };
    return labels[dir] || dir;
  }

  function detectCurrentCorner(fixed) {
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
  }

  function applyCornerToFixedPosition(corner) {
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
    settings.positioning.fixedPosition = fp;
    savePositionSettings();
  }

  function updatePositionDropdownState(panel) {
    const currentMode = settings.positioning.mode;
    const currentAnchor = settings.positioning.anchorPosition;
    const currentCorner = detectCurrentCorner(settings.positioning.fixedPosition || {});

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
    if (mouseFollowToggle) mouseFollowToggle.checked = settings.positioning.enableMouseFollow;
    const indicatorToggle = panel.querySelector('#qlp-toggle-anchor-indicator');
    if (indicatorToggle) indicatorToggle.checked = settings.positioning.showAnchorIndicator;
    const smoothToggle = panel.querySelector('#qlp-toggle-smooth-transition');
    if (smoothToggle) smoothToggle.checked = settings.positioning.smoothTransition;
  }

  function scheduleHide() {
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      if (!isPanelHovered) {
        hidePreview();
      }
    }, 300);
  }

  function applyThemeToPanel(panel) {
    if (!panel || !settings.theme) return;
    
    const theme = settings.theme;
    
    panel.style.borderRadius = theme.borderRadius;
    panel.style.fontSize = theme.fontSize;
    
    const preset = THEME_PRESETS[theme.preset] || THEME_PRESETS.default;
    const isDark = theme.mode === 'dark' || (theme.mode === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const header = panel.querySelector('.qlp-preview-header');

    if (header) {
      header.style.background = `linear-gradient(135deg, ${theme.primaryColor} 0%, ${theme.secondaryColor} 100%)`;
    }

    if (theme.smartContrast) {
      const bgColor = isDark ? preset.darkBg : preset.lightBg;
      const contrastResult = getSmartContrastColors(theme.primaryColor, theme.secondaryColor, bgColor);

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
  }

  const LOAD_CONFIG = {
    imageTimeout: 15000,
    videoTimeout: 20000,
    audioTimeout: 20000,
    webpageTimeout: 10000,
    maxRetries: 3,
    retryDelay: 1000
  };

  function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }

  function getErrorCategory(error) {
    const message = error?.message || String(error || '');
    if (message.includes('timeout') || message.includes('超时') || message.includes('Timeout')) {
      return { type: 'timeout', label: '加载超时', icon: '⏱️' };
    }
    if (message.includes('abort') || message.includes('Abort')) {
      return { type: 'abort', label: '加载中断', icon: '⏹️' };
    }
    if (message.includes('network') || message.includes('Network') || message.includes('网络')) {
      return { type: 'network', label: '网络错误', icon: '📡' };
    }
    if (message.includes('404') || message.includes('Not Found')) {
      return { type: 'notfound', label: '资源不存在 (404)', icon: '🔍' };
    }
    if (message.includes('403') || message.includes('Forbidden')) {
      return { type: 'forbidden', label: '访问被拒绝 (403)', icon: '🔒' };
    }
    if (message.includes('5')) {
      return { type: 'server', label: '服务器错误', icon: '⚠️' };
    }
    if (message.includes('CORS') || message.includes('cross-origin') || message.includes('跨域')) {
      return { type: 'cors', label: '跨域限制', icon: '🚫' };
    }
    return { type: 'unknown', label: '加载失败', icon: '❌' };
  }

  function createLoadingHtml(options = {}) {
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
  }

  function createErrorHtml(options = {}) {
    const {
      error = null,
      title = '',
      message = '',
      showRetry = true,
      retryCount = 0,
      maxRetries = LOAD_CONFIG.maxRetries,
      showDetails = true
    } = options;

    const errorInfo = getErrorCategory(error);
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
        ${showDetails && error ? `<div class="qlp-error-details" title="${escapeHtml(String(error.message || error))}">${escapeHtml(String(error.message || error))}</div>` : ''}
        <div class="qlp-error-actions">
          ${showRetry && remainingRetries > 0 ? `
            <button class="qlp-retry-btn" data-action="retry">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
              </svg>
              重新加载
            </button>
          ` : ''}
          <a class="qlp-retry-btn" href="${escapeHtml(options.url || '#')}" target="_blank" rel="noopener noreferrer" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
            </svg>
            在新标签页打开
          </a>
        </div>
        ${showRetry && retryCount > 0 ? `<div class="qlp-retry-count">已重试 ${retryCount} 次，还可重试 ${remainingRetries} 次</div>` : ''}
      </div>
    `;
  }

  function updateLoadingProgress(container, percent, loadedSize, totalSize) {
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
      sizeEl.textContent = `${formatFileSize(loadedSize)} / ${formatFileSize(totalSize)}`;
    }
  }

  function loadImageWithProgress(url, onProgress, onLoad, onError, timeout = LOAD_CONFIG.imageTimeout) {
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
  }

  function loadPreviewContent(url, type, container, securityInfo = null, ruleActions = null) {
    const securityBadge = securityInfo && settings.enableSecurityCheck ? createSecurityBadge(securityInfo) : '';
    
    switch (type) {
      case 'image':
        loadImagePreview(url, container, securityBadge);
        break;
      case 'video':
        loadVideoPreview(url, container, securityBadge);
        break;
      case 'audio':
        loadAudioPreview(url, container, securityBadge);
        break;
      case 'video-site':
      case 'audio-site':
      case 'webpage':
      default:
        loadWebpagePreview(url, container, type, securityBadge, ruleActions);
        break;
    }
  }

  function loadImagePreview(url, container, securityBadge = '', retryCount = 0) {
    let loadController = null;
    let objectUrl = null;

    const loadingHtml = createLoadingHtml({
      text: '正在加载图片...',
      showProgress: true,
      indeterminate: true,
      showMeta: true,
      percent: 0
    });
    container.innerHTML = renderContentWithOrder(loadingHtml, securityBadge);

    function onProgress(percent, loaded, total) {
      updateLoadingProgress(container, percent, loaded, total);
    }

    function onLoad(imgUrl, contentType) {
      objectUrl = imgUrl;
      const contentHtml = `
        <div class="qlp-image-container">
          <img src="${imgUrl}" alt="图片预览" class="qlp-preview-image" />
        </div>
      `;
      container.innerHTML = renderContentWithOrder(contentHtml, securityBadge);
    }

    function onError(error) {
      const errorHtml = createErrorHtml({
        error: error,
        title: '图片加载失败',
        url: url,
        retryCount: retryCount,
        maxRetries: LOAD_CONFIG.maxRetries
      });
      container.innerHTML = renderContentWithOrder(errorHtml, securityBadge);

      const retryBtn = container.querySelector('[data-action="retry"]');
      if (retryBtn) {
        retryBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
            objectUrl = null;
          }
          loadImagePreview(url, container, securityBadge, retryCount + 1);
        });
      }
    }

    loadController = loadImageWithProgress(
      url,
      onProgress,
      onLoad,
      onError,
      LOAD_CONFIG.imageTimeout
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
  }

  function renderContentWithOrder(contentHtml, securityBadge) {
    const order = settings.theme.componentOrder;
    const visibility = settings.theme.componentVisibility || {};
    let result = '';
    
    for (const component of order) {
      if (visibility[component] === false) continue;
      
      if (component === 'security' && securityBadge && settings.enableSecurityCheck) {
        result += securityBadge;
      } else if (component === 'content') {
        result += contentHtml;
      }
    }
    
    if (!order.includes('content') || visibility['content'] === false) {
      if (visibility['content'] !== false) {
        result = (securityBadge && settings.enableSecurityCheck && visibility['security'] !== false ? securityBadge : '') + contentHtml;
      }
    }
    
    return result;
  }

  function applyComponentVisibility(panel) {
    if (!panel || !settings.theme || !settings.theme.componentVisibility) return;
    
    const visibility = settings.theme.componentVisibility;
    
    const header = panel.querySelector('.qlp-preview-header');
    const footer = panel.querySelector('.qlp-preview-footer');
    
    if (header) {
      header.style.display = visibility['header'] === false ? 'none' : '';
    }
    if (footer) {
      footer.style.display = visibility['footer'] === false ? 'none' : '';
    }
  }

  function loadVideoPreview(url, container, securityBadge = '', retryCount = 0) {
    const loadingHtml = createLoadingHtml({
      text: '正在加载视频...',
      showProgress: true,
      indeterminate: true,
      showMeta: true,
      percent: 0
    });
    container.innerHTML = renderContentWithOrder(loadingHtml, securityBadge);

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

      const errorHtml = createErrorHtml({
        error: error || new Error('视频加载失败'),
        title: '视频加载失败',
        url: url,
        retryCount: retryCount,
        maxRetries: LOAD_CONFIG.maxRetries
      });
      container.innerHTML = renderContentWithOrder(errorHtml, securityBadge);

      const retryBtn = container.querySelector('[data-action="retry"]');
      if (retryBtn) {
        retryBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          loadVideoPreview(url, container, securityBadge, retryCount + 1);
        });
      }
    }

    function handleProgress(event) {
      const media = event.target;
      if (media.buffered && media.buffered.length > 0 && media.duration) {
        const bufferedEnd = media.buffered.end(media.buffered.length - 1);
        const percent = Math.min(100, (bufferedEnd / media.duration) * 100);
        const loadedBytes = media.buffered.length * media.duration * 0.5;
        updateLoadingProgress(container, percent, loadedBytes, media.duration * 0.5);
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
      container.innerHTML = renderContentWithOrder(contentHtml, securityBadge);
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
    }, LOAD_CONFIG.videoTimeout);

    video.load();
  }

  function loadAudioPreview(url, container, securityBadge = '', retryCount = 0) {
    const loadingHtml = createLoadingHtml({
      text: '正在加载音频...',
      showProgress: true,
      indeterminate: true,
      showMeta: true,
      percent: 0
    });
    container.innerHTML = renderContentWithOrder(loadingHtml, securityBadge);

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

      const errorHtml = createErrorHtml({
        error: error || new Error('音频加载失败'),
        title: '音频加载失败',
        url: url,
        retryCount: retryCount,
        maxRetries: LOAD_CONFIG.maxRetries
      });
      container.innerHTML = renderContentWithOrder(errorHtml, securityBadge);

      const retryBtn = container.querySelector('[data-action="retry"]');
      if (retryBtn) {
        retryBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          loadAudioPreview(url, container, securityBadge, retryCount + 1);
        });
      }
    }

    function handleProgress(event) {
      const media = event.target;
      if (media.buffered && media.buffered.length > 0 && media.duration) {
        const bufferedEnd = media.buffered.end(media.buffered.length - 1);
        const percent = Math.min(100, (bufferedEnd / media.duration) * 100);
        updateLoadingProgress(container, percent, bufferedEnd, media.duration);
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
      container.innerHTML = renderContentWithOrder(contentHtml, securityBadge);
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
    }, LOAD_CONFIG.audioTimeout);

    audio.load();
  }

  function loadWebpagePreview(url, container, type, securityBadge = '', ruleActions = null, retryCount = 0) {
    const loadingHtml = createLoadingHtml({
      text: '正在获取页面信息...',
      showProgress: true,
      indeterminate: true,
      showMeta: false,
      percent: 0
    });
    container.innerHTML = renderContentWithOrder(loadingHtml, securityBadge);

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
    }, LOAD_CONFIG.webpageTimeout);

    function handleLoadError(error) {
      if (completed) return;
      completed = true;
      clearInterval(progressInterval);
      clearTimeout(timeoutId);

      if (retryCount < LOAD_CONFIG.maxRetries) {
        const errorHtml = createErrorHtml({
          error: error,
          title: '页面加载失败',
          url: url,
          retryCount: retryCount,
          maxRetries: LOAD_CONFIG.maxRetries,
          message: '正在尝试使用备用模式加载...'
        });
        container.innerHTML = renderContentWithOrder(errorHtml, securityBadge);

        const retryBtn = container.querySelector('[data-action="retry"]');
        if (retryBtn) {
          retryBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            loadWebpagePreview(url, container, type, securityBadge, ruleActions, retryCount + 1);
          });
        }

        setTimeout(() => {
          renderFallbackPreview(url, container, type, securityBadge, retryCount + 1);
        }, 500);
      } else {
        renderFallbackPreview(url, container, type, securityBadge, retryCount);
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
            renderRichPreview(url, response.data, container, type, securityBadge, ruleActions);
          }, 200);
        } else {
          handleLoadError(new Error(response?.error || '无法获取页面信息'));
        }
      });
    } catch (e) {
      handleLoadError(e);
    }
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function renderRichPreview(url, data, container, type, securityBadge = '', ruleActions = null) {
    const icon = data.favicon || getFaviconFromUrl(url);
    const image = data.image || '';
    const title = escapeHtml(data.title || url);
    const description = escapeHtml(data.description || '');
    const siteName = escapeHtml(data.siteName || getHostname(url));
    const safeIcon = escapeHtml(icon);
    const safeImage = image ? escapeHtml(image) : '';
    const safeUrl = escapeHtml(url);

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

    const urlObj = new URL(url);
    const canEmbed = canEmbedUrl(url);
    const hasSummary = data.summary && data.summary.length > 0;
    const hasKeywords = data.keywords && data.keywords.length > 0;
    const hasHeadings = data.headings && data.headings.length > 0;
    const hasReadingTime = data.readingTime && data.readingTime.minutes > 0;
    const hasQuickRead = hasSummary || hasKeywords || hasHeadings || hasReadingTime;

    let keywordsHtml = '';
    if (hasKeywords) {
      keywordsHtml = data.keywords.map(kw => 
        `<span class="qlp-keyword-tag">${escapeHtml(kw)}</span>`
      ).join('');
    }

    let headingsHtml = '';
    if (hasHeadings) {
      headingsHtml = data.headings.map(h => {
        const indent = (h.level - 1) * 12;
        return `
          <div class="qlp-heading-item" style="padding-left: ${indent}px;">
            <span class="qlp-heading-level">H${h.level}</span>
            <span class="qlp-heading-text">${escapeHtml(h.text)}</span>
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
            <div class="qlp-quickread-summary">${escapeHtml(data.summary)}</div>
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
    
    container.innerHTML = renderContentWithOrder(contentHtml, securityBadge);

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
  }

  function renderFallbackPreview(url, container, type, securityBadge = '') {
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
    
    container.innerHTML = renderContentWithOrder(contentHtml, securityBadge);

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
      currentLinkTitle = '';
      currentLinkData = null;
      isFavoriteCurrent = false;
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
    hideQrcodePanel();
    hideShortcutHint();
  }

  function handleLinkHover(event) {
    if (isBatchModeActive) return;
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
    if (isBatchModeActive) return;
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
    if (isBatchModeActive) return;
    if (settings.triggerMode !== 'click') return;
    if (isInBlacklist(window.location.href)) return;

    const batchHotkey = settings.batchMode.hotkey;
    const modifierPressed =
      (batchHotkey !== 'Alt' && event.altKey) ||
      (batchHotkey !== 'Control' && (event.ctrlKey || event.metaKey)) ||
      (batchHotkey !== 'Shift' && event.shiftKey) ||
      event.button !== 0;

    if (modifierPressed) {
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
      hideQrcodePanel();
      if (isBatchModeActive) {
        cancelBatchMode();
      }
      return;
    }

    if (currentLink && settings.shortcuts && settings.shortcuts.enabled && !isBatchModeActive) {
      const target = event.target;
      const isInputFocused = target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true' ||
        target.tagName === 'SELECT'
      );
      
      if (!isInputFocused) {
        const action = settings.shortcuts.actions.find(a => a.key === event.key);
        if (action) {
          event.preventDefault();
          event.stopPropagation();
          executeShortcutAction(action.action);
          return;
        }
      }
    }
    
    if (!settings.batchMode.enabled) return;
    
    const hotkey = settings.batchMode.hotkey;
    const isHotkeyPressed =
      (hotkey === 'Shift' && event.key === 'Shift') ||
      (hotkey === 'Control' && (event.key === 'Control' || event.key === 'Meta')) ||
      (hotkey === 'Alt' && event.key === 'Alt');

    if (isHotkeyPressed && !isBatchModeActive && !event.repeat) {
      if (settings.triggerMode === 'click' && hotkey === 'Alt' && event.altKey) {
        return;
      }
      startBatchMode();
    }
  }

  function handleKeyUp(event) {
    if (!settings.batchMode.enabled) return;
    
    if (!isBatchModeActive) return;

    const hotkey = settings.batchMode.hotkey;
    let shouldEnd = false;

    if (hotkey === 'Shift') {
      shouldEnd = !event.shiftKey;
    } else if (hotkey === 'Control') {
      shouldEnd = !event.ctrlKey && !event.metaKey;
    } else if (hotkey === 'Alt') {
      shouldEnd = !event.altKey;
    }

    if (shouldEnd) {
      endBatchMode();
    }
  }

  function startBatchMode() {
    isBatchModeActive = true;
    batchCollectedLinks = [];
    linkMarkerElements.clear();
    hidePreview();
    
    document.body.classList.add('qlp-batch-mode-active');
    showBatchModeIndicator();
    
    document.querySelectorAll('a[href]').forEach(link => {
      if (isValidUrl(link.href) && !isInBlacklist(window.location.href)) {
        link.addEventListener('mouseenter', handleBatchModeLinkHover);
      }
    });
  }

  function handleBatchModeLinkHover(event) {
    if (!isBatchModeActive) return;
    
    const link = event.target.closest('a');
    if (!link || !link.href || !isValidUrl(link.href)) return;
    
    const absoluteUrl = getAbsoluteUrl(link.href);
    const existingIdx = batchCollectedLinks.findIndex(l => l.url === absoluteUrl);
    
    if (existingIdx === -1) {
      const securityInfo = evaluateUrlSecurity(absoluteUrl);
      const linkType = getLinkType(absoluteUrl);
      const linkData = {
        url: absoluteUrl,
        title: link.textContent?.trim() || link.title || absoluteUrl,
        type: linkType,
        security: securityInfo,
        favicon: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(getHostname(absoluteUrl))}&sz=32`,
        timestamp: Date.now(),
        element: link
      };
      
      batchCollectedLinks.push(linkData);
      
      if (settings.batchMode.enableFloatingMarker) {
        addLinkMarker(link, securityInfo, batchCollectedLinks.length);
      }
      
      chrome.runtime.sendMessage({
        action: 'addPreviewHistory',
        item: {
          url: absoluteUrl,
          title: linkData.title,
          type: linkType,
          favicon: linkData.favicon,
          siteName: getHostname(absoluteUrl),
          security: securityInfo
        }
      });
      
      updateBatchCount();
    }
  }

  function addLinkMarker(link, securityInfo, index) {
    const marker = document.createElement('div');
    marker.className = 'qlp-link-marker';
    
    const levelInfo = getSecurityLevelInfo(securityInfo.level);
    marker.style.borderColor = levelInfo.borderColor;
    marker.style.background = levelInfo.bgColor;
    marker.style.color = levelInfo.color;
    marker.innerHTML = `<span class="qlp-marker-number">${index}</span><span class="qlp-marker-icon">${levelInfo.icon}</span>`;
    
    const rect = link.getBoundingClientRect();
    marker.style.left = (rect.right + 4) + 'px';
    marker.style.top = (rect.top + window.scrollY) + 'px';
    
    document.body.appendChild(marker);
    linkMarkerElements.set(link, marker);
  }

  function updateLinkMarkers() {
    linkMarkerElements.forEach((marker, link) => {
      const rect = link.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        marker.style.left = (rect.right + 4) + 'px';
        marker.style.top = (rect.top + window.scrollY) + 'px';
        marker.style.display = 'flex';
      } else {
        marker.style.display = 'none';
      }
    });
  }

  function showBatchModeIndicator() {
    let indicator = document.getElementById('qlp-batch-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'qlp-batch-indicator';
      indicator.className = 'qlp-batch-indicator';
      indicator.innerHTML = `
        <span class="qlp-indicator-icon">📋</span>
        <span class="qlp-indicator-text">批量预览模式</span>
        <span class="qlp-indicator-count" id="qlp-batch-count">0</span>
        <span class="qlp-indicator-hint">松开 ${settings.batchMode.hotkey} 对比 / Esc 取消</span>
      `;
      document.body.appendChild(indicator);
    }
    indicator.style.display = 'flex';
  }

  function updateBatchCount() {
    const countEl = document.getElementById('qlp-batch-count');
    if (countEl) {
      countEl.textContent = batchCollectedLinks.length;
    }
  }

  function endBatchMode() {
    isBatchModeActive = false;
    
    document.body.classList.remove('qlp-batch-mode-active');
    
    const indicator = document.getElementById('qlp-batch-indicator');
    if (indicator) {
      indicator.style.display = 'none';
    }
    
    linkMarkerElements.forEach(marker => marker.remove());
    linkMarkerElements.clear();
    
    document.querySelectorAll('a[href]').forEach(link => {
      link.removeEventListener('mouseenter', handleBatchModeLinkHover);
    });
    
    if (batchCollectedLinks.length > 0) {
      if (settings.batchMode.autoShowCompare) {
        showBatchCompareView();
      }
    }
  }

  function cancelBatchMode() {
    isBatchModeActive = false;
    batchCollectedLinks = [];
    
    document.body.classList.remove('qlp-batch-mode-active');
    
    const indicator = document.getElementById('qlp-batch-indicator');
    if (indicator) {
      indicator.style.display = 'none';
    }
    
    linkMarkerElements.forEach(marker => marker.remove());
    linkMarkerElements.clear();
    
    document.querySelectorAll('a[href]').forEach(link => {
      link.removeEventListener('mouseenter', handleBatchModeLinkHover);
    });
  }

  function createBatchComparePanel() {
    if (batchComparePanel) return batchComparePanel;
    
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
          <span class="qlp-compare-count">(${batchCollectedLinks.length} 个链接)</span>
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
        ${renderBatchCompareCards()}
      </div>
    `;
    
    document.body.appendChild(panel);
    applyThemeToPanel(panel);
    
    panel.querySelector('#qlp-compare-close').addEventListener('click', () => {
      hideBatchCompareView();
    });
    
    panel.querySelector('#qlp-compare-sort').addEventListener('change', (e) => {
      sortAndRenderCompareCards(e.target.value);
    });
    
    panel.querySelector('#qlp-compare-export').addEventListener('click', () => {
      exportBatchResults();
    });
    
    panel.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    
    batchComparePanel = panel;
    return panel;
  }

  function renderBatchCompareCards() {
    if (batchCollectedLinks.length === 0) {
      return `
        <div class="qlp-compare-empty">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
          <p>没有选择任何链接</p>
          <p class="qlp-compare-empty-hint">按住 ${settings.batchMode.hotkey} 键并将鼠标移过链接来收集</p>
        </div>
      `;
    }
    
    return batchCollectedLinks.map((link, index) => {
      const secInfo = link.security || { level: 'unknown', score: 0, risks: [] };
      const levelInfo = getSecurityLevelInfo(secInfo.level);
      const typeLabels = {
        'video': '视频', 'video-site': '视频',
        'audio': '音频', 'audio-site': '音频',
        'image': '图片', 'webpage': '网页', 'unknown': '链接'
      };
      
      const risksHtml = secInfo.risks && secInfo.risks.length > 0
        ? secInfo.risks.map(r => `<span class="qlp-risk-tag qlp-risk-${r.severity}">${escapeHtml(r.message)}</span>`).join('')
        : '<span class="qlp-risk-safe">✓ 无风险</span>';
      
      return `
        <div class="qlp-compare-card qlp-card-security-${secInfo.level}" data-url="${escapeHtml(link.url)}" data-index="${index}">
          <div class="qlp-compare-card-header">
            <div class="qlp-compare-card-index">${index + 1}</div>
            <img class="qlp-compare-card-favicon" src="${escapeHtml(link.favicon)}" alt="" onerror="this.style.display='none'">
            <div class="qlp-compare-card-title" title="${escapeHtml(link.title)}">${escapeHtml(link.title.length > 30 ? link.title.slice(0, 30) + '...' : link.title)}</div>
            <div class="qlp-compare-card-security" style="background: ${levelInfo.bgColor}; color: ${levelInfo.color}; border-color: ${levelInfo.borderColor};">
              <span class="qlp-security-icon">${levelInfo.icon}</span>
              <span class="qlp-security-label">${levelInfo.label}</span>
              <span class="qlp-security-score">${secInfo.score}</span>
            </div>
          </div>
          <div class="qlp-compare-card-body">
            <div class="qlp-compare-card-url" title="${escapeHtml(link.url)}">${escapeHtml(link.url.length > 50 ? link.url.slice(0, 50) + '...' : link.url)}</div>
            <div class="qlp-compare-card-meta">
              <span class="qlp-compare-card-type">${typeLabels[link.type] || '链接'}</span>
              <span class="qlp-compare-card-domain">${escapeHtml(getHostname(link.url))}</span>
            </div>
            ${settings.enableSecurityCheck ? `
              <div class="qlp-compare-card-risks">
                ${risksHtml}
              </div>
            ` : ''}
          </div>
          <div class="qlp-compare-card-footer">
            <button class="qlp-compare-card-btn qlp-btn-preview" data-url="${escapeHtml(link.url)}">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
              </svg>
              预览
            </button>
            <a class="qlp-compare-card-btn qlp-btn-open" href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">
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
  }

  function sortAndRenderCompareCards(sortType) {
    const sorted = [...batchCollectedLinks];
    
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
    
    batchCollectedLinks = sorted;
    
    const content = document.getElementById('qlp-compare-content');
    if (content) {
      content.innerHTML = renderBatchCompareCards();
      bindCompareCardEvents();
    }
  }

  function bindCompareCardEvents() {
    const panel = batchComparePanel;
    if (!panel) return;
    
    panel.querySelectorAll('.qlp-btn-preview').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const url = btn.dataset.url;
        const fakeLink = { href: url, textContent: '', title: '' };
        const fakeEvent = { clientX: window.innerWidth / 2, clientY: 100, target: { getBoundingClientRect: () => ({ left: window.innerWidth / 2, top: 50, bottom: 70 }) } };
        hideBatchCompareView();
        setTimeout(() => showPreview(fakeLink, fakeEvent), 100);
      });
    });
    
    panel.querySelectorAll('.qlp-btn-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt(btn.dataset.index, 10);
        batchCollectedLinks.splice(index, 1);
        const content = document.getElementById('qlp-compare-content');
        if (content) {
          content.innerHTML = renderBatchCompareCards();
          bindCompareCardEvents();
        }
        const countEl = panel.querySelector('.qlp-compare-count');
        if (countEl) countEl.textContent = `(${batchCollectedLinks.length} 个链接)`;
      });
    });
  }

  function showBatchCompareView() {
    hidePreview();
    const panel = createBatchComparePanel();
    panel.classList.add('qlp-visible');
    bindCompareCardEvents();
  }

  function hideBatchCompareView() {
    if (batchComparePanel) {
      batchComparePanel.classList.remove('qlp-visible');
    }
  }

  function exportBatchResults() {
    const data = batchCollectedLinks.map(link => ({
      title: link.title,
      url: link.url,
      type: link.type,
      securityLevel: link.security?.level || 'unknown',
      securityScore: link.security?.score || 0,
      risks: link.security?.risks?.map(r => r.message) || [],
      domain: getHostname(link.url)
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
  }

  function handleDocClick(event) {
    if (isBatchModeActive) return;
    
    if (batchComparePanel && batchComparePanel.classList.contains('qlp-visible')) {
      if (!batchComparePanel.contains(event.target)) {
        hideBatchCompareView();
        return;
      }
    }
    
    if (previewPanel && previewPanel.classList.contains('qlp-visible')) {
      if (!previewPanel.contains(event.target) && !event.target.closest('a')) {
        hidePreview();
      }
    }
  }

  function handleScroll(event) {
    if (isBatchModeActive) {
      updateLinkMarkers();
      return;
    }
    
    if (!previewPanel || !previewPanel.classList.contains('qlp-visible')) {
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
      hidePreview();
      return;
    }

    if (previewPanel && previewPanel.contains && !previewPanel.contains(scrollTarget)) {
      hidePreview();
    }
  }

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

  function loadSettings() {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (result) => {
      settings = deepMerge(DEFAULT_SETTINGS, result);
      applyThemeToRoot();
    });
  }

  function applyThemeToRoot() {
    if (!settings.theme) return;
    const theme = settings.theme;
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

  function handleRePreview(url) {
    if (!url || !isValidUrl(url)) return;
    const fakeLink = { href: url, textContent: '', title: '' };
    const fakeEvent = { clientX: window.innerWidth / 2, clientY: 100, target: { getBoundingClientRect: () => ({ left: window.innerWidth / 2, top: 50, bottom: 70 }) } };
    showPreview(fakeLink, fakeEvent);
  }

  function executeShortcutAction(action) {
    if (!currentLink) return;
    switch (action) {
      case 'copy':
        copyCurrentLink();
        break;
      case 'favorite':
        toggleFavoriteCurrent();
        break;
      case 'openNewTab':
        window.open(currentLink, '_blank');
        break;
      case 'qrcode':
        toggleQrcodePanel();
        break;
      case 'share':
        if (navigator.share) {
          navigator.share({
            title: currentLinkTitle || currentLink,
            url: currentLink
          }).catch(() => {});
        } else {
          copyCurrentLink();
        }
        break;
    }
  }

  function copyCurrentLink() {
    if (!currentLink) return;
    navigator.clipboard.writeText(currentLink).then(() => {
      showToast('链接已复制');
    }).catch(() => {
      const textarea = document.createElement('textarea');
      textarea.value = currentLink;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        showToast('链接已复制');
      } catch (e) {
        showToast('复制失败');
      }
      document.body.removeChild(textarea);
    });
  }

  function checkFavoriteStatus(url) {
    if (!chrome?.runtime) {
      isFavoriteCurrent = false;
      updateFavoriteButtonState();
      return;
    }
    chrome.runtime.sendMessage({ action: 'isFavorite', url: url }, (response) => {
      if (response && response.success) {
        isFavoriteCurrent = response.isFavorite;
        updateFavoriteButtonState();
      }
    });
  }

  function updateFavoriteButtonState() {
    if (!previewPanel) return;
    const btn = previewPanel.querySelector('#qlp-favorite-btn');
    const icon = btn?.querySelector('.qlp-favorite-icon');
    if (btn && icon) {
      if (isFavoriteCurrent) {
        btn.classList.add('qlp-favorited');
        icon.style.fill = '#ff6b6b';
      } else {
        btn.classList.remove('qlp-favorited');
        icon.style.fill = 'currentColor';
      }
    }
  }

  function toggleFavoriteCurrent() {
    if (!currentLink || !chrome?.runtime) return;
    if (isFavoriteCurrent) {
      if (!confirm('确定要取消收藏这个链接吗？')) return;
      chrome.runtime.sendMessage({ action: 'getFavorites' }, (response) => {
        if (response && response.success && response.favorites) {
          const fav = response.favorites.find(f => f.url === currentLink);
          if (fav) {
            chrome.runtime.sendMessage({ action: 'deleteFavorite', favoriteId: fav.id }, (resp) => {
              if (resp && resp.success) {
                isFavoriteCurrent = false;
                updateFavoriteButtonState();
                showToast('已取消收藏');
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
        const descEl = previewContent.querySelector('.qlp-webpage-desc, .qlp-video-desc, .qlp-page-desc');
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
        url: currentLink,
        title: currentLinkTitle || currentLinkData?.title || currentLink,
        description: description || currentLinkData?.description || '',
        image: image || currentLinkData?.image || '',
        favicon: currentLinkData?.favicon || '',
        type: currentLinkData?.type || 'webpage',
        siteName: currentLinkData?.siteName || '',
        categoryId: 'default',
        notes: '',
        security: currentLinkData?.security || null,
        pageText: pageText,
        offlineAvailable: true,
        cachedAt: Date.now()
      };

      try {
        const snapshot = generateFavoriteSnapshot(currentLink, item);
        if (snapshot) {
          item.snapshot = snapshot;
        }
      } catch (e) {
        console.debug('Snapshot generation skipped:', e);
      }

      chrome.runtime.sendMessage({ action: 'addFavorite', item: item }, (response) => {
        if (response && response.success) {
          isFavoriteCurrent = true;
          updateFavoriteButtonState();
          showToast('已收藏（支持离线查看）');
        } else if (response && response.error === 'duplicate') {
          isFavoriteCurrent = true;
          updateFavoriteButtonState();
          showToast('已收藏');
        }
      });
    }
  }

  function generateFavoriteSnapshot(url, data) {
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
  }

  function toggleQrcodePanel() {
    if (qrcodePanel && qrcodePanel.classList.contains('qlp-visible')) {
      hideQrcodePanel();
    } else {
      showQrcodePanel();
    }
  }

  function showQrcodePanel() {
    if (!currentLink) return;
    if (!qrcodePanel) {
      qrcodePanel = document.createElement('div');
      qrcodePanel.className = 'qlp-qrcode-panel';
      qrcodePanel.id = 'qlp-qrcode-panel';

      const header = document.createElement('div');
      header.className = 'qlp-qrcode-header';

      const headerSpan = document.createElement('span');
      headerSpan.textContent = '链接二维码';

      const closeBtn = document.createElement('button');
      closeBtn.className = 'qlp-qrcode-close';
      closeBtn.id = 'qlp-qrcode-close';
      closeBtn.textContent = '×';
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        hideQrcodePanel();
      });

      header.appendChild(headerSpan);
      header.appendChild(closeBtn);

      const qrContent = document.createElement('div');
      qrContent.className = 'qlp-qrcode-content';
      qrContent.id = 'qlp-qrcode-content';

      const qrUrl = document.createElement('div');
      qrUrl.className = 'qlp-qrcode-url';
      qrUrl.id = 'qlp-qrcode-url';

      qrcodePanel.appendChild(header);
      qrcodePanel.appendChild(qrContent);
      qrcodePanel.appendChild(qrUrl);

      qrcodePanel.addEventListener('click', (e) => {
        e.stopPropagation();
      });

      document.body.appendChild(qrcodePanel);
    }

    const qrContent = qrcodePanel.querySelector('#qlp-qrcode-content');
    const qrUrl = qrcodePanel.querySelector('#qlp-qrcode-url');
    while (qrContent.firstChild) {
      qrContent.removeChild(qrContent.firstChild);
    }
    
    const canvas = document.createElement('canvas');
    canvas.width = 220;
    canvas.height = 220;
    generateQRCode(canvas, currentLink);
    qrContent.appendChild(canvas);
    
    const displayUrl = currentLink.length > 40 ? currentLink.slice(0, 40) + '...' : currentLink;
    qrUrl.textContent = displayUrl;
    qrUrl.title = currentLink;

    applyThemeToQrcodePanel();

    if (previewPanel && previewPanel.classList.contains('qlp-visible')) {
      const panelRect = previewPanel.getBoundingClientRect();
      let left = panelRect.right + 10;
      let top = panelRect.top;
      if (left + 240 > window.innerWidth - 10) {
        left = panelRect.left - 250;
      }
      if (top + 280 > window.innerHeight - 10) {
        top = window.innerHeight - 290;
      }
      if (left < 10) left = 10;
      if (top < 10) top = 10;
      qrcodePanel.style.left = left + 'px';
      qrcodePanel.style.top = top + 'px';
    } else {
      qrcodePanel.style.left = (window.innerWidth - 240) / 2 + 'px';
      qrcodePanel.style.top = (window.innerHeight - 280) / 2 + 'px';
    }

    qrcodePanel.classList.add('qlp-visible');
  }

  function applyThemeToQrcodePanel() {
    if (!qrcodePanel || !settings.theme) return;
    const theme = settings.theme;
    const isDark = theme.mode === 'dark' || 
      (theme.mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      qrcodePanel.style.background = '#1a1a2e';
      qrcodePanel.style.color = '#fff';
      qrcodePanel.style.border = '1px solid #333';
    } else {
      qrcodePanel.style.background = '#fff';
      qrcodePanel.style.color = '#333';
      qrcodePanel.style.border = '1px solid #e0e0e0';
    }
    qrcodePanel.style.borderRadius = theme.borderRadius;
    qrcodePanel.style.boxShadow = 'var(--qlp-shadow)';
  }

  function hideQrcodePanel() {
    if (qrcodePanel) {
      qrcodePanel.classList.remove('qlp-visible');
    }
  }

  function generateQRCode(canvas, text) {
    const QR = {
      VERSIONS: [
        { totalCodewords: 26, ecCodewordsPerBlock: 10, blocksPerGroup1: 1, dataCodewordsPerBlock1: 16, blocksPerGroup2: 0, dataCodewordsPerBlock2: 0 },
        { totalCodewords: 44, ecCodewordsPerBlock: 16, blocksPerGroup1: 1, dataCodewordsPerBlock1: 28, blocksPerGroup2: 0, dataCodewordsPerBlock2: 0 },
        { totalCodewords: 70, ecCodewordsPerBlock: 26, blocksPerGroup1: 1, dataCodewordsPerBlock1: 44, blocksPerGroup2: 0, dataCodewordsPerBlock2: 0 },
        { totalCodewords: 100, ecCodewordsPerBlock: 18, blocksPerGroup1: 2, dataCodewordsPerBlock1: 32, blocksPerGroup2: 0, dataCodewordsPerBlock2: 0 },
        { totalCodewords: 134, ecCodewordsPerBlock: 24, blocksPerGroup1: 2, dataCodewordsPerBlock1: 43, blocksPerGroup2: 0, dataCodewordsPerBlock2: 0 },
      ],

      GALOIS_EXP: new Array(512),
      GALOIS_LOG: new Array(256),

      initGalois: function() {
        let x = 1;
        for (let i = 0; i < 255; i++) {
          this.GALOIS_EXP[i] = x;
          this.GALOIS_LOG[x] = i;
          x <<= 1;
          if (x & 0x100) x ^= 0x11d;
        }
        for (let i = 255; i < 512; i++) {
          this.GALOIS_EXP[i] = this.GALOIS_EXP[i - 255];
        }
      },

      galoisMultiply: function(a, b) {
        if (a === 0 || b === 0) return 0;
        return this.GALOIS_EXP[this.GALOIS_LOG[a] + this.GALOIS_LOG[b]];
      },

      generateECCodewords: function(data, ecCount) {
        const log = this.GALOIS_LOG;
        const exp = this.GALOIS_EXP;
        
        let generator = [1];
        for (let i = 0; i < ecCount; i++) {
          const newGenerator = new Array(generator.length + 1).fill(0);
          for (let j = 0; j < generator.length; j++) {
            newGenerator[j] ^= this.galoisMultiply(generator[j], 1);
            newGenerator[j + 1] ^= this.galoisMultiply(generator[j], exp[i]);
          }
          generator = newGenerator;
        }

        const messagePoly = data.slice();
        for (let i = 0; i < ecCount; i++) {
          messagePoly.push(0);
        }

        for (let i = 0; i < data.length; i++) {
          const coeff = messagePoly[i];
          if (coeff !== 0) {
            for (let j = 0; j < generator.length; j++) {
              messagePoly[i + j] ^= this.galoisMultiply(generator[j], coeff);
            }
          }
        }

        return messagePoly.slice(data.length);
      },

      encodeByteMode: function(text) {
        const bytes = new TextEncoder().encode(text);
        const bits = [];
        
        bits.push(0, 1, 0, 0);
        
        const length = bytes.length;
        for (let i = 7; i >= 0; i--) {
          bits.push((length >> i) & 1);
        }
        
        for (const byte of bytes) {
          for (let i = 7; i >= 0; i--) {
            bits.push((byte >> i) & 1);
          }
        }
        
        return bits;
      },

      addTerminator: function(bits, totalBits) {
        const terminatorBits = Math.min(4, totalBits - bits.length);
        for (let i = 0; i < terminatorBits; i++) {
          bits.push(0);
        }
        
        while (bits.length % 8 !== 0) {
          bits.push(0);
        }
        
        const padBytes = [0xec, 0x11];
        let padIndex = 0;
        while (bits.length < totalBits) {
          const padByte = padBytes[padIndex % 2];
          for (let i = 7; i >= 0; i--) {
            bits.push((padByte >> i) & 1);
            if (bits.length >= totalBits) break;
          }
          padIndex++;
        }
        
        return bits;
      },

      bitsToBytes: function(bits) {
        const bytes = [];
        for (let i = 0; i < bits.length; i += 8) {
          let byte = 0;
          for (let j = 0; j < 8 && i + j < bits.length; j++) {
            byte = (byte << 1) | bits[i + j];
          }
          bytes.push(byte);
        }
        return bytes;
      },

      structureFinalMessage: function(dataBytes, version, ecLevel) {
        const v = this.VERSIONS[version - 1];
        const ecCodewordsPerBlock = v.ecCodewordsPerBlock;
        const totalDataCodewords = v.totalCodewords - ecCodewordsPerBlock * (v.blocksPerGroup1 + v.blocksPerGroup2);
        
        const shortBlocks = [];
        for (let i = 0; i < v.blocksPerGroup1; i++) {
          const start = i * v.dataCodewordsPerBlock1;
          const data = dataBytes.slice(start, start + v.dataCodewordsPerBlock1);
          const ec = this.generateECCodewords(data, ecCodewordsPerBlock);
          shortBlocks.push({ data: data, ec: ec });
        }
        
        for (let i = 0; i < v.blocksPerGroup2; i++) {
          const start = v.blocksPerGroup1 * v.dataCodewordsPerBlock1 + i * v.dataCodewordsPerBlock2;
          const data = dataBytes.slice(start, start + v.dataCodewordsPerBlock2);
          const ec = this.generateECCodewords(data, ecCodewordsPerBlock);
          shortBlocks.push({ data: data, ec: ec });
        }
        
        const allBlocks = shortBlocks;
        
        const finalData = [];
        const maxDataLength = Math.max(...allBlocks.map(b => b.data.length));
        
        for (let i = 0; i < maxDataLength; i++) {
          for (const block of allBlocks) {
            if (i < block.data.length) {
              finalData.push(block.data[i]);
            }
          }
        }
        
        const maxEcLength = Math.max(...allBlocks.map(b => b.ec.length));
        for (let i = 0; i < maxEcLength; i++) {
          for (const block of allBlocks) {
            if (i < block.ec.length) {
              finalData.push(block.ec[i]);
            }
          }
        }
        
        return finalData;
      },

      buildMatrix: function(size, finalBytes) {
        const matrix = [];
        const reserved = [];
        for (let r = 0; r < size; r++) {
          matrix.push(new Array(size).fill(null));
          reserved.push(new Array(size).fill(false));
        }
        
        const placeFinder = (row, col) => {
          for (let r = -1; r <= 7; r++) {
            for (let c = -1; c <= 7; c++) {
              const rr = row + r;
              const cc = col + c;
              if (rr >= 0 && rr < size && cc >= 0 && cc < size) {
                reserved[rr][cc] = true;
                if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
                  const onBorder = (r === 0 || r === 6 || c === 0 || c === 6);
                  const onInner = (r >= 2 && r <= 4 && c >= 2 && c <= 4);
                  matrix[rr][cc] = onBorder || onInner;
                } else {
                  matrix[rr][cc] = false;
                }
              }
            }
          }
        };
        
        placeFinder(0, 0);
        placeFinder(0, size - 7);
        placeFinder(size - 7, 0);
        
        for (let i = 8; i < size - 8; i++) {
          matrix[6][i] = i % 2 === 0;
          matrix[i][6] = i % 2 === 0;
          reserved[6][i] = true;
          reserved[i][6] = true;
        }
        
        const alignmentPositions = [6, size - 7];
        for (const r of alignmentPositions) {
          for (const c of alignmentPositions) {
            if (r === 6 && c === 6) continue;
            if (r === 6 && c === size - 7) continue;
            if (r === size - 7 && c === 6) continue;
            for (let dr = -2; dr <= 2; dr++) {
              for (let dc = -2; dc <= 2; dc++) {
                const rr = r + dr;
                const cc = c + dc;
                if (rr >= 0 && rr < size && cc >= 0 && cc < size && !reserved[rr][cc]) {
                  reserved[rr][cc] = true;
                  const onBorder = (dr === -2 || dr === 2 || dc === -2 || dc === 2);
                  const onInner = (dr === 0 && dc === 0);
                  matrix[rr][cc] = onBorder || onInner;
                }
              }
            }
          }
        }
        
        let bitIndex = 0;
        let direction = -1;
        for (let col = size - 1; col > 0; col -= 2) {
          if (col === 6) col--;
          for (let rowOffset = 0; rowOffset < size; rowOffset++) {
            const row = direction === -1 ? size - 1 - rowOffset : rowOffset;
            for (let cOffset = 0; cOffset < 2; cOffset++) {
              const c = col - cOffset;
              if (!reserved[row][c]) {
                let bit = false;
                if (bitIndex < finalBytes.length * 8) {
                  const byteIndex = Math.floor(bitIndex / 8);
                  const bitOffset = 7 - (bitIndex % 8);
                  bit = ((finalBytes[byteIndex] >> bitOffset) & 1) === 1;
                }
                
                const rowMod3 = (row + Math.floor(col / 3)) % 3 === 0;
                const colMod3 = (col + Math.floor(row / 3)) % 3 === 0;
                const mask = (row + col) % 2 === 0 || rowMod3 || colMod3;
                
                matrix[row][c] = bit !== mask;
                bitIndex++;
              }
            }
          }
          direction *= -1;
        }
        
        return matrix;
      },

      generate: function(text) {
        this.initGalois();
        
        let version = 1;
        let versionInfo = this.VERSIONS[0];
        const dataBits = this.encodeByteMode(text);
        
        for (let v = 1; v <= 5; v++) {
          const vi = this.VERSIONS[v - 1];
          const totalDataCodewords = vi.totalCodewords - vi.ecCodewordsPerBlock * (vi.blocksPerGroup1 + vi.blocksPerGroup2);
          const totalBits = totalDataCodewords * 8;
          if (dataBits.length + 12 <= totalBits) {
            version = v;
            versionInfo = vi;
            break;
          }
        }
        
        const totalDataCodewords = versionInfo.totalCodewords - versionInfo.ecCodewordsPerBlock * (versionInfo.blocksPerGroup1 + versionInfo.blocksPerGroup2);
        const totalBits = totalDataCodewords * 8;
        
        const finalBits = this.addTerminator(dataBits.slice(), totalBits);
        const dataBytes = this.bitsToBytes(finalBits);
        
        const finalBytes = this.structureFinalMessage(dataBytes, version, 'L');
        
        const size = 17 + version * 4;
        const matrix = this.buildMatrix(size, finalBytes);
        
        return { matrix: matrix, size: size };
      }
    };

    const result = QR.generate(text);
    const ctx = canvas.getContext('2d');
    const canvasSize = canvas.width;
    const padding = 16;
    const moduleSize = (canvasSize - padding * 2) / result.size;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasSize, canvasSize);
    ctx.fillStyle = '#000000';

    for (let row = 0; row < result.size; row++) {
      for (let col = 0; col < result.size; col++) {
        if (result.matrix[row][col]) {
          ctx.fillRect(
            padding + col * moduleSize,
            padding + row * moduleSize,
            Math.ceil(moduleSize),
            Math.ceil(moduleSize)
          );
        }
      }
    }
  }

  function showShortcutHint() {
    if (!settings.shortcuts || !settings.shortcuts.enabled) return;
    if (!previewPanel) return;
    
    if (!shortcutHintPanel) {
      shortcutHintPanel = document.createElement('div');
      shortcutHintPanel.className = 'qlp-shortcut-hint-panel';
      shortcutHintPanel.id = 'qlp-shortcut-hint-panel';
      document.body.appendChild(shortcutHintPanel);
    }

    const actions = settings.shortcuts.actions;
    shortcutHintPanel.innerHTML = actions.map(a => 
      `<div class="qlp-shortcut-item">
        <span class="qlp-shortcut-key">${a.key}</span>
        <span class="qlp-shortcut-label">${a.label}</span>
      </div>`
    ).join('');

    applyThemeToShortcutPanel();

    const panelRect = previewPanel.getBoundingClientRect();
    let left = panelRect.left;
    let top = panelRect.bottom + 5;
    if (top + 60 > window.innerHeight - 10) {
      top = panelRect.top - 60;
    }
    shortcutHintPanel.style.left = left + 'px';
    shortcutHintPanel.style.top = top + 'px';

    shortcutHintPanel.classList.add('qlp-visible');
  }

  function applyThemeToShortcutPanel() {
    if (!shortcutHintPanel || !settings.theme) return;
    const theme = settings.theme;
    const isDark = theme.mode === 'dark' || 
      (theme.mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      shortcutHintPanel.style.background = 'rgba(26, 26, 46, 0.95)';
      shortcutHintPanel.style.color = '#fff';
    } else {
      shortcutHintPanel.style.background = 'rgba(255, 255, 255, 0.95)';
      shortcutHintPanel.style.color = '#333';
    }
    shortcutHintPanel.style.borderRadius = theme.borderRadius;
    shortcutHintPanel.style.boxShadow = 'var(--qlp-shadow)';
  }

  function hideShortcutHint() {
    if (shortcutHintPanel) {
      shortcutHintPanel.classList.remove('qlp-visible');
    }
  }

  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'qlp-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    requestAnimationFrame(() => {
      toast.classList.add('qlp-toast-visible');
    });

    setTimeout(() => {
      toast.classList.remove('qlp-toast-visible');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 1500);
  }

  function handleMouseMove(event) {
    currentMousePos.x = event.clientX;
    currentMousePos.y = event.clientY;
    lastMouseMoveEvent = event;

    if (settings.positioning.enableMouseFollow && previewPanel && previewPanel.classList.contains('qlp-visible') && !isPanelHovered) {
      const mode = settings.positioning.mode;
      const panelWidth = settings.previewWidth;
      const panelHeight = settings.previewHeight + 60;
      const posSettings = settings.positioning;
      const trigger = getTriggerPosition(event);
      let result;

      if (mode === 'fixed') {
        return;
      }

      if (mode === 'mouse' || mode === 'auto') {
        result = calculateMouseFollowPosition(event, panelWidth, panelHeight, trigger.rect);
      } else if (mode === 'anchor') {
        const anchorDir = posSettings.anchorPosition !== 'auto'
          ? posSettings.anchorPosition
          : currentAnchorPoint.direction;
        result = calculateAnchorPositionWithMouseOffset(
          anchorDir,
          trigger.rect,
          panelWidth,
          panelHeight,
          event
        );
      }

      if (result) {
        targetPanelPos.left = result.left;
        targetPanelPos.top = result.top;

        currentAnchorPoint.x = result.anchorX || trigger.x;
        currentAnchorPoint.y = result.anchorY || trigger.y;
        currentAnchorPoint.direction = result.direction;

        if (posSettings.smoothTransition) {
          startMouseFollowAnimation(previewPanel);
        } else {
          previewPanel.style.left = result.left + 'px';
          previewPanel.style.top = result.top + 'px';
        }

        if (posSettings.showAnchorIndicator && result.direction !== 'fixed') {
          updateAnchorIndicator(previewPanel, currentAnchorPoint.x, currentAnchorPoint.y, result.direction);
        }
      }
    }
  }

  function calculateAnchorPositionWithMouseOffset(anchorDirection, triggerRect, panelWidth, panelHeight, event) {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 10;
    const offsetX = settings.positioning.offsetX;
    const offsetY = settings.positioning.offsetY;
    const sensitivity = settings.positioning.mouseFollowSensitivity * 0.5;

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
        return selectOptimalAnchor(triggerRect, panelWidth, panelHeight);
    }

    if (left + panelWidth > viewportWidth - margin) left = viewportWidth - panelWidth - margin;
    if (left < margin) left = margin;
    if (top + panelHeight > viewportHeight - margin) top = viewportHeight - panelHeight - margin;
    if (top < margin) top = margin;

    return { direction: anchorDirection, left, top, anchorX, anchorY };
  }

  function init() {
    loadSettings();

    document.addEventListener('mouseover', handleLinkHover, true);
    document.addEventListener('mouseout', handleLinkLeave, true);
    document.addEventListener('click', handleLinkClick, true);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('click', handleDocClick);
    document.addEventListener('mousemove', handleMouseMove, true);
    window.addEventListener('scroll', handleScroll, true);

    const observer = new MutationObserver(() => {
      if (isBatchModeActive) {
        document.querySelectorAll('a[href]').forEach(link => {
          if (isValidUrl(link.href) && !isInBlacklist(window.location.href)) {
            if (!link._qlpBatchListener) {
              link.addEventListener('mouseenter', handleBatchModeLinkHover);
              link._qlpBatchListener = true;
            }
          }
        });
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync') {
        for (const key in changes) {
          if (changes[key].newValue !== undefined) {
            if (changes[key].newValue && typeof changes[key].newValue === 'object' && !Array.isArray(changes[key].newValue)) {
              settings[key] = deepMerge(settings[key] || {}, changes[key].newValue);
            } else {
              settings[key] = changes[key].newValue;
            }
          }
        }
        applyThemeToRoot();
        const existingPanel = document.getElementById('qlp-preview-panel');
        if (existingPanel) {
          applyThemeToPanel(existingPanel);
          applyComponentVisibility(existingPanel);
        }
        const batchPanel = document.getElementById('qlp-batch-compare-panel');
        if (batchPanel) {
          const batchHeader = batchPanel.querySelector('.qlp-compare-header');
          if (batchHeader) {
            batchHeader.style.background = `linear-gradient(135deg, ${settings.theme.primaryColor} 0%, ${settings.theme.secondaryColor} 100%)`;
          }
        }
        document.documentElement.style.setProperty('--qlp-primary-color', settings.theme.primaryColor);
        document.documentElement.style.setProperty('--qlp-secondary-color', settings.theme.secondaryColor);
      }
    });

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'rePreview' && request.url) {
        handleRePreview(request.url);
        sendResponse({ success: true });
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
