(function () {
  'use strict';

  if (window.top !== window.self) {
    return;
  }

  window.QLP = window.QLP || {};
  const _ = QLP;

  _.isTrustedDomain = function isTrustedDomain(hostname) {
    return _.TRUSTED_DOMAINS.some(domain =>
      hostname === domain || hostname.endsWith('.' + domain)
    );
  };

  _.evaluateUrlSecurity = function evaluateUrlSecurity(url) {
    if (!_.settings.enableSecurityCheck) {
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

      if (_.settings.securityRules.checkPhishing) {
        for (const keyword of _.PHISHING_KEYWORDS) {
          const key = 'phishing-kw-' + keyword;
          if (deducted.has(key)) continue;
          if (pathname.includes(keyword) && !_.isTrustedDomain(hostname)) {
            deductPoints('phishing', 15, {
              type: 'phishing',
              severity: 'high',
              message: `路径包含可疑关键词: ${keyword}`
            });
            deducted.add(key);
          }
        }

        for (const keyword of _.LOGIN_PATH_KEYWORDS) {
          const key = 'phishing-login-' + keyword;
          if (deducted.has(key)) continue;
          if (pathname.includes(keyword) && !_.isTrustedDomain(hostname)) {
            deductPoints('phishing', 20, {
              type: 'phishing',
              severity: 'high',
              message: `疑似登录页面 (${keyword})，请核实网站真伪`
            });
            deducted.add(key);
            break;
          }
        }

        for (const brand of _.BRAND_KEYWORDS) {
          const key = 'phishing-brand-' + brand;
          if (deducted.has(key)) continue;
          const parts = hostname.replace(/^www\./, '').split('.');
          if (parts[0].includes(brand) && !_.isTrustedDomain(hostname)) {
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

      if (_.settings.securityRules.checkMalicious) {
        const tldKey = 'malicious-tld';
        if (!deducted.has(tldKey)) {
          for (const tld of _.MALICIOUS_TLDS) {
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

      if (_.settings.securityRules.checkSuspicious) {
        const suspiciousKey = 'suspicious-pattern';
        if (!deducted.has(suspiciousKey)) {
          for (const pattern of _.SUSPICIOUS_PATTERNS) {
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

      if (_.settings.securityRules.checkRedirect) {
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

      if (_.isTrustedDomain(hostname)) {
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
  };

  _.getSecurityLevelInfo = function getSecurityLevelInfo(level) {
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
  };

  _.createSecurityBadge = function createSecurityBadge(securityInfo) {
    if (!_.settings.enableSecurityCheck) return '';

    const levelInfo = _.getSecurityLevelInfo(securityInfo.level);
    const risksHtml = securityInfo.risks && securityInfo.risks.length > 0
      ? securityInfo.risks.map(r => `<div class="qlp-security-risk qlp-risk-${r.severity}">${_.escapeHtml(r.message)}</div>`).join('')
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
  };

})();
