'use strict';

const {
  getLinkType,
  normalizeSuffix,
  validateRegexPattern,
  safeRegexMatch,
  filterCompatibleActions,
  matchPreviewRule,
  TYPE_COMPATIBILITY_RULES
} = require('./modules/link-types');

describe('TYPE_COMPATIBILITY_RULES', () => {
  test('exports expected type keys', () => {
    expect(Object.keys(TYPE_COMPATIBILITY_RULES)).toEqual(
      expect.arrayContaining(['webpage', 'image', 'video', 'video-site', 'audio', 'audio-site'])
    );
  });

  test('each rule has the four compatibility flags', () => {
    for (const rule of Object.values(TYPE_COMPATIBILITY_RULES)) {
      expect(rule).toHaveProperty('supportsEmbed');
      expect(rule).toHaveProperty('supportsQuickRead');
      expect(rule).toHaveProperty('supportsSize');
      expect(rule).toHaveProperty('supportsDisableSecurity');
    }
  });
});

describe('getLinkType', () => {
  describe('invalid inputs', () => {
    test('null → unknown', () => {
      expect(getLinkType(null)).toBe('unknown');
    });

    test('undefined → unknown', () => {
      expect(getLinkType(undefined)).toBe('unknown');
    });

    test('non-string (number) → unknown', () => {
      expect(getLinkType(123)).toBe('unknown');
    });

    test('non-string (object) → unknown', () => {
      expect(getLinkType({})).toBe('unknown');
    });

    test('empty string → unknown', () => {
      expect(getLinkType('')).toBe('unknown');
    });

    test('whitespace-only string → unknown', () => {
      expect(getLinkType('   ')).toBe('unknown');
    });
  });

  describe('data URIs', () => {
    test('data:image/png;base64,... → image', () => {
      expect(getLinkType('data:image/png;base64,abc123')).toBe('image');
    });

    test('data:video/mp4;... → video', () => {
      expect(getLinkType('data:video/mp4;codecs=avc1,abc')).toBe('video');
    });

    test('data:audio/mpeg;... → audio', () => {
      expect(getLinkType('data:audio/mpeg;base64,abc')).toBe('audio');
    });

    test('data:text/html;... → webpage (non-media)', () => {
      expect(getLinkType('data:text/html;base64,abc')).toBe('webpage');
    });

    test('data:application/pdf;... → webpage', () => {
      expect(getLinkType('data:application/pdf;base64,abc')).toBe('webpage');
    });
  });

  describe('blob URIs', () => {
    test('blob:https://example.com/uuid → webpage', () => {
      expect(getLinkType('blob:https://example.com/uuid-123')).toBe('webpage');
    });
  });

  describe('special schemes', () => {
    test('#anchor → unknown', () => {
      expect(getLinkType('#section')).toBe('unknown');
    });

    test('javascript:void(0) → unknown', () => {
      expect(getLinkType('javascript:void(0)')).toBe('unknown');
    });

    test('mailto:user@example.com → unknown', () => {
      expect(getLinkType('mailto:user@example.com')).toBe('unknown');
    });

    test('tel:+1234567890 → unknown', () => {
      expect(getLinkType('tel:+1234567890')).toBe('unknown');
    });

    test('sms:+1234567890 → unknown', () => {
      expect(getLinkType('sms:+1234567890')).toBe('unknown');
    });

    test('ftp://example.com/file → unknown', () => {
      expect(getLinkType('ftp://example.com/file')).toBe('unknown');
    });

    test('file:///path/to/file → unknown', () => {
      expect(getLinkType('file:///path/to/file')).toBe('unknown');
    });
  });

  describe('protocol handling', () => {
    test('http:// URL processes normally', () => {
      expect(getLinkType('http://example.com/page')).toBe('webpage');
    });

    test('https:// URL processes normally', () => {
      expect(getLinkType('https://example.com/page')).toBe('webpage');
    });

    test('ws:// URL → unknown (non-http/https)', () => {
      expect(getLinkType('ws://example.com/socket')).toBe('unknown');
    });

    test('wss:// URL → unknown', () => {
      expect(getLinkType('wss://example.com/socket')).toBe('unknown');
    });
  });

  describe('image extensions', () => {
    const imageExts = [
      '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico',
      '.tiff', '.tif', '.avif', '.heic', '.heif', '.raw', '.psd',
      '.jp2', '.j2k', '.jxr', '.hdp', '.wdp'
    ];
    test.each(imageExts)('extension %s → image', (ext) => {
      expect(getLinkType(`https://example.com/img/file${ext}`)).toBe('image');
    });
  });

  describe('video extensions', () => {
    const videoExts = [
      '.mp4', '.webm', '.mov', '.avi', '.mkv', '.flv', '.wmv',
      '.m4v', '.3gp', '.3g2', '.ts', '.mts', '.m2ts', '.vob',
      '.ogv', '.dv', '.rm', '.rmvb', '.asf'
    ];
    test.each(videoExts)('extension %s → video', (ext) => {
      expect(getLinkType(`https://example.com/vid/file${ext}`)).toBe('video');
    });
  });

  describe('audio extensions', () => {
    const audioExts = [
      '.mp3', '.wav', '.flac', '.aac', '.m4a', '.wma',
      '.opus', '.aiff', '.aif', '.ape', '.alac', '.wv',
      '.oga', '.midi', '.mid', '.amr', '.ac3', '.dts'
    ];
    test.each(audioExts)('extension %s → audio', (ext) => {
      expect(getLinkType(`https://example.com/audio/file${ext}`)).toBe('audio');
    });
  });

  describe('.ogg context-based detection', () => {
    test('.ogg with "video" in path → video', () => {
      expect(getLinkType('https://example.com/video/clip.ogg')).toBe('video');
    });

    test('.ogg with "movie" in path → video', () => {
      expect(getLinkType('https://example.com/movie/clip.ogg')).toBe('video');
    });

    test('.ogg with "film" in path → video', () => {
      expect(getLinkType('https://example.com/film/clip.ogg')).toBe('video');
    });

    test('.ogg with "audio" in path → audio', () => {
      expect(getLinkType('https://example.com/audio/track.ogg')).toBe('audio');
    });

    test('.ogg with "music" in path → audio', () => {
      expect(getLinkType('https://example.com/music/track.ogg')).toBe('audio');
    });

    test('.ogg with "song" in path → audio', () => {
      expect(getLinkType('https://example.com/song/track.ogg')).toBe('audio');
    });

    test('.ogg with no media keyword → audio (default)', () => {
      expect(getLinkType('https://example.com/media/file.ogg')).toBe('audio');
    });
  });

  describe('.ogx context-based detection', () => {
    test('.ogx with video keywords → video', () => {
      expect(getLinkType('https://example.com/video/clip.ogx')).toBe('video');
    });

    test('.ogx default → audio', () => {
      expect(getLinkType('https://example.com/media/clip.ogx')).toBe('audio');
    });
  });

  describe('video sites', () => {
    const nonExactVideoSites = [
      ['youtube.com', 'https://youtube.com/watch?v=abc'],
      ['www.youtube.com', 'https://www.youtube.com/watch?v=abc'],
      ['bilibili.com', 'https://bilibili.com/video/BV123'],
      ['www.bilibili.com', 'https://www.bilibili.com/video/BV123'],
      ['vimeo.com', 'https://vimeo.com/12345'],
      ['dailymotion.com', 'https://dailymotion.com/video/x123'],
      ['youku.com', 'https://youku.com/v/123'],
      ['iqiyi.com', 'https://iqiyi.com/v_123.html'],
      ['iq.com', 'https://iq.com/v/123'],
      ['tudou.com', 'https://tudou.com/v/123'],
      ['mgtv.com', 'https://mgtv.com/b/123.html'],
      ['le.com', 'https://le.com/v/123'],
      ['pptv.com', 'https://pptv.com/v/123'],
      ['douyin.com', 'https://douyin.com/video/123'],
      ['iesdouyin.com', 'https://iesdouyin.com/video/123'],
      ['tiktok.com', 'https://tiktok.com/@user/video/123'],
      ['twitch.tv', 'https://twitch.tv/streamer'],
      ['netflix.com', 'https://netflix.com/watch/123'],
      ['hulu.com', 'https://hulu.com/watch/123'],
      ['primevideo.com', 'https://primevideo.com/detail/123'],
      ['disneyplus.com', 'https://disneyplus.com/video/123'],
      ['kuaishou.com', 'https://kuaishou.com/short/123'],
    ];

    test.each(nonExactVideoSites)('domain %s → video-site', (_name, url) => {
      expect(getLinkType(url)).toBe('video-site');
    });

    test('youtu.be (exact) → video-site', () => {
      expect(getLinkType('https://youtu.be/abc123')).toBe('video-site');
    });

    test('b23.tv (exact) → video-site', () => {
      expect(getLinkType('https://b23.tv/abc123')).toBe('video-site');
    });

    test('dai.ly (exact) → video-site', () => {
      expect(getLinkType('https://dai.ly/abc123')).toBe('video-site');
    });

    test('cdn.jsdelivr.net/gh/... (pathCheck) → video-site', () => {
      expect(getLinkType('https://cdn.jsdelivr.net/gh/user/repo/file')).toBe('video-site');
    });

    test('cdn.jsdelivr.net/other/... (pathCheck miss) → not video-site', () => {
      expect(getLinkType('https://cdn.jsdelivr.net/npm/package/file')).not.toBe('video-site');
    });

    test('subdomain of exact video site (sub.youtu.be) → video-site', () => {
      expect(getLinkType('https://sub.youtu.be/abc123')).toBe('video-site');
    });
  });

  describe('audio sites', () => {
    const exactAudioSites = [
      ['music.163.com', 'https://music.163.com/song/123'],
      ['y.qq.com', 'https://y.qq.com/song/123'],
      ['music.qq.com', 'https://music.qq.com/song/123'],
      ['open.spotify.com', 'https://open.spotify.com/track/123'],
      ['music.apple.com', 'https://music.apple.com/album/123'],
      ['itunes.apple.com', 'https://itunes.apple.com/album/123'],
      ['music.126.net', 'https://music.126.net/song/123'],
    ];

    test.each(exactAudioSites)('exact domain %s → audio-site', (_name, url) => {
      expect(getLinkType(url)).toBe('audio-site');
    });

    const nonExactAudioSites = [
      ['kuwo.cn', 'https://kuwo.cn/song/123'],
      ['kugou.com', 'https://kugou.com/song/123'],
      ['xiami.com', 'https://xiami.com/song/123'],
      ['spotify.com', 'https://spotify.com/track/123'],
      ['soundcloud.com', 'https://soundcloud.com/user/track'],
      ['pandora.com', 'https://pandora.com/track/123'],
      ['deezer.com', 'https://deezer.com/track/123'],
      ['tidal.com', 'https://tidal.com/track/123'],
      ['bandcamp.com', 'https://bandcamp.com/track/123'],
      ['mixcloud.com', 'https://mixcloud.com/user/track'],
    ];

    test.each(nonExactAudioSites)('non-exact domain %s → audio-site', (_name, url) => {
      expect(getLinkType(url)).toBe('audio-site');
    });

    test('subdomain of non-exact audio site (www.spotify.com) → audio-site', () => {
      expect(getLinkType('https://www.spotify.com/track/123')).toBe('audio-site');
    });

    test('subdomain of exact audio site (sub.music.163.com) → audio-site', () => {
      expect(getLinkType('https://sub.music.163.com/song/123')).toBe('audio-site');
    });

    test('exact audio site with exact hostname match (music.163.com) → audio-site', () => {
      expect(getLinkType('https://music.163.com/song/123')).toBe('audio-site');
    });
  });

  describe('regular webpage', () => {
    test('generic https URL → webpage', () => {
      expect(getLinkType('https://example.com/page')).toBe('webpage');
    });
  });

  describe('invalid URL that throws', () => {
    test('malformed URL → unknown', () => {
      expect(getLinkType('http://[invalid-url')).toBe('unknown');
    });
  });

  describe('baseUrl parameter', () => {
    test('relative URL resolved with baseUrl', () => {
      expect(getLinkType('/path/to/image.png', 'https://cdn.example.com')).toBe('image');
    });
  });

  describe('customSites parameter', () => {
    test('exact:true site with pathCheck that matches returns video-site', () => {
      const sites = [{ domain: 'short.video', exact: true, pathCheck: '/embed/' }];
      expect(getLinkType('https://short.video/embed/abc', null, sites)).toBe('video-site');
    });

    test('exact:true site with pathCheck that does not match continues to next', () => {
      const sites = [
        { domain: 'short.video', exact: true, pathCheck: '/embed/' },
        { domain: 'other.com', exact: false }
      ];
      expect(getLinkType('https://short.video/watch/abc', null, sites)).toBe('webpage');
    });

    test('exact:true site with pathCheck match on subdomain', () => {
      const sites = [{ domain: 'short.video', exact: true, pathCheck: '/e/' }];
      expect(getLinkType('https://sub.short.video/e/xyz', null, sites)).toBe('video-site');
    });
  });
});

describe('normalizeSuffix', () => {
  test('null → empty string', () => {
    expect(normalizeSuffix(null)).toBe('');
  });

  test('undefined → empty string', () => {
    expect(normalizeSuffix(undefined)).toBe('');
  });

  test('empty string → empty string', () => {
    expect(normalizeSuffix('')).toBe('');
  });

  test('already has dot → .pdf', () => {
    expect(normalizeSuffix('.pdf')).toBe('.pdf');
  });

  test('no dot → adds dot: pdf → .pdf', () => {
    expect(normalizeSuffix('pdf')).toBe('.pdf');
  });

  test('needs trim: " pdf " → .pdf', () => {
    expect(normalizeSuffix(' pdf ')).toBe('.pdf');
  });

  test('just dot → .', () => {
    expect(normalizeSuffix('.')).toBe('.');
  });
});

describe('validateRegexPattern', () => {
  test('empty string → invalid', () => {
    const result = validateRegexPattern('');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('null → invalid', () => {
    const result = validateRegexPattern(null);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('undefined → invalid', () => {
    const result = validateRegexPattern(undefined);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('length > 200 → invalid', () => {
    const longPattern = 'a'.repeat(201);
    const result = validateRegexPattern(longPattern);
    expect(result.valid).toBe(false);
  });

  test('ReDoS pattern (a+)+ → invalid', () => {
    const result = validateRegexPattern('(a+)+');
    expect(result.valid).toBe(false);
  });

  test('too many groups (>10) → invalid', () => {
    const groups = '(a)'.repeat(11);
    const result = validateRegexPattern(groups);
    expect(result.valid).toBe(false);
  });

  test('too many character sets (>10) → invalid', () => {
    const sets = '[a]'.repeat(11);
    const result = validateRegexPattern(sets);
    expect(result.valid).toBe(false);
  });

  test('valid pattern → valid', () => {
    const result = validateRegexPattern('^https://example\\.com');
    expect(result.valid).toBe(true);
  });

  test('invalid regex syntax → invalid', () => {
    const result = validateRegexPattern('[invalid');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('pattern at exactly 200 chars → valid', () => {
    const pattern = 'a'.repeat(200);
    const result = validateRegexPattern(pattern);
    expect(result.valid).toBe(true);
  });

  test('pattern at exactly 10 groups → valid', () => {
    const groups = '(a)'.repeat(10);
    const result = validateRegexPattern(groups);
    expect(result.valid).toBe(true);
  });

  test('pattern at exactly 10 character sets → valid', () => {
    const sets = '[a]'.repeat(10);
    const result = validateRegexPattern(sets);
    expect(result.valid).toBe(true);
  });
});

describe('safeRegexMatch', () => {
  test('invalid pattern → false', () => {
    expect(safeRegexMatch('', 'test')).toBe(false);
  });

  test('matching pattern → true', () => {
    expect(safeRegexMatch('hello', 'hello world')).toBe(true);
  });

  test('non-matching pattern → false', () => {
    expect(safeRegexMatch('xyz', 'hello world')).toBe(false);
  });

  test('with flags works correctly', () => {
    expect(safeRegexMatch('HELLO', 'hello world', 'i')).toBe(true);
  });

  test('valid pattern that matches → true', () => {
    expect(safeRegexMatch('\\d+', 'abc123')).toBe(true);
  });

  test('null pattern → false', () => {
    expect(safeRegexMatch(null, 'test')).toBe(false);
  });

  test('invalid flags cause new RegExp to throw → false', () => {
    expect(safeRegexMatch('test', 'hello', 'z')).toBe(false);
  });

  test('regex test() throwing → returns false', () => {
    const origTest = RegExp.prototype.test;
    let callCount = 0;
    RegExp.prototype.test = function () {
      callCount++;
      if (callCount > 1) {
        RegExp.prototype.test = origTest;
        throw new Error('boom');
      }
      return origTest.call(this, ...arguments);
    };
    const result = safeRegexMatch('test', 'hello');
    RegExp.prototype.test = origTest;
    expect(result).toBe(false);
  });

  test('regex execution timeout (done=true) → returns false', () => {
    jest.useFakeTimers();
    const origTest = RegExp.prototype.test;
    let callCount = 0;
    RegExp.prototype.test = function () {
      callCount++;
      if (callCount > 1) {
        jest.advanceTimersByTime(100);
        RegExp.prototype.test = origTest;
        return true;
      }
      return origTest.call(this, ...arguments);
    };
    const result = safeRegexMatch('test', 'hello');
    RegExp.prototype.test = origTest;
    jest.useRealTimers();
    expect(result).toBe(false);
  });

  test('regex execution slow (>30ms) → returns false', () => {
    const origNow = Date.now;
    const realStart = origNow.call(Date);
    let callCount = 0;
    Date.now = function () {
      callCount++;
      if (callCount === 1) return realStart;
      if (callCount >= 2) return realStart + 100;
      return origNow.call(Date);
    };
    const result = safeRegexMatch('test', 'hello');
    Date.now = origNow;
    expect(result).toBe(false);
  });
});

describe('filterCompatibleActions', () => {
  test('null rule → null', () => {
    expect(filterCompatibleActions(null)).toBeNull();
  });

  test('rule without actions → null', () => {
    expect(filterCompatibleActions({})).toBeNull();
  });

  test('rule with actions but no forceType → actions object', () => {
    const rule = { actions: { autoEmbed: true, autoQuickRead: true } };
    const result = filterCompatibleActions(rule);
    expect(result).toEqual({ autoEmbed: true, autoQuickRead: true });
  });

  test('forceType="image" (no embed, no quickRead) → autoEmbed=false, autoQuickRead=false', () => {
    const rule = {
      actions: {
        forceType: 'image',
        autoEmbed: true,
        autoQuickRead: true,
        previewWidth: 300,
        previewHeight: 200,
        disableSecurityCheck: true
      }
    };
    const result = filterCompatibleActions(rule);
    expect(result.autoEmbed).toBe(false);
    expect(result.autoQuickRead).toBe(false);
    expect(result.previewWidth).toBe(300);
    expect(result.previewHeight).toBe(200);
    expect(result.disableSecurityCheck).toBe(true);
  });

  test('forceType="video-site" (has embed) → keeps autoEmbed', () => {
    const rule = {
      actions: {
        forceType: 'video-site',
        autoEmbed: true,
        autoQuickRead: true
      }
    };
    const result = filterCompatibleActions(rule);
    expect(result.autoEmbed).toBe(true);
    expect(result.autoQuickRead).toBe(false);
  });

  test('forceType="unknown-type" (no compat rule) → returns original actions', () => {
    const rule = {
      actions: {
        forceType: 'unknown-type',
        autoEmbed: true,
        autoQuickRead: true
      }
    };
    const result = filterCompatibleActions(rule);
    expect(result).toEqual(rule.actions);
  });

  test('forceType="webpage" (all supports) → keeps all features', () => {
    const rule = {
      actions: {
        forceType: 'webpage',
        autoEmbed: true,
        autoQuickRead: true,
        disableSecurityCheck: true
      }
    };
    const result = filterCompatibleActions(rule);
    expect(result.autoEmbed).toBe(true);
    expect(result.autoQuickRead).toBe(true);
    expect(result.disableSecurityCheck).toBe(true);
  });

  test('forceType="audio-site" (supports embed, not quickRead) → autoQuickRead=false', () => {
    const rule = {
      actions: {
        forceType: 'audio-site',
        autoEmbed: true,
        autoQuickRead: true
      }
    };
    const result = filterCompatibleActions(rule);
    expect(result.autoEmbed).toBe(true);
    expect(result.autoQuickRead).toBe(false);
  });

  test('forceType with supportsSize=false → sets dimensions to null', () => {
    const originalCompat = TYPE_COMPATIBILITY_RULES['image'];
    TYPE_COMPATIBILITY_RULES['image'] = {
      ...originalCompat,
      supportsSize: false
    };
    const rule = {
      actions: {
        forceType: 'image',
        previewWidth: 300,
        previewHeight: 200
      }
    };
    const result = filterCompatibleActions(rule);
    expect(result.previewWidth).toBeNull();
    expect(result.previewHeight).toBeNull();
    TYPE_COMPATIBILITY_RULES['image'] = originalCompat;
  });

  test('forceType with supportsDisableSecurity=false → sets disableSecurityCheck to false', () => {
    const originalCompat = TYPE_COMPATIBILITY_RULES['image'];
    TYPE_COMPATIBILITY_RULES['image'] = {
      ...originalCompat,
      supportsDisableSecurity: false
    };
    const rule = {
      actions: {
        forceType: 'image',
        disableSecurityCheck: true
      }
    };
    const result = filterCompatibleActions(rule);
    expect(result.disableSecurityCheck).toBe(false);
    TYPE_COMPATIBILITY_RULES['image'] = originalCompat;
  });
});

describe('matchPreviewRule', () => {
  test('empty rules → null', () => {
    expect(matchPreviewRule('https://example.com', { previewRules: [] })).toBeNull();
  });

  test('null url → null', () => {
    expect(matchPreviewRule(null, { previewRules: [{}] })).toBeNull();
  });

  test('domain match → matched rule', () => {
    const rules = [{
      enabled: true,
      matchType: 'domain',
      matchValue: 'example.com',
      priority: 1,
      actions: { forceType: 'webpage' }
    }];
    const result = matchPreviewRule('https://example.com/page', { previewRules: rules });
    expect(result).not.toBeNull();
    expect(result.matchValue).toBe('example.com');
  });

  test('subdomain match → matched rule', () => {
    const rules = [{
      enabled: true,
      matchType: 'domain',
      matchValue: 'example.com',
      priority: 1,
      actions: {}
    }];
    const result = matchPreviewRule('https://sub.example.com/page', { previewRules: rules });
    expect(result).not.toBeNull();
    expect(result.matchValue).toBe('example.com');
  });

  test('suffix match → matched rule', () => {
    const rules = [{
      enabled: true,
      matchType: 'suffix',
      matchValue: '.pdf',
      priority: 1,
      actions: {}
    }];
    const result = matchPreviewRule('https://example.com/doc.pdf', { previewRules: rules });
    expect(result).not.toBeNull();
  });

  test('suffix with empty matchValue → no match', () => {
    const rules = [{
      enabled: true,
      matchType: 'suffix',
      matchValue: '',
      priority: 1,
      actions: {}
    }];
    const result = matchPreviewRule('https://example.com/doc.pdf', { previewRules: rules });
    expect(result).toBeNull();
  });

  test('suffix with "." matchValue → no match', () => {
    const rules = [{
      enabled: true,
      matchType: 'suffix',
      matchValue: '.',
      priority: 1,
      actions: {}
    }];
    const result = matchPreviewRule('https://example.com/doc.pdf', { previewRules: rules });
    expect(result).toBeNull();
  });

  test('suffix with invalid chars (/) → no match', () => {
    const rules = [{
      enabled: true,
      matchType: 'suffix',
      matchValue: '/path',
      priority: 1,
      actions: {}
    }];
    const result = matchPreviewRule('https://example.com/path', { previewRules: rules });
    expect(result).toBeNull();
  });

  test('suffix with invalid chars (?) → no match', () => {
    const rules = [{
      enabled: true,
      matchType: 'suffix',
      matchValue: '?foo',
      priority: 1,
      actions: {}
    }];
    const result = matchPreviewRule('https://example.com?foo', { previewRules: rules });
    expect(result).toBeNull();
  });

  test('suffix with invalid chars (#) → no match', () => {
    const rules = [{
      enabled: true,
      matchType: 'suffix',
      matchValue: '#bar',
      priority: 1,
      actions: {}
    }];
    const result = matchPreviewRule('https://example.com#bar', { previewRules: rules });
    expect(result).toBeNull();
  });

  test('suffix with invalid chars (&) → no match', () => {
    const rules = [{
      enabled: true,
      matchType: 'suffix',
      matchValue: '&x',
      priority: 1,
      actions: {}
    }];
    const result = matchPreviewRule('https://example.com?x=1&x=2', { previewRules: rules });
    expect(result).toBeNull();
  });

  test('suffix with invalid chars (=) → no match', () => {
    const rules = [{
      enabled: true,
      matchType: 'suffix',
      matchValue: '=val',
      priority: 1,
      actions: {}
    }];
    const result = matchPreviewRule('https://example.com?key=val', { previewRules: rules });
    expect(result).toBeNull();
  });

  test('keyword match → matched rule', () => {
    const rules = [{
      enabled: true,
      matchType: 'keyword',
      matchValue: 'watch',
      priority: 1,
      actions: {}
    }];
    const result = matchPreviewRule('https://example.com/watch?v=abc', { previewRules: rules });
    expect(result).not.toBeNull();
  });

  test('regex match → matched rule', () => {
    const rules = [{
      enabled: true,
      matchType: 'regex',
      matchValue: 'example\\.(com|org)',
      priority: 1,
      actions: {}
    }];
    const result = matchPreviewRule('https://example.com/page', { previewRules: rules });
    expect(result).not.toBeNull();
  });

  test('case insensitive match (default)', () => {
    const rules = [{
      enabled: true,
      matchType: 'domain',
      matchValue: 'example.com',
      priority: 1,
      actions: {}
    }];
    const result = matchPreviewRule('https://EXAMPLE.COM/page', { previewRules: rules });
    expect(result).not.toBeNull();
  });

  test('case sensitive match', () => {
    const rules = [{
      enabled: true,
      matchType: 'keyword',
      matchValue: 'Watch',
      caseSensitive: true,
      priority: 1,
      actions: {}
    }];
    const lowerResult = matchPreviewRule('https://example.com/watch', { previewRules: rules });
    expect(lowerResult).toBeNull();

    const matchResult = matchPreviewRule('https://example.com/Watch', { previewRules: rules });
    expect(matchResult).not.toBeNull();
  });

  test('default matchType → no match', () => {
    const rules = [{
      enabled: true,
      matchType: 'unknown_type',
      matchValue: 'example.com',
      priority: 1,
      actions: {}
    }];
    const result = matchPreviewRule('https://example.com/page', { previewRules: rules });
    expect(result).toBeNull();
  });

  test('priority sorting (higher priority wins)', () => {
    const rules = [
      {
        enabled: true,
        matchType: 'domain',
        matchValue: 'example.com',
        priority: 1,
        actions: { forceType: 'webpage' }
      },
      {
        enabled: true,
        matchType: 'domain',
        matchValue: 'example.com',
        priority: 10,
        actions: { forceType: 'video-site' }
      }
    ];
    const result = matchPreviewRule('https://example.com/page', { previewRules: rules });
    expect(result).not.toBeNull();
    expect(result.actions.forceType).toBe('video-site');
  });

  test('disabled rules skipped', () => {
    const rules = [{
      enabled: false,
      matchType: 'domain',
      matchValue: 'example.com',
      priority: 1,
      actions: {}
    }];
    const result = matchPreviewRule('https://example.com/page', { previewRules: rules });
    expect(result).toBeNull();
  });

  test('invalid URL → null', () => {
    const rules = [{
      enabled: true,
      matchType: 'domain',
      matchValue: 'example.com',
      priority: 1,
      actions: {}
    }];
    const result = matchPreviewRule('not-a-url', { previewRules: rules });
    expect(result).toBeNull();
  });

  test('no deps provided (uses defaults)', () => {
    const result = matchPreviewRule('https://example.com/page');
    expect(result).toBeNull();
  });

  test('rule without matchValue is skipped', () => {
    const rules = [{
      enabled: true,
      matchType: 'domain',
      matchValue: null,
      priority: 1,
      actions: {}
    }];
    const result = matchPreviewRule('https://example.com/page', { previewRules: rules });
    expect(result).toBeNull();
  });

  test('returns rule with filtered actions', () => {
    const rules = [{
      enabled: true,
      matchType: 'domain',
      matchValue: 'example.com',
      priority: 1,
      actions: { forceType: 'image', autoEmbed: true, autoQuickRead: true }
    }];
    const result = matchPreviewRule('https://example.com/page', { previewRules: rules });
    expect(result).not.toBeNull();
    expect(result.actions.autoEmbed).toBe(false);
    expect(result.actions.autoQuickRead).toBe(false);
  });

  test('custom normalizeSuffix dependency is used', () => {
    const customNormalize = jest.fn(() => '.pdf');
    const rules = [{
      enabled: true,
      matchType: 'suffix',
      matchValue: 'pdf',
      priority: 1,
      actions: {}
    }];
    matchPreviewRule('https://example.com/doc.pdf', {
      previewRules: rules,
      normalizeSuffix: customNormalize
    });
    expect(customNormalize).toHaveBeenCalledWith('pdf');
  });

  test('custom safeRegexMatch dependency is used', () => {
    const customSafeRegex = jest.fn(() => true);
    const rules = [{
      enabled: true,
      matchType: 'regex',
      matchValue: 'test',
      priority: 1,
      actions: {}
    }];
    matchPreviewRule('https://example.com/page', {
      previewRules: rules,
      safeRegexMatch: customSafeRegex
    });
    expect(customSafeRegex).toHaveBeenCalled();
  });

  test('custom filterCompatibleActions dependency is used', () => {
    const customFilter = jest.fn(() => ({ filtered: true }));
    const rules = [{
      enabled: true,
      matchType: 'domain',
      matchValue: 'example.com',
      priority: 1,
      actions: { forceType: 'webpage' }
    }];
    const result = matchPreviewRule('https://example.com/page', {
      previewRules: rules,
      filterCompatibleActions: customFilter
    });
    expect(customFilter).toHaveBeenCalled();
    expect(result.actions).toEqual({ filtered: true });
  });

  test('suffix with URL ending match (not just pathname)', () => {
    const rules = [{
      enabled: true,
      matchType: 'suffix',
      matchValue: '.html',
      priority: 1,
      actions: {}
    }];
    const result = matchPreviewRule('https://example.com/page.html', { previewRules: rules });
    expect(result).not.toBeNull();
  });

  test('suffix match where full URL ends with suffix but pathname does not', () => {
    const rules = [{
      enabled: true,
      matchType: 'suffix',
      matchValue: 'com',
      priority: 1,
      actions: {}
    }];
    const result = matchPreviewRule('https://example.com', { previewRules: rules });
    expect(result).not.toBeNull();
  });

  test('keyword case insensitive (default)', () => {
    const rules = [{
      enabled: true,
      matchType: 'keyword',
      matchValue: 'WATCH',
      priority: 1,
      actions: {}
    }];
    const result = matchPreviewRule('https://example.com/watch?v=abc', { previewRules: rules });
    expect(result).not.toBeNull();
  });

  test('regex case insensitive by default', () => {
    const rules = [{
      enabled: true,
      matchType: 'regex',
      matchValue: 'EXAMPLE',
      priority: 1,
      actions: {}
    }];
    const result = matchPreviewRule('https://example.com/page', { previewRules: rules });
    expect(result).not.toBeNull();
  });

  test('regex case sensitive when caseSensitive=true', () => {
    const rules = [{
      enabled: true,
      matchType: 'regex',
      matchValue: 'EXAMPLE',
      caseSensitive: true,
      priority: 1,
      actions: {}
    }];
    const result = matchPreviewRule('https://example.com/page', { previewRules: rules });
    expect(result).toBeNull();
  });

  test('priority defaults to 0 when not specified', () => {
    const rules = [
      {
        enabled: true,
        matchType: 'domain',
        matchValue: 'b.com',
        priority: 5,
        actions: {}
      },
      {
        enabled: true,
        matchType: 'domain',
        matchValue: 'a.com',
        actions: {}
      }
    ];
    const result = matchPreviewRule('https://a.com/page', { previewRules: rules });
    expect(result).not.toBeNull();
    expect(result.matchValue).toBe('a.com');
  });

  test('both rules missing priority → sorts by default 0', () => {
    const rules = [
      {
        enabled: true,
        matchType: 'domain',
        matchValue: 'first.com',
        actions: {}
      },
      {
        enabled: true,
        matchType: 'domain',
        matchValue: 'second.com',
        actions: {}
      }
    ];
    const result = matchPreviewRule('https://second.com/page', { previewRules: rules });
    expect(result).not.toBeNull();
  });

  test('previewRules as undefined in deps → null', () => {
    const result = matchPreviewRule('https://example.com/page', {});
    expect(result).toBeNull();
  });
});
