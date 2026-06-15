'use strict';

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

const DEFAULT_SETTINGS = {
  securityRules: {
    checkPhishing: true,
    checkMalicious: true,
    checkSuspicious: true,
    checkRedirect: true
  }
};

function isTrustedDomain(hostname, trustedDomains) {
  return trustedDomains.some(domain =>
    hostname === domain || hostname.endsWith('.' + domain)
  );
}

function evaluateUrlSecurity(url, { enableSecurityCheck = true, securityRules = {} } = {}, trustedDomains = TRUSTED_DOMAINS, phishingKeywords = PHISHING_KEYWORDS, loginPathKeywords = LOGIN_PATH_KEYWORDS, brandKeywords = BRAND_KEYWORDS, maliciousTlds = MALICIOUS_TLDS, suspiciousPatterns = SUSPICIOUS_PATTERNS, _preDeducted) {
  if (!enableSecurityCheck) {
    return { level: 'unknown', score: 0, risks: [] };
  }

  const risks = [];
  let score = 100;
  const deducted = _preDeducted ? new Set(_preDeducted) : new Set();

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

    if (securityRules.checkPhishing) {
      const isHostTrusted = trustedDomains.some(domain => hostname === domain || hostname.endsWith('.' + domain));
      for (const keyword of phishingKeywords) {
        const key = 'phishing-kw-' + keyword;
        if (deducted.has(key)) continue;
        if (pathname.includes(keyword) && !isHostTrusted) {
          deductPoints('phishing', 15, {
            type: 'phishing',
            severity: 'high',
            message: `路径包含可疑关键词: ${keyword}`
          });
          deducted.add(key);
        }
      }

      for (const keyword of loginPathKeywords) {
        const key = 'phishing-login-' + keyword;
        if (deducted.has(key)) continue;
        if (pathname.includes(keyword) && !isHostTrusted) {
          deductPoints('phishing', 20, {
            type: 'phishing',
            severity: 'high',
            message: `疑似登录页面 (${keyword})，请核实网站真伪`
          });
          deducted.add(key);
          break;
        }
      }

      for (const brand of brandKeywords) {
        const key = 'phishing-brand-' + brand;
        if (deducted.has(key)) continue;
        const parts = hostname.replace(/^www\./, '').split('.');
        if (parts[0].includes(brand) && !isHostTrusted) {
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

    if (securityRules.checkMalicious) {
      const tldKey = 'malicious-tld';
      if (!deducted.has(tldKey)) {
        for (const tld of maliciousTlds) {
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

    if (securityRules.checkSuspicious) {
      const suspiciousKey = 'suspicious-pattern';
      if (!deducted.has(suspiciousKey)) {
        for (const pattern of suspiciousPatterns) {
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

    if (securityRules.checkRedirect) {
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

    if (trustedDomains.some(domain => hostname === domain || hostname.endsWith('.' + domain))) {
      score = Math.min(100, score + 20);
      risks.splice(0, risks.length, ...risks.filter(r => r.type === 'redirect'));
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

module.exports = {
  isTrustedDomain,
  evaluateUrlSecurity,
  getSecurityLevelInfo,
  PHISHING_KEYWORDS,
  LOGIN_PATH_KEYWORDS,
  BRAND_KEYWORDS,
  MALICIOUS_TLDS,
  SUSPICIOUS_PATTERNS,
  TRUSTED_DOMAINS,
  DEFAULT_SETTINGS
};
