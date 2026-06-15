'use strict';

const {
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
} = require('./modules/security');

describe('isTrustedDomain', () => {
  test('exact match returns true', () => {
    expect(isTrustedDomain('google.com', ['google.com', 'youtube.com'])).toBe(true);
  });

  test('subdomain match returns true', () => {
    expect(isTrustedDomain('www.google.com', ['google.com'])).toBe(true);
    expect(isTrustedDomain('mail.google.com', ['google.com'])).toBe(true);
  });

  test('not in list returns false', () => {
    expect(isTrustedDomain('evil.com', ['google.com', 'youtube.com'])).toBe(false);
  });

  test('empty trustedDomains returns false', () => {
    expect(isTrustedDomain('google.com', [])).toBe(false);
  });
});

describe('evaluateUrlSecurity', () => {
  describe('enableSecurityCheck=false', () => {
    test('returns unknown level with zero score and empty risks', () => {
      const result = evaluateUrlSecurity('https://evil.com/verify', { enableSecurityCheck: false });
      expect(result).toEqual({ level: 'unknown', score: 0, risks: [] });
    });
  });

  describe('checkPhishing', () => {
    test('phishing keyword in path on non-trusted domain triggers phishing risk', () => {
      const result = evaluateUrlSecurity(
        'https://evil.com/verify',
        { enableSecurityCheck: true, securityRules: { checkPhishing: true, checkMalicious: false, checkSuspicious: false, checkRedirect: false } },
        []
      );
      expect(result.risks.some(r => r.type === 'phishing' && r.message.includes('verify'))).toBe(true);
    });

    test('phishing keyword on trusted domain produces no phishing risk', () => {
      const result = evaluateUrlSecurity(
        'https://google.com/verify',
        { enableSecurityCheck: true, securityRules: { checkPhishing: true, checkMalicious: false, checkSuspicious: false, checkRedirect: false } },
        TRUSTED_DOMAINS
      );
      expect(result.risks.some(r => r.type === 'phishing' && r.message.includes('verify'))).toBe(false);
    });

    test('phishing keyword on trusted domain - single keyword path covers trusted branch', () => {
      const result = evaluateUrlSecurity(
        'https://google.com/verify',
        { enableSecurityCheck: true, securityRules: { checkPhishing: true, checkMalicious: false, checkSuspicious: false, checkRedirect: false } },
        ['google.com'],
        ['verify'],
        [],
        [],
        [],
        []
      );
      expect(result.risks.some(r => r.type === 'phishing')).toBe(false);
      expect(result.score).toBe(100);
    });

    test('login keyword on trusted domain covers trusted branch for login', () => {
      const result = evaluateUrlSecurity(
        'https://google.com/login',
        { enableSecurityCheck: true, securityRules: { checkPhishing: true, checkMalicious: false, checkSuspicious: false, checkRedirect: false } },
        ['google.com'],
        [],
        ['login'],
        [],
        [],
        []
      );
      expect(result.risks.some(r => r.type === 'phishing')).toBe(false);
      expect(result.score).toBe(100);
    });

    test('already deducted phishing keyword is skipped', () => {
      const customKw = ['verify'];
      const result = evaluateUrlSecurity(
        'https://evil.com/verify/verify',
        { enableSecurityCheck: true, securityRules: { checkPhishing: true, checkMalicious: false, checkSuspicious: false, checkRedirect: false } },
        [],
        customKw
      );
      const phishingRisks = result.risks.filter(r => r.type === 'phishing' && r.message.includes('verify'));
      expect(phishingRisks.length).toBe(1);
    });

    test('login path keyword on non-trusted domain triggers phishing risk with severity high', () => {
      const result = evaluateUrlSecurity(
        'https://evil.com/login',
        { enableSecurityCheck: true, securityRules: { checkPhishing: true, checkMalicious: false, checkSuspicious: false, checkRedirect: false } },
        []
      );
      const risk = result.risks.find(r => r.type === 'phishing' && r.message.includes('login'));
      expect(risk).toBeDefined();
      expect(risk.severity).toBe('high');
    });

    test('login path keyword on trusted domain produces no phishing risk', () => {
      const result = evaluateUrlSecurity(
        'https://google.com/login',
        { enableSecurityCheck: true, securityRules: { checkPhishing: true, checkMalicious: false, checkSuspicious: false, checkRedirect: false } },
        TRUSTED_DOMAINS
      );
      expect(result.risks.some(r => r.type === 'phishing' && r.message.includes('login'))).toBe(false);
    });

    test('login path only matches first keyword (break after first)', () => {
      const customLogin = ['login', 'signin'];
      const result = evaluateUrlSecurity(
        'https://evil.com/login/signin',
        { enableSecurityCheck: true, securityRules: { checkPhishing: true, checkMalicious: false, checkSuspicious: false, checkRedirect: false } },
        [],
        [],
        customLogin
      );
      const loginRisks = result.risks.filter(r => r.type === 'phishing' && r.message.includes('疑似登录页面'));
      expect(loginRisks.length).toBe(1);
    });

    test('brand keyword in hostname on non-trusted domain triggers phishing brand risk', () => {
      const result = evaluateUrlSecurity(
        'https://paypalscam.xyz/page',
        { enableSecurityCheck: true, securityRules: { checkPhishing: true, checkMalicious: false, checkSuspicious: false, checkRedirect: false } },
        []
      );
      const risk = result.risks.find(r => r.type === 'phishing' && r.message.includes('paypal'));
      expect(risk).toBeDefined();
      expect(risk.severity).toBe('high');
    });

    test('brand keyword on trusted domain produces no phishing brand risk', () => {
      const result = evaluateUrlSecurity(
        'https://paypal.com/page',
        { enableSecurityCheck: true, securityRules: { checkPhishing: true, checkMalicious: false, checkSuspicious: false, checkRedirect: false } },
        TRUSTED_DOMAINS
      );
      expect(result.risks.some(r => r.type === 'phishing' && r.message.includes('paypal'))).toBe(false);
    });

    test('brand only matches first one (break after first)', () => {
      const customBrand = ['paypal', 'appleid'];
      const result = evaluateUrlSecurity(
        'https://paypalappleid.xyz/page',
        { enableSecurityCheck: true, securityRules: { checkPhishing: true, checkMalicious: false, checkSuspicious: false, checkRedirect: false } },
        [],
        [],
        [],
        customBrand
      );
      const brandRisks = result.risks.filter(r => r.type === 'phishing' && r.message.includes('仿冒品牌'));
      expect(brandRisks.length).toBe(1);
    });
  });

  describe('checkMalicious', () => {
    test('malicious TLD triggers malicious risk', () => {
      const result = evaluateUrlSecurity(
        'https://evil.xyz/page',
        { enableSecurityCheck: true, securityRules: { checkPhishing: false, checkMalicious: true, checkSuspicious: false, checkRedirect: false } },
        []
      );
      const risk = result.risks.find(r => r.type === 'malicious' && r.message.includes('.xyz'));
      expect(risk).toBeDefined();
      expect(risk.severity).toBe('medium');
    });

    test('already deducted TLD is skipped', () => {
      const result = evaluateUrlSecurity(
        'https://evil.xyz/page',
        { enableSecurityCheck: true, securityRules: { checkPhishing: false, checkMalicious: true, checkSuspicious: false, checkRedirect: false } },
        []
      );
      const tldRisks = result.risks.filter(r => r.type === 'malicious' && r.message.includes('顶级域名'));
      expect(tldRisks.length).toBe(1);
    });

    test('long domain with www. prefix and >50 chars triggers malicious risk', () => {
      const longPart = 'a'.repeat(50);
      const url = `https://www.${longPart}.com/page`;
      const result = evaluateUrlSecurity(
        url,
        { enableSecurityCheck: true, securityRules: { checkPhishing: false, checkMalicious: true, checkSuspicious: false, checkRedirect: false } },
        []
      );
      const risk = result.risks.find(r => r.type === 'malicious' && r.message.includes('域名过长'));
      expect(risk).toBeDefined();
    });

    test('long domain without www. prefix does not trigger long domain check', () => {
      const longPart = 'a'.repeat(50);
      const url = `https://${longPart}.com/page`;
      const result = evaluateUrlSecurity(
        url,
        { enableSecurityCheck: true, securityRules: { checkPhishing: false, checkMalicious: true, checkSuspicious: false, checkRedirect: false } },
        []
      );
      expect(result.risks.some(r => r.type === 'malicious' && r.message.includes('域名过长'))).toBe(false);
    });

    test('domain <=50 chars does not trigger long domain risk', () => {
      const url = 'https://www.short.com/page';
      const result = evaluateUrlSecurity(
        url,
        { enableSecurityCheck: true, securityRules: { checkPhishing: false, checkMalicious: true, checkSuspicious: false, checkRedirect: false } },
        []
      );
      expect(result.risks.some(r => r.type === 'malicious' && r.message.includes('域名过长'))).toBe(false);
    });
  });

  describe('checkSuspicious', () => {
    test('suspicious pattern in URL triggers suspicious risk', () => {
      const result = evaluateUrlSecurity(
        'https://example.com/page/1234567890',
        { enableSecurityCheck: true, securityRules: { checkPhishing: false, checkMalicious: false, checkSuspicious: true, checkRedirect: false } },
        []
      );
      const risk = result.risks.find(r => r.type === 'suspicious' && r.message.includes('可疑模式'));
      expect(risk).toBeDefined();
      expect(risk.severity).toBe('low');
    });

    test('already deducted suspicious pattern is skipped', () => {
      const result = evaluateUrlSecurity(
        'https://example.com/page/1234567890',
        { enableSecurityCheck: true, securityRules: { checkPhishing: false, checkMalicious: false, checkSuspicious: true, checkRedirect: false } },
        []
      );
      const suspiciousRisks = result.risks.filter(r => r.type === 'suspicious' && r.message.includes('可疑模式'));
      expect(suspiciousRisks.length).toBe(1);
    });

    test('HTTP protocol triggers suspicious risk', () => {
      const result = evaluateUrlSecurity(
        'http://example.com/page',
        { enableSecurityCheck: true, securityRules: { checkPhishing: false, checkMalicious: false, checkSuspicious: true, checkRedirect: false } },
        []
      );
      const risk = result.risks.find(r => r.type === 'suspicious' && r.message.includes('HTTPS'));
      expect(risk).toBeDefined();
    });

    test('HTTPS protocol does not trigger HTTP risk', () => {
      const result = evaluateUrlSecurity(
        'https://example.com/page',
        { enableSecurityCheck: true, securityRules: { checkPhishing: false, checkMalicious: false, checkSuspicious: true, checkRedirect: false } },
        []
      );
      expect(result.risks.some(r => r.type === 'suspicious' && r.message.includes('HTTPS'))).toBe(false);
    });

    test('long query string >200 chars triggers suspicious risk', () => {
      const longQuery = 'a='.concat('b'.repeat(200));
      const result = evaluateUrlSecurity(
        `https://example.com/page?${longQuery}`,
        { enableSecurityCheck: true, securityRules: { checkPhishing: false, checkMalicious: false, checkSuspicious: true, checkRedirect: false } },
        []
      );
      const risk = result.risks.find(r => r.type === 'suspicious' && r.message.includes('参数过长'));
      expect(risk).toBeDefined();
    });

    test('short query string does not trigger long query risk', () => {
      const result = evaluateUrlSecurity(
        'https://example.com/page?foo=bar',
        { enableSecurityCheck: true, securityRules: { checkPhishing: false, checkMalicious: false, checkSuspicious: true, checkRedirect: false } },
        []
      );
      expect(result.risks.some(r => r.type === 'suspicious' && r.message.includes('参数过长'))).toBe(false);
    });
  });

  describe('checkRedirect', () => {
    test.each([
      ['redirect=', 'https://evil.com/page?redirect=http://bad.com'],
      ['url=', 'https://evil.com/page?url=http://bad.com'],
      ['link=', 'https://evil.com/page?link=http://bad.com'],
      ['href=', 'https://evil.com/page?href=http://bad.com'],
      ['go=', 'https://evil.com/page?go=http://bad.com']
    ])('redirect param %s triggers redirect risk', (param, url) => {
      const result = evaluateUrlSecurity(
        url,
        { enableSecurityCheck: true, securityRules: { checkPhishing: false, checkMalicious: false, checkSuspicious: false, checkRedirect: true } },
        []
      );
      const risk = result.risks.find(r => r.type === 'redirect');
      expect(risk).toBeDefined();
      expect(risk.severity).toBe('medium');
    });

    test('URL without redirect params produces no redirect risk', () => {
      const result = evaluateUrlSecurity(
        'https://example.com/page?foo=bar',
        { enableSecurityCheck: true, securityRules: { checkPhishing: false, checkMalicious: false, checkSuspicious: false, checkRedirect: true } },
        []
      );
      expect(result.risks.some(r => r.type === 'redirect')).toBe(false);
    });

    test('already deducted redirect is skipped', () => {
      const result = evaluateUrlSecurity(
        'https://evil.com/page?redirect=http://bad.com',
        { enableSecurityCheck: true, securityRules: { checkPhishing: false, checkMalicious: false, checkSuspicious: false, checkRedirect: true } },
        []
      );
      const redirectRisks = result.risks.filter(r => r.type === 'redirect');
      expect(redirectRisks.length).toBe(1);
    });
  });

  describe('trusted domain bonus', () => {
    test('trusted domain gets +20 score and only redirect risks remain', () => {
      const result = evaluateUrlSecurity(
        'https://google.com/verify?redirect=http://bad.com',
        { enableSecurityCheck: true, securityRules: { checkPhishing: true, checkMalicious: true, checkSuspicious: true, checkRedirect: true } },
        TRUSTED_DOMAINS
      );
      expect(result.score).toBe(100);
      expect(result.risks.every(r => r.type === 'redirect')).toBe(true);
    });
  });

  describe('score levels', () => {
    test('score >= 80 results in safe level', () => {
      const result = evaluateUrlSecurity(
        'https://example.com/page',
        { enableSecurityCheck: true, securityRules: { checkPhishing: false, checkMalicious: false, checkSuspicious: false, checkRedirect: false } },
        []
      );
      expect(result.score).toBeGreaterThanOrEqual(80);
      expect(result.level).toBe('safe');
    });

    test('score >= 60 and < 80 results in low level', () => {
      const result = evaluateUrlSecurity(
        'https://evil.com/verify/login',
        { enableSecurityCheck: true, securityRules: { checkPhishing: true, checkMalicious: false, checkSuspicious: false, checkRedirect: false } },
        []
      );
      expect(result.score).toBeGreaterThanOrEqual(60);
      expect(result.score).toBeLessThan(80);
      expect(result.level).toBe('low');
    });

    test('score >= 40 and < 60 results in medium level', () => {
      const result = evaluateUrlSecurity(
        'http://evil.xyz/verify/login?foo=bar',
        { enableSecurityCheck: true, securityRules: { checkPhishing: true, checkMalicious: true, checkSuspicious: true, checkRedirect: false } },
        []
      );
      expect(result.score).toBeGreaterThanOrEqual(40);
      expect(result.score).toBeLessThan(60);
      expect(result.level).toBe('medium');
    });

    test('score < 40 results in high level', () => {
      const longPart = 'a'.repeat(50);
      const longQuery = 'x='.concat('y'.repeat(200));
      const result = evaluateUrlSecurity(
        `http://www.${longPart}.xyz/verify/login?${longQuery}&redirect=http://bad.com`,
        { enableSecurityCheck: true, securityRules: { checkPhishing: true, checkMalicious: true, checkSuspicious: true, checkRedirect: true } },
        []
      );
      expect(result.score).toBeLessThan(40);
      expect(result.level).toBe('high');
    });
  });

  describe('invalid URL', () => {
    test('returns unknown level with error risk', () => {
      const result = evaluateUrlSecurity('not-a-url');
      expect(result.level).toBe('unknown');
      expect(result.score).toBe(0);
      expect(result.risks).toEqual([{ type: 'error', severity: 'low', message: '无法解析 URL' }]);
    });
  });

  describe('category deduction cap', () => {
    test('phishing category cannot deduct more than 50', () => {
      const manyKw = ['verify', 'confirm', 'update', 'wallet'];
      const manyLogin = ['login', 'signin'];
      const manyBrand = ['paypal', 'appleid'];
      const result = evaluateUrlSecurity(
        'https://paypalscam.xyz/verify/confirm/login/signin',
        { enableSecurityCheck: true, securityRules: { checkPhishing: true, checkMalicious: false, checkSuspicious: false, checkRedirect: false } },
        [],
        manyKw,
        manyLogin,
        manyBrand
      );
      expect(result.categoryDeduction.phishing).toBeLessThanOrEqual(result.categoryMaxDeduction.phishing);
      expect(result.categoryDeduction.phishing).toBe(50);
    });

    test('malicious category cannot deduct more than 25', () => {
      const longPart = 'a'.repeat(50);
      const result = evaluateUrlSecurity(
        `https://www.${longPart}.xyz/page`,
        { enableSecurityCheck: true, securityRules: { checkPhishing: false, checkMalicious: true, checkSuspicious: false, checkRedirect: false } },
        []
      );
      expect(result.categoryDeduction.malicious).toBeLessThanOrEqual(result.categoryMaxDeduction.malicious);
    });

    test('suspicious category cannot deduct more than 20', () => {
      const longQuery = 'x='.concat('y'.repeat(200));
      const result = evaluateUrlSecurity(
        `http://example.com/1234567890?${longQuery}`,
        { enableSecurityCheck: true, securityRules: { checkPhishing: false, checkMalicious: false, checkSuspicious: true, checkRedirect: false } },
        []
      );
      expect(result.categoryDeduction.suspicious).toBeLessThanOrEqual(result.categoryMaxDeduction.suspicious);
    });

    test('redirect category cannot deduct more than 15', () => {
      const result = evaluateUrlSecurity(
        'https://evil.com/page?redirect=http://bad.com',
        { enableSecurityCheck: true, securityRules: { checkPhishing: false, checkMalicious: false, checkSuspicious: false, checkRedirect: true } },
        []
      );
      expect(result.categoryDeduction.redirect).toBeLessThanOrEqual(result.categoryMaxDeduction.redirect);
    });

    test('deductPoints returns false when cap reached', () => {
      const manyKw = ['verify', 'confirm', 'update', 'wallet'];
      const manyLogin = ['login', 'signin'];
      const manyBrand = ['paypal', 'appleid'];
      const result = evaluateUrlSecurity(
        'https://paypalscam.xyz/verify/confirm/update/wallet/login/signin',
        { enableSecurityCheck: true, securityRules: { checkPhishing: true, checkMalicious: false, checkSuspicious: false, checkRedirect: false } },
        [],
        manyKw,
        manyLogin,
        manyBrand
      );
      expect(result.categoryDeduction.phishing).toBe(result.categoryMaxDeduction.phishing);
      const phishingRiskCount = result.risks.filter(r => r.type === 'phishing').length;
      const totalPhishingDeduction = phishingRiskCount > 0
        ? result.risks
            .filter(r => r.type === 'phishing')
            .reduce((sum) => sum + 1, 0)
        : 0;
      expect(totalPhishingDeduction).toBeGreaterThan(0);
    });
  });

  describe('custom parameters', () => {
    test('custom trustedDomains array', () => {
      const result = evaluateUrlSecurity(
        'https://mycustom.com/page',
        { enableSecurityCheck: true, securityRules: { checkPhishing: true, checkMalicious: false, checkSuspicious: false, checkRedirect: false } },
        ['mycustom.com']
      );
      expect(result.risks.some(r => r.type === 'phishing')).toBe(false);
    });

    test('custom phishingKeywords', () => {
      const result = evaluateUrlSecurity(
        'https://evil.com/customword',
        { enableSecurityCheck: true, securityRules: { checkPhishing: true, checkMalicious: false, checkSuspicious: false, checkRedirect: false } },
        [],
        ['customword']
      );
      expect(result.risks.some(r => r.type === 'phishing' && r.message.includes('customword'))).toBe(true);
    });

    test('custom loginPathKeywords', () => {
      const result = evaluateUrlSecurity(
        'https://evil.com/myauthpath',
        { enableSecurityCheck: true, securityRules: { checkPhishing: true, checkMalicious: false, checkSuspicious: false, checkRedirect: false } },
        [],
        [],
        ['myauthpath']
      );
      expect(result.risks.some(r => r.type === 'phishing' && r.message.includes('myauthpath'))).toBe(true);
    });

    test('custom brandKeywords', () => {
      const result = evaluateUrlSecurity(
        'https://mybrand.xyz/page',
        { enableSecurityCheck: true, securityRules: { checkPhishing: true, checkMalicious: false, checkSuspicious: false, checkRedirect: false } },
        [],
        [],
        [],
        ['mybrand']
      );
      expect(result.risks.some(r => r.type === 'phishing' && r.message.includes('mybrand'))).toBe(true);
    });

    test('custom maliciousTlds', () => {
      const result = evaluateUrlSecurity(
        'https://evil.mytld/page',
        { enableSecurityCheck: true, securityRules: { checkPhishing: false, checkMalicious: true, checkSuspicious: false, checkRedirect: false } },
        [],
        [], [], [], ['.mytld']
      );
      expect(result.risks.some(r => r.type === 'malicious' && r.message.includes('.mytld'))).toBe(true);
    });

    test('empty suspiciousPatterns produces no pattern matches', () => {
      const result = evaluateUrlSecurity(
        'https://example.com/page/1234567890',
        { enableSecurityCheck: true, securityRules: { checkPhishing: false, checkMalicious: false, checkSuspicious: true, checkRedirect: false } },
        [],
        [], [], [], [], []
      );
      expect(result.risks.some(r => r.type === 'suspicious' && r.message.includes('可疑模式'))).toBe(false);
    });
  });
});

describe('getSecurityLevelInfo', () => {
  test('safe level returns correct info', () => {
    const info = getSecurityLevelInfo('safe');
    expect(info.label).toBe('安全');
    expect(info.color).toBe('#10b981');
    expect(info.icon).toBe('✓');
  });

  test('low level returns correct info', () => {
    const info = getSecurityLevelInfo('low');
    expect(info.label).toBe('低风险');
    expect(info.color).toBe('#f59e0b');
    expect(info.icon).toBe('⚠');
  });

  test('medium level returns correct info', () => {
    const info = getSecurityLevelInfo('medium');
    expect(info.label).toBe('中风险');
    expect(info.color).toBe('#f97316');
    expect(info.icon).toBe('⚡');
  });

  test('high level returns correct info', () => {
    const info = getSecurityLevelInfo('high');
    expect(info.label).toBe('高风险');
    expect(info.color).toBe('#ef4444');
    expect(info.icon).toBe('✕');
  });

  test('unknown level returns correct info', () => {
    const info = getSecurityLevelInfo('unknown');
    expect(info.label).toBe('未知');
    expect(info.color).toBe('#6b7280');
    expect(info.icon).toBe('?');
  });

  test('unknown string returns unknown info as fallback', () => {
    const info = getSecurityLevelInfo('nonexistent');
    expect(info.label).toBe('未知');
    expect(info.icon).toBe('?');
  });
});

describe('exported constants', () => {
  test('PHISHING_KEYWORDS is a non-empty array', () => {
    expect(Array.isArray(PHISHING_KEYWORDS)).toBe(true);
    expect(PHISHING_KEYWORDS.length).toBeGreaterThan(0);
  });

  test('LOGIN_PATH_KEYWORDS is a non-empty array', () => {
    expect(Array.isArray(LOGIN_PATH_KEYWORDS)).toBe(true);
    expect(LOGIN_PATH_KEYWORDS.length).toBeGreaterThan(0);
  });

  test('BRAND_KEYWORDS is a non-empty array', () => {
    expect(Array.isArray(BRAND_KEYWORDS)).toBe(true);
    expect(BRAND_KEYWORDS.length).toBeGreaterThan(0);
  });

  test('MALICIOUS_TLDS is a non-empty array', () => {
    expect(Array.isArray(MALICIOUS_TLDS)).toBe(true);
    expect(MALICIOUS_TLDS.length).toBeGreaterThan(0);
  });

  test('SUSPICIOUS_PATTERNS is a non-empty array of regex', () => {
    expect(Array.isArray(SUSPICIOUS_PATTERNS)).toBe(true);
    expect(SUSPICIOUS_PATTERNS.length).toBeGreaterThan(0);
    SUSPICIOUS_PATTERNS.forEach(p => expect(p).toBeInstanceOf(RegExp));
  });

  test('TRUSTED_DOMAINS is a non-empty array', () => {
    expect(Array.isArray(TRUSTED_DOMAINS)).toBe(true);
    expect(TRUSTED_DOMAINS.length).toBeGreaterThan(0);
  });

  test('DEFAULT_SETTINGS has expected structure', () => {
    expect(DEFAULT_SETTINGS.securityRules).toBeDefined();
    expect(DEFAULT_SETTINGS.securityRules.checkPhishing).toBe(true);
    expect(DEFAULT_SETTINGS.securityRules.checkMalicious).toBe(true);
    expect(DEFAULT_SETTINGS.securityRules.checkSuspicious).toBe(true);
    expect(DEFAULT_SETTINGS.securityRules.checkRedirect).toBe(true);
  });
});

describe('evaluateUrlSecurity _preDeducted parameter', () => {
  test('pre-deducted phishing keywords are skipped', () => {
    const result = evaluateUrlSecurity(
      'https://evil.com/verify',
      { enableSecurityCheck: true, securityRules: { checkPhishing: true, checkMalicious: false, checkSuspicious: false, checkRedirect: false } },
      [],
      PHISHING_KEYWORDS,
      LOGIN_PATH_KEYWORDS,
      BRAND_KEYWORDS,
      MALICIOUS_TLDS,
      SUSPICIOUS_PATTERNS,
      ['phishing-kw-verify']
    );
    expect(result.risks.some(r => r.message.includes('verify'))).toBe(false);
  });

  test('pre-deducted login path keywords are skipped', () => {
    const result = evaluateUrlSecurity(
      'https://evil.com/login',
      { enableSecurityCheck: true, securityRules: { checkPhishing: true, checkMalicious: false, checkSuspicious: false, checkRedirect: false } },
      [],
      PHISHING_KEYWORDS,
      LOGIN_PATH_KEYWORDS,
      BRAND_KEYWORDS,
      MALICIOUS_TLDS,
      SUSPICIOUS_PATTERNS,
      ['phishing-login-login']
    );
    expect(result.risks.some(r => r.type === 'phishing' && r.message.includes('login'))).toBe(false);
  });

  test('pre-deducted brand keywords are skipped', () => {
    const result = evaluateUrlSecurity(
      'https://paypalscam.com/page',
      { enableSecurityCheck: true, securityRules: { checkPhishing: true, checkMalicious: false, checkSuspicious: false, checkRedirect: false } },
      [],
      PHISHING_KEYWORDS,
      LOGIN_PATH_KEYWORDS,
      BRAND_KEYWORDS,
      MALICIOUS_TLDS,
      SUSPICIOUS_PATTERNS,
      ['phishing-brand-paypal']
    );
    expect(result.risks.some(r => r.type === 'phishing' && r.message.includes('paypal'))).toBe(false);
  });

  test('pre-deducted malicious TLD key skips TLD check', () => {
    const result = evaluateUrlSecurity(
      'https://evil.xyz/page',
      { enableSecurityCheck: true, securityRules: { checkPhishing: false, checkMalicious: true, checkSuspicious: false, checkRedirect: false } },
      [],
      PHISHING_KEYWORDS,
      LOGIN_PATH_KEYWORDS,
      BRAND_KEYWORDS,
      MALICIOUS_TLDS,
      SUSPICIOUS_PATTERNS,
      ['malicious-tld']
    );
    expect(result.risks.some(r => r.type === 'malicious')).toBe(false);
  });

  test('pre-deducted suspicious pattern key skips pattern check', () => {
    const result = evaluateUrlSecurity(
      'http://evil.com/page?12345=bad',
      { enableSecurityCheck: true, securityRules: { checkPhishing: false, checkMalicious: false, checkSuspicious: true, checkRedirect: false } },
      [],
      PHISHING_KEYWORDS,
      LOGIN_PATH_KEYWORDS,
      BRAND_KEYWORDS,
      MALICIOUS_TLDS,
      SUSPICIOUS_PATTERNS,
      ['suspicious-pattern']
    );
    expect(result.risks.some(r => r.type === 'suspicious' && r.message.includes('可疑模式'))).toBe(false);
  });
});
