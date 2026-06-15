(function () {
  'use strict';

  if (window.top !== window.self) {
    return;
  }

  window.QLP = window.QLP || {};

  QLP.DEFAULT_SETTINGS = {
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

  QLP.THEME_PRESETS = {
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

  QLP.NO_EMBED_DOMAINS = [
  ];

  QLP.PHISHING_KEYWORDS = [
    'verify', 'confirm', 'update', 'wallet', 'crypto', 'bitcoin', 'ethereum',
    'prize', 'winner', 'free', 'urgent', 'immediate', 'suspended', 'limited',
    'exclusive', 'claim', 'password', 'creditcard', 'banking'
  ];

  QLP.LOGIN_PATH_KEYWORDS = ['login', 'signin', 'account', 'secure'];

  QLP.BRAND_KEYWORDS = [
    'paypal', 'appleid', 'googleid', 'microsoft', 'amazon',
    'facebook', 'instagram', 'twitter'
  ];

  QLP.MALICIOUS_TLDS = [
    '.xyz', '.top', '.club', '.online', '.site', '.website', '.space',
    '.fun', '.tk', '.ml', '.ga', '.cf', '.gq', '.work', '.biz', '.info'
  ];

  QLP.SUSPICIOUS_PATTERNS = [
    /\d{5,}/,
    /-{2,}/,
    /[a-z0-9]{20,}/i,
    /\.(php|asp|aspx|jsp|cgi)\?.*=/i,
    /javascript:/i,
    /data:/i
  ];

  QLP.TRUSTED_DOMAINS = [
    'google.com', 'youtube.com', 'facebook.com', 'twitter.com', 'instagram.com',
    'linkedin.com', 'github.com', 'stackoverflow.com', 'apple.com', 'microsoft.com',
    'amazon.com', 'paypal.com', 'netflix.com', 'spotify.com', 'wikipedia.org',
    'baidu.com', 'zhihu.com', 'bilibili.com', 'taobao.com', 'jd.com',
    'qq.com', 'weibo.com', 'douyin.com', 'kuaishou.com', 'xiaohongshu.com'
  ];

  QLP.TYPE_COMPATIBILITY_RULES = {
    webpage: { supportsEmbed: true, supportsQuickRead: true, supportsSize: true, supportsDisableSecurity: true },
    image: { supportsEmbed: false, supportsQuickRead: false, supportsSize: true, supportsDisableSecurity: true },
    video: { supportsEmbed: false, supportsQuickRead: false, supportsSize: true, supportsDisableSecurity: true },
    'video-site': { supportsEmbed: true, supportsQuickRead: false, supportsSize: true, supportsDisableSecurity: true },
    audio: { supportsEmbed: false, supportsQuickRead: false, supportsSize: true, supportsDisableSecurity: true },
    'audio-site': { supportsEmbed: true, supportsQuickRead: false, supportsSize: true, supportsDisableSecurity: true }
  };

  QLP.LOAD_CONFIG = {
    imageTimeout: 15000,
    videoTimeout: 20000,
    audioTimeout: 20000,
    webpageTimeout: 10000,
    maxRetries: 3,
    retryDelay: 1000
  };

  QLP.settings = { ...QLP.DEFAULT_SETTINGS };
  QLP.hoverTimer = null;
  QLP.hideTimer = null;
  QLP.previewPanel = null;
  QLP.currentLink = null;
  QLP.currentLinkTitle = '';
  QLP.currentLinkData = null;
  QLP.isPanelHovered = false;
  QLP.isBatchModeActive = false;
  QLP.batchCollectedLinks = [];
  QLP.batchComparePanel = null;
  QLP.linkMarkerElements = new Map();
  QLP.qrcodePanel = null;
  QLP.shortcutHintPanel = null;
  QLP.isFavoriteCurrent = false;
  QLP.currentMousePos = { x: 0, y: 0 };
  QLP.currentAnchorPoint = { x: 0, y: 0, direction: 'bottom' };
  QLP.mouseFollowRAFId = null;
  QLP.targetPanelPos = { left: 0, top: 0 };
  QLP.currentPanelPos = { left: 0, top: 0 };
  QLP.lastMouseMoveEvent = null;

})();
