const {
  CACHE_TIERS,
  detectCacheTier,
  extractReadableContent,
  extractHeadings,
  extractKeywords,
  calculateReadingTime,
  generateSummary,
  decodeHtmlEntities,
  resolveUrl,
  extractMetaTags,
  getVideoEmbedUrl,
  TYPE_COMPATIBILITY,
  normalizeSuffix,
  validateRegexPattern,
  safeRegexMatch,
  filterCompatibleActions,
  matchRuleForUrl,
  processHtmlForSnapshot
} = require('./modules/meta-extract');

describe('CACHE_TIERS', () => {
  test('has expected tier keys', () => {
    expect(CACHE_TIERS).toHaveProperty('webpage');
    expect(CACHE_TIERS).toHaveProperty('image');
    expect(CACHE_TIERS).toHaveProperty('video');
    expect(CACHE_TIERS).toHaveProperty('video-site');
    expect(CACHE_TIERS).toHaveProperty('audio');
    expect(CACHE_TIERS).toHaveProperty('audio-site');
    expect(CACHE_TIERS).toHaveProperty('snapshot');
    expect(CACHE_TIERS).toHaveProperty('default');
  });

  test('each tier has ttl and maxSize', () => {
    for (const key of Object.keys(CACHE_TIERS)) {
      expect(CACHE_TIERS[key]).toHaveProperty('ttl');
      expect(CACHE_TIERS[key]).toHaveProperty('maxSize');
    }
  });
});

describe('detectCacheTier', () => {
  test('snapshot prefix returns snapshot', () => {
    expect(detectCacheTier('snapshot:https://example.com')).toBe('snapshot');
  });

  test('image URL .jpg returns image', () => {
    expect(detectCacheTier('https://example.com/photo.jpg')).toBe('image');
  });

  test('image URL .png returns image', () => {
    expect(detectCacheTier('https://example.com/icon.png')).toBe('image');
  });

  test('video URL .mp4 returns video', () => {
    expect(detectCacheTier('https://example.com/clip.mp4')).toBe('video');
  });

  test('audio URL .mp3 returns audio', () => {
    expect(detectCacheTier('https://example.com/song.mp3')).toBe('audio');
  });

  test('YouTube URL returns video-site', () => {
    expect(detectCacheTier('https://www.youtube.com/watch?v=abc')).toBe('video-site');
  });

  test('Spotify URL returns audio-site', () => {
    expect(detectCacheTier('https://open.spotify.com/track/123')).toBe('audio-site');
  });

  test('regular webpage returns webpage', () => {
    expect(detectCacheTier('https://example.com/page')).toBe('webpage');
  });

  test('invalid URL returns webpage', () => {
    expect(detectCacheTier('not-a-url')).toBe('webpage');
  });

  test('subdomain of video site returns video-site', () => {
    expect(detectCacheTier('https://m.youtube.com/watch?v=abc')).toBe('video-site');
  });

  test('subdomain of audio site returns audio-site', () => {
    expect(detectCacheTier('https://open.spotify.com/album/123')).toBe('audio-site');
  });

  test('URL with non-media extension (e.g. .pdf) returns webpage', () => {
    expect(detectCacheTier('https://example.com/doc.pdf')).toBe('webpage');
  });

  test('URL with .wav extension returns audio', () => {
    expect(detectCacheTier('https://example.com/sound.wav')).toBe('audio');
  });
});

describe('extractReadableContent', () => {
  test('strips script, style, nav, header, footer, aside, form, noscript tags', () => {
    const html = `<html><body>
      <script>var x = 1;</script>
      <style>.x{color:red}</style>
      <nav><a>link</a></nav>
      <header><p>header text that is long enough</p></header>
      <footer><p>footer text that is long enough</p></footer>
      <aside><p>aside text that is long enough</p></aside>
      <form><p>form text that is long enough</p></form>
      <noscript>no js</noscript>
      <p>This is the main paragraph content that should remain after all the stripping operations are complete and it is longer than twenty characters.</p>
    </body></html>`;
    const result = extractReadableContent(html, 'https://example.com');
    expect(result.text).not.toContain('var x');
    expect(result.text).not.toContain('color:red');
    expect(result.text).not.toContain('header text');
    expect(result.text).not.toContain('footer text');
    expect(result.text).not.toContain('aside text');
    expect(result.text).not.toContain('form text');
  });

  test('extracts body content when <body> tag present', () => {
    const html = `<html><head><title>Test</title></head><body><p>This is a paragraph inside the body element that is definitely long enough to pass the threshold check.</p></body></html>`;
    const result = extractReadableContent(html, 'https://example.com');
    expect(result.text).toContain('paragraph inside the body');
  });

  test('processes full content when no <body> tag', () => {
    const html = `<p>This is a paragraph without a body tag that is definitely long enough to pass the threshold check for readability.</p>`;
    const result = extractReadableContent(html, 'https://example.com');
    expect(result.text).toContain('paragraph without a body tag');
  });

  test('paragraphs >20 chars are collected', () => {
    const html = `<p>This paragraph is definitely longer than twenty characters and should be collected.</p>`;
    const result = extractReadableContent(html, 'https://example.com');
    expect(result.paragraphs.length).toBe(1);
  });

  test('paragraphs <=20 chars are ignored', () => {
    const html = `<p>Short text</p>`;
    const result = extractReadableContent(html, 'https://example.com');
    expect(result.paragraphs.length).toBe(0);
  });

  test('mainText < 200 chars falls back to full textContent', () => {
    const html = `<html><body><p>Short only</p><div>Lots of other content here that is not in a paragraph tag but will be picked up by the fallback text content extraction method when the paragraph text is too short to exceed two hundred characters threshold</div></body></html>`;
    const result = extractReadableContent(html, 'https://example.com');
    expect(result.text).toContain('other content here');
  });

  test('mainText >= 200 chars uses paragraphs', () => {
    const longText1 = 'A'.repeat(101);
    const longText2 = 'B'.repeat(101);
    const html = `<p>${longText1}</p><p>${longText2}</p>`;
    const result = extractReadableContent(html, 'https://example.com');
    expect(result.paragraphs.length).toBe(2);
    expect(result.text).toContain(longText1);
    expect(result.text).toContain(longText2);
  });
});

describe('extractHeadings', () => {
  test('extracts headings with level and text', () => {
    const html = '<h1>Title</h1><h2>Subtitle</h2>';
    const headings = extractHeadings(html);
    expect(headings).toEqual([
      { level: 1, text: 'Title' },
      { level: 2, text: 'Subtitle' }
    ]);
  });

  test('strips inner HTML tags from headings', () => {
    const html = '<h1>Hello <span>World</span></h1>';
    const headings = extractHeadings(html);
    expect(headings).toEqual([{ level: 1, text: 'Hello World' }]);
  });

  test('filters out empty headings', () => {
    const html = '<h1></h1><h2>   </h2><h3>Valid</h3>';
    const headings = extractHeadings(html);
    expect(headings).toEqual([{ level: 3, text: 'Valid' }]);
  });

  test('filters out headings >200 chars', () => {
    const longText = 'A'.repeat(201);
    const html = `<h1>${longText}</h1><h2>Short</h2>`;
    const headings = extractHeadings(html);
    expect(headings).toEqual([{ level: 2, text: 'Short' }]);
  });

  test('limits to 20 headings', () => {
    let html = '';
    for (let i = 0; i < 25; i++) {
      html += `<h2>Heading ${i}</h2>`;
    }
    const headings = extractHeadings(html);
    expect(headings.length).toBe(20);
  });

  test('returns empty array when no headings', () => {
    const html = '<p>No headings here</p>';
    const headings = extractHeadings(html);
    expect(headings).toEqual([]);
  });

  test('extracts h1 through h6', () => {
    const html = '<h1>H1</h1><h2>H2</h2><h3>H3</h3><h4>H4</h4><h5>H5</h5><h6>H6</h6>';
    const headings = extractHeadings(html);
    expect(headings.length).toBe(6);
    expect(headings.map(h => h.level)).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe('extractKeywords', () => {
  test('empty text returns []', () => {
    expect(extractKeywords('')).toEqual([]);
  });

  test('text <50 chars returns []', () => {
    expect(extractKeywords('Short text')).toEqual([]);
  });

  test('extracts Chinese keywords', () => {
    const text = '机器学习是人工智能的一个重要分支领域，机器学习技术正在快速发展并且应用广泛，深度学习也是机器学习的一种重要方法和技术手段，自然语言处理和计算机视觉都是机器学习的应用方向';
    const keywords = extractKeywords(text);
    expect(keywords.length).toBeGreaterThan(0);
    expect(keywords).toContain('机器学习');
  });

  test('extracts English keywords', () => {
    const text = 'JavaScript is a programming language. JavaScript is used widely. Programming language features are important for JavaScript development and programming language design.';
    const keywords = extractKeywords(text);
    expect(keywords.length).toBeGreaterThan(0);
    expect(keywords).toContain('javascript');
    expect(keywords).toContain('programming');
  });

  test('filters stop words', () => {
    const text = 'The quick brown fox jumps over the lazy dog. The fox is very quick and the dog is very lazy indeed the fox runs quickly';
    const keywords = extractKeywords(text);
    expect(keywords).not.toContain('the');
    expect(keywords).not.toContain('is');
  });

  test('default topN is 10', () => {
    const parts = [];
    for (let i = 0; i < 15; i++) {
      parts.push(`keyword${i} keyword${i} keyword${i}`);
    }
    const text = parts.join('. ');
    const keywords = extractKeywords(text);
    expect(keywords.length).toBeLessThanOrEqual(10);
  });

  test('custom topN works', () => {
    const parts = [];
    for (let i = 0; i < 10; i++) {
      parts.push(`keyword${i} keyword${i} keyword${i}`);
    }
    const text = parts.join('. ');
    const keywords = extractKeywords(text, 3);
    expect(keywords.length).toBeLessThanOrEqual(3);
  });

  test('sorts by frequency then by length', () => {
    const text = 'abcde abcde abcde xyz xyz longerword longerword longerword longerword';
    const keywords = extractKeywords(text, 5);
    const freqAbcde = (text.match(/abcde/g) || []).length;
    const freqLonger = (text.match(/longerword/g) || []).length;
    if (freqAbcde !== freqLonger) {
      expect(keywords[0]).toBe(freqAbcde > freqLonger ? 'abcde' : 'longerword');
    }
  });
});

describe('calculateReadingTime', () => {
  test('empty text returns {minutes:0, words:0}', () => {
    const result = calculateReadingTime('');
    expect(result.minutes).toBe(0);
    expect(result.words).toBe(0);
  });

  test('null text returns {minutes:0, words:0}', () => {
    const result = calculateReadingTime(null);
    expect(result.minutes).toBe(0);
    expect(result.words).toBe(0);
  });

  test('Chinese text only calculates correctly', () => {
    const text = '这'.repeat(500);
    const result = calculateReadingTime(text);
    expect(result.chineseChars).toBe(500);
    expect(result.englishWords).toBe(0);
    expect(result.minutes).toBe(1);
  });

  test('English text only calculates correctly', () => {
    const text = Array(201).fill('word').join(' ');
    const result = calculateReadingTime(text);
    expect(result.chineseChars).toBe(0);
    expect(result.englishWords).toBe(201);
    expect(result.minutes).toBe(2);
  });

  test('mixed text calculates correctly', () => {
    const text = '这'.repeat(250) + ' ' + Array(101).fill('word').join(' ');
    const result = calculateReadingTime(text);
    expect(result.chineseChars).toBe(250);
    expect(result.englishWords).toBe(101);
    expect(result.minutes).toBeGreaterThanOrEqual(1);
  });

  test('minimum 1 minute', () => {
    const text = 'Hello world';
    const result = calculateReadingTime(text);
    expect(result.minutes).toBe(1);
  });
});

describe('generateSummary', () => {
  test('empty text returns empty string', () => {
    expect(generateSummary('')).toBe('');
  });

  test('null text returns empty string', () => {
    expect(generateSummary(null)).toBe('');
  });

  test('text <= maxLength returns cleaned text', () => {
    const result = generateSummary('Hello world', 200);
    expect(result).toBe('Hello world');
  });

  test('text > maxLength with sentences joins and adds ...', () => {
    const text = '这是第一句话。这是第二句话。这是第三句话。这是第四句话这是额外的很长的填充内容用来确保超过最大长度限制的要求被满足所以需要写很多文字。';
    const result = generateSummary(text, 30);
    expect(result.endsWith('...')).toBe(true);
  });

  test('text > maxLength, summary empty after sentence join falls back to slice + ...', () => {
    const text = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.repeat(20);
    const result = generateSummary(text, 50);
    expect(result.endsWith('...')).toBe(true);
    expect(result.length).toBe(53);
  });

  test('custom maxLength works', () => {
    const text = 'A'.repeat(300);
    const result = generateSummary(text, 100);
    expect(result.length).toBe(103);
    expect(result.endsWith('...')).toBe(true);
  });

  test('cleaned text collapses whitespace', () => {
    const result = generateSummary('  Hello   world  ', 200);
    expect(result).toBe('Hello world');
  });

  test('text with only punctuation marks results in empty sentences, falls back to slice', () => {
    const text = '。。。！！！？？？';
    const result = generateSummary(text, 5);
    expect(result).toContain('...');
  });
});

describe('decodeHtmlEntities', () => {
  test('&amp; → &', () => {
    expect(decodeHtmlEntities('a &amp; b')).toBe('a & b');
  });

  test('&lt; → <', () => {
    expect(decodeHtmlEntities('a &lt; b')).toBe('a < b');
  });

  test('&gt; → >', () => {
    expect(decodeHtmlEntities('a &gt; b')).toBe('a > b');
  });

  test('&quot; → "', () => {
    expect(decodeHtmlEntities('&quot;hello&quot;')).toBe('"hello"');
  });

  test('&#39; → \'', () => {
    expect(decodeHtmlEntities('&#39;hello&#39;')).toBe("'hello'");
  });

  test('&#x27; → \'', () => {
    expect(decodeHtmlEntities('&#x27;hello&#x27;')).toBe("'hello'");
  });

  test('&#x2F; → /', () => {
    expect(decodeHtmlEntities('path&#x2F;file')).toBe('path/file');
  });

  test('&nbsp; → space', () => {
    expect(decodeHtmlEntities('hello&nbsp;world')).toBe('hello world');
  });

  test('multiple entities in one string', () => {
    expect(decodeHtmlEntities('&amp;&lt;&gt;&quot;&#39;')).toBe('&<>"\'');
  });
});

describe('resolveUrl', () => {
  test('absolute relativeUrl returns as-is (resolved)', () => {
    const result = resolveUrl('https://example.com/page', 'https://other.com/img.jpg');
    expect(result).toBe('https://other.com/img.jpg');
  });

  test('relative path resolves against base', () => {
    const result = resolveUrl('https://example.com/dir/page', 'image.jpg');
    expect(result).toBe('https://example.com/dir/image.jpg');
  });

  test('invalid relativeUrl returns relativeUrl as-is', () => {
    const result = resolveUrl('https://example.com', 'http://[invalid-host]');
    expect(result).toBe('http://[invalid-host]');
  });
});

describe('extractMetaTags', () => {
  test('extracts title from <title>', () => {
    const html = '<html><head><title>My Page</title></head><body></body></html>';
    const result = extractMetaTags(html, 'https://example.com');
    expect(result.title).toBe('My Page');
  });

  test('og:title (property before content) overrides title', () => {
    const html = '<html><head><title>Original</title><meta property="og:title" content="OG Title"></head><body></body></html>';
    const result = extractMetaTags(html, 'https://example.com');
    expect(result.title).toBe('OG Title');
  });

  test('og:title (content before property) overrides title', () => {
    const html = '<html><head><title>Original</title><meta content="OG Title2" property="og:title"></head><body></body></html>';
    const result = extractMetaTags(html, 'https://example.com');
    expect(result.title).toBe('OG Title2');
  });

  test('extracts meta description', () => {
    const html = '<html><head><meta name="description" content="A description"></head><body></body></html>';
    const result = extractMetaTags(html, 'https://example.com');
    expect(result.description).toBe('A description');
  });

  test('og:description overrides description', () => {
    const html = '<html><head><meta name="description" content="Original"><meta property="og:description" content="OG Desc"></head><body></body></html>';
    const result = extractMetaTags(html, 'https://example.com');
    expect(result.description).toBe('OG Desc');
  });

  test('extracts and resolves og:image', () => {
    const html = '<html><head><meta property="og:image" content="/img/og.jpg"></head><body></body></html>';
    const result = extractMetaTags(html, 'https://example.com');
    expect(result.image).toBe('https://example.com/img/og.jpg');
  });

  test('extracts og:type', () => {
    const html = '<html><head><meta property="og:type" content="article"></head><body></body></html>';
    const result = extractMetaTags(html, 'https://example.com');
    expect(result.type).toBe('article');
  });

  test('extracts og:site_name', () => {
    const html = '<html><head><meta property="og:site_name" content="MySite"></head><body></body></html>';
    const result = extractMetaTags(html, 'https://example.com');
    expect(result.siteName).toBe('MySite');
  });

  test('extracts og:video', () => {
    const html = '<html><head><meta property="og:video" content="/video.mp4"></head><body></body></html>';
    const result = extractMetaTags(html, 'https://example.com');
    expect(result.video).toBe('https://example.com/video.mp4');
  });

  test('og:video:secure_url overrides og:video', () => {
    const html = '<html><head><meta property="og:video" content="http://example.com/v.mp4"><meta property="og:video:secure_url" content="https://example.com/v.mp4"></head><body></body></html>';
    const result = extractMetaTags(html, 'https://example.com');
    expect(result.video).toBe('https://example.com/v.mp4');
  });

  test('extracts and resolves favicon link', () => {
    const html = '<html><head><link rel="icon" href="/favicon.png"></head><body></body></html>';
    const result = extractMetaTags(html, 'https://example.com');
    expect(result.favicon).toBe('https://example.com/favicon.png');
  });

  test('extracts favicon with href before rel when no prior favicon', () => {
    const html = '<html><head><link href="/ico.png" rel="icon"></head><body></body></html>';
    const result = extractMetaTags(html, 'https://example.com');
    expect(result.favicon).toBe('https://example.com/ico.png');
  });

  test('extracts apple-touch-icon when no prior favicon', () => {
    const html = '<html><head><link rel="apple-touch-icon" href="/apple.png"></head><body></body></html>';
    const result = extractMetaTags(html, 'https://example.com');
    expect(result.favicon).toBe('https://example.com/apple.png');
  });

  test('defaults to /favicon.ico when no favicon', () => {
    const html = '<html><head></head><body></body></html>';
    const result = extractMetaTags(html, 'https://example.com');
    expect(result.favicon).toBe('https://example.com/favicon.ico');
  });

  test('defaults siteName to hostname when no og:site_name', () => {
    const html = '<html><head></head><body></body></html>';
    const result = extractMetaTags(html, 'https://example.com');
    expect(result.siteName).toBe('example.com');
  });

  test('generates summary, keywords, readingTime with enough content', () => {
    const longParagraph = 'A'.repeat(300);
    const html = `<html><head></head><body><p>${longParagraph}</p></body></html>`;
    const result = extractMetaTags(html, 'https://example.com');
    expect(result.summary).toBeTruthy();
    expect(result.keywords).toBeDefined();
    expect(result.readingTime).toBeDefined();
  });

  test('no summary/keywords/readingTime with not enough content', () => {
    const html = '<html><head></head><body><p>Short</p></body></html>';
    const result = extractMetaTags(html, 'https://example.com');
    expect(result.summary).toBe('');
    expect(result.keywords).toEqual([]);
    expect(result.readingTime).toBeNull();
  });

  test('summary becomes description when no description', () => {
    const longParagraph = 'A'.repeat(300);
    const html = `<html><head></head><body><p>${longParagraph}</p></body></html>`;
    const result = extractMetaTags(html, 'https://example.com');
    expect(result.description).toBe(result.summary);
  });

  test('extracts headings', () => {
    const html = '<html><head></head><body><h1>Title</h1><h2>Sub</h2></body></html>';
    const result = extractMetaTags(html, 'https://example.com');
    expect(result.headings.length).toBe(2);
  });

  test('description meta with content before name', () => {
    const html = '<html><head><meta content="Desc2" name="description"></head><body></body></html>';
    const result = extractMetaTags(html, 'https://example.com');
    expect(result.description).toBe('Desc2');
  });

  test('og:description with content before property', () => {
    const html = '<html><head><meta content="OG Desc2" property="og:description"></head><body></body></html>';
    const result = extractMetaTags(html, 'https://example.com');
    expect(result.description).toBe('OG Desc2');
  });

  test('og:image with content before property', () => {
    const html = '<html><head><meta content="/img2.jpg" property="og:image"></head><body></body></html>';
    const result = extractMetaTags(html, 'https://example.com');
    expect(result.image).toBe('https://example.com/img2.jpg');
  });

  test('og:type with content before property', () => {
    const html = '<html><head><meta content="video" property="og:type"></head><body></body></html>';
    const result = extractMetaTags(html, 'https://example.com');
    expect(result.type).toBe('video');
  });

  test('og:site_name with content before property', () => {
    const html = '<html><head><meta content="Site2" property="og:site_name"></head><body></body></html>';
    const result = extractMetaTags(html, 'https://example.com');
    expect(result.siteName).toBe('Site2');
  });

  test('og:video with content before property', () => {
    const html = '<html><head><meta content="/v2.mp4" property="og:video"></head><body></body></html>';
    const result = extractMetaTags(html, 'https://example.com');
    expect(result.video).toBe('https://example.com/v2.mp4');
  });

  test('og:video:secure_url with content before property', () => {
    const html = '<html><head><meta property="og:video" content="http://example.com/v.mp4"><meta content="https://example.com/secure.mp4" property="og:video:secure_url"></head><body></body></html>';
    const result = extractMetaTags(html, 'https://example.com');
    expect(result.video).toBe('https://example.com/secure.mp4');
  });

  test('favicon with shortcut icon rel', () => {
    const html = '<html><head><link rel="shortcut icon" href="/sfavicon.ico"></head><body></body></html>';
    const result = extractMetaTags(html, 'https://example.com');
    expect(result.favicon).toBe('https://example.com/sfavicon.ico');
  });

  test('apple-touch-icon does not override existing favicon', () => {
    const html = '<html><head><link rel="icon" href="/favicon.png"><link rel="apple-touch-icon" href="/apple.png"></head><body></body></html>';
    const result = extractMetaTags(html, 'https://example.com');
    expect(result.favicon).toBe('https://example.com/favicon.png');
  });

  test('href-before-rel favicon does not override existing favicon', () => {
    const html = '<html><head><link rel="icon" href="/favicon.png"><link href="/other.png" rel="icon"></head><body></body></html>';
    const result = extractMetaTags(html, 'https://example.com');
    expect(result.favicon).toBe('https://example.com/favicon.png');
  });

  test('siteName empty string when invalid URL', () => {
    const html = '<html><head></head><body></body></html>';
    const result = extractMetaTags(html, 'not-a-url');
    expect(result.siteName).toBe('');
  });
});

describe('getVideoEmbedUrl', () => {
  test('YouTube URL with ?v=ID returns embed URL', () => {
    expect(getVideoEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'))
      .toBe('https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1');
  });

  test('youtu.be short URL returns embed URL', () => {
    expect(getVideoEmbedUrl('https://youtu.be/dQw4w9WgXcQ'))
      .toBe('https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1');
  });

  test('YouTube URL without video ID returns null', () => {
    expect(getVideoEmbedUrl('https://www.youtube.com/')).toBeNull();
  });

  test('Bilibili URL with BV ID returns embed URL', () => {
    expect(getVideoEmbedUrl('https://www.bilibili.com/video/BV1xx411c7mD'))
      .toBe('https://player.bilibili.com/player.html?bvid=BV1xx411c7mD&autoplay=1');
  });

  test('Bilibili URL without BV ID returns null', () => {
    expect(getVideoEmbedUrl('https://www.bilibili.com/')).toBeNull();
  });

  test('Vimeo URL with numeric ID returns embed URL', () => {
    expect(getVideoEmbedUrl('https://vimeo.com/123456'))
      .toBe('https://player.vimeo.com/video/123456?autoplay=1&muted=1');
  });

  test('Vimeo URL without numeric ID returns null', () => {
    expect(getVideoEmbedUrl('https://vimeo.com/')).toBeNull();
  });

  test('non-video URL returns null', () => {
    expect(getVideoEmbedUrl('https://example.com')).toBeNull();
  });

  test('invalid URL returns null', () => {
    expect(getVideoEmbedUrl('not-a-url')).toBeNull();
  });
});

describe('TYPE_COMPATIBILITY', () => {
  test('has expected type keys', () => {
    expect(TYPE_COMPATIBILITY).toHaveProperty('webpage');
    expect(TYPE_COMPATIBILITY).toHaveProperty('image');
    expect(TYPE_COMPATIBILITY).toHaveProperty('video');
    expect(TYPE_COMPATIBILITY).toHaveProperty('video-site');
    expect(TYPE_COMPATIBILITY).toHaveProperty('audio');
    expect(TYPE_COMPATIBILITY).toHaveProperty('audio-site');
  });
});

describe('normalizeSuffix', () => {
  test('null returns empty string', () => {
    expect(normalizeSuffix(null)).toBe('');
  });

  test('undefined returns empty string', () => {
    expect(normalizeSuffix(undefined)).toBe('');
  });

  test('empty string returns empty string', () => {
    expect(normalizeSuffix('')).toBe('');
  });

  test('adds dot prefix if missing', () => {
    expect(normalizeSuffix('pdf')).toBe('.pdf');
  });

  test('keeps dot prefix if present', () => {
    expect(normalizeSuffix('.pdf')).toBe('.pdf');
  });

  test('trims whitespace', () => {
    expect(normalizeSuffix('  pdf  ')).toBe('.pdf');
  });

  test('trims and adds dot', () => {
    expect(normalizeSuffix('  .pdf  ')).toBe('.pdf');
  });

  test('number input converts to string', () => {
    expect(normalizeSuffix(123)).toBe('.123');
  });
});

describe('validateRegexPattern', () => {
  test('null returns invalid', () => {
    expect(validateRegexPattern(null)).toEqual({ valid: false, error: '正则表达式不能为空' });
  });

  test('empty string returns invalid', () => {
    expect(validateRegexPattern('')).toEqual({ valid: false, error: '正则表达式不能为空' });
  });

  test('undefined returns invalid', () => {
    expect(validateRegexPattern(undefined)).toEqual({ valid: false, error: '正则表达式不能为空' });
  });

  test('pattern >200 chars returns invalid', () => {
    const long = 'a'.repeat(201);
    expect(validateRegexPattern(long)).toEqual({ valid: false, error: '正则表达式长度不能超过 200 字符' });
  });

  test('dangerous nested quantifier pattern returns invalid', () => {
    expect(validateRegexPattern('(a+)+')).toEqual({ valid: false, error: '正则包含可能导致 ReDoS 的嵌套量词模式' });
  });

  test('too many groups returns invalid', () => {
    const pattern = Array(11).fill('(a)').join('');
    expect(validateRegexPattern(pattern)).toEqual({ valid: false, error: '正则表达式分组过多' });
  });

  test('too many character sets returns invalid', () => {
    const pattern = Array(11).fill('[a]').join('');
    expect(validateRegexPattern(pattern)).toEqual({ valid: false, error: '正则表达式字符集过多' });
  });

  test('valid pattern returns valid', () => {
    expect(validateRegexPattern('abc')).toEqual({ valid: true });
  });

  test('syntax error includes error details', () => {
    const result = validateRegexPattern('[invalid');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('正则表达式语法错误:');
  });

  test('valid complex pattern', () => {
    expect(validateRegexPattern('https?://[a-z]+\\.com')).toEqual({ valid: true });
  });
});

describe('safeRegexMatch', () => {
  test('returns true for matching pattern', () => {
    expect(safeRegexMatch('abc', 'xabcx', '')).toBe(true);
  });

  test('returns false for non-matching pattern', () => {
    expect(safeRegexMatch('xyz', 'abc', '')).toBe(false);
  });

  test('returns false for invalid pattern', () => {
    expect(safeRegexMatch('', 'abc', '')).toBe(false);
  });

  test('returns false for null pattern', () => {
    expect(safeRegexMatch(null, 'abc', '')).toBe(false);
  });

  test('works with flags', () => {
    expect(safeRegexMatch('ABC', 'abc', 'i')).toBe(true);
  });

  test('returns false for dangerous pattern', () => {
    expect(safeRegexMatch('(a+)+', 'aaa', '')).toBe(false);
  });

  test('returns false for invalid flags', () => {
    expect(safeRegexMatch('abc', 'test', 'zzz')).toBe(false);
  });

  test('returns false when test string causes TypeError', () => {
    expect(safeRegexMatch('abc', Symbol('abc'), '')).toBe(false);
  });

  test('default flags parameter works (no flags passed)', () => {
    expect(safeRegexMatch('abc', 'xabcx')).toBe(true);
  });

  test('returns false when done is pre-set to true (timeout simulation)', () => {
    expect(safeRegexMatch('abc', 'xabcx', '', { done: true })).toBe(false);
  });

  test('returns false when execution time exceeds 30ms', () => {
    let callCount = 0;
    const fakeNow = () => {
      callCount++;
      return callCount === 1 ? 0 : 100;
    };
    expect(safeRegexMatch('abc', 'xabcx', '', { now: fakeNow })).toBe(false);
  });
});

describe('filterCompatibleActions', () => {
  test('returns null when no rule', () => {
    expect(filterCompatibleActions(null)).toBeNull();
  });

  test('returns null when no actions', () => {
    expect(filterCompatibleActions({})).toBeNull();
  });

  test('returns actions as-is when no forceType', () => {
    const actions = { autoEmbed: true, previewWidth: 100 };
    expect(filterCompatibleActions({ actions })).toEqual(actions);
  });

  test('webpage type keeps all actions', () => {
    const actions = { forceType: 'webpage', autoEmbed: true, autoQuickRead: true, previewWidth: 100, previewHeight: 200, disableSecurityCheck: true };
    const result = filterCompatibleActions({ actions });
    expect(result.autoEmbed).toBe(true);
    expect(result.autoQuickRead).toBe(true);
    expect(result.previewWidth).toBe(100);
    expect(result.disableSecurityCheck).toBe(true);
  });

  test('image type disables embed and quickRead', () => {
    const actions = { forceType: 'image', autoEmbed: true, autoQuickRead: true, previewWidth: 100, previewHeight: 200, disableSecurityCheck: true };
    const result = filterCompatibleActions({ actions });
    expect(result.autoEmbed).toBe(false);
    expect(result.autoQuickRead).toBe(false);
    expect(result.previewWidth).toBe(100);
  });

  test('video type disables embed and quickRead', () => {
    const actions = { forceType: 'video', autoEmbed: true, autoQuickRead: true, previewWidth: 100, disableSecurityCheck: true };
    const result = filterCompatibleActions({ actions });
    expect(result.autoEmbed).toBe(false);
    expect(result.autoQuickRead).toBe(false);
  });

  test('video-site type keeps embed but disables quickRead', () => {
    const actions = { forceType: 'video-site', autoEmbed: true, autoQuickRead: true };
    const result = filterCompatibleActions({ actions });
    expect(result.autoEmbed).toBe(true);
    expect(result.autoQuickRead).toBe(false);
  });

  test('audio type disables embed and quickRead', () => {
    const actions = { forceType: 'audio', autoEmbed: true, autoQuickRead: true };
    const result = filterCompatibleActions({ actions });
    expect(result.autoEmbed).toBe(false);
    expect(result.autoQuickRead).toBe(false);
  });

  test('audio-site type keeps embed but disables quickRead', () => {
    const actions = { forceType: 'audio-site', autoEmbed: true, autoQuickRead: true };
    const result = filterCompatibleActions({ actions });
    expect(result.autoEmbed).toBe(true);
    expect(result.autoQuickRead).toBe(false);
  });

  test('unknown forceType returns actions unchanged', () => {
    const actions = { forceType: 'unknown', autoEmbed: true };
    const result = filterCompatibleActions({ actions });
    expect(result).toEqual(actions);
  });

  test('type without supportsSize clears dimensions', () => {
    const original = TYPE_COMPATIBILITY.webpage;
    TYPE_COMPATIBILITY.webpage = { supportsEmbed: true, supportsQuickRead: true, supportsSize: false, supportsDisableSecurity: true };
    const actions = { forceType: 'webpage', autoEmbed: true, autoQuickRead: true, previewWidth: 100, previewHeight: 200, disableSecurityCheck: true };
    const result = filterCompatibleActions({ actions });
    expect(result.previewWidth).toBeNull();
    expect(result.previewHeight).toBeNull();
    TYPE_COMPATIBILITY.webpage = original;
  });

  test('type without supportsDisableSecurity disables security check', () => {
    const original = TYPE_COMPATIBILITY.webpage;
    TYPE_COMPATIBILITY.webpage = { supportsEmbed: true, supportsQuickRead: true, supportsSize: true, supportsDisableSecurity: false };
    const actions = { forceType: 'webpage', autoEmbed: true, autoQuickRead: true, previewWidth: 100, disableSecurityCheck: true };
    const result = filterCompatibleActions({ actions });
    expect(result.disableSecurityCheck).toBe(false);
    TYPE_COMPATIBILITY.webpage = original;
  });
});

describe('matchRuleForUrl', () => {
  test('empty rules returns null', () => {
    expect(matchRuleForUrl('https://example.com', [])).toBeNull();
  });

  test('null rules returns null', () => {
    expect(matchRuleForUrl('https://example.com', null)).toBeNull();
  });

  test('null url returns null', () => {
    expect(matchRuleForUrl(null, [{ matchType: 'domain', matchValue: 'example.com', enabled: true }])).toBeNull();
  });

  test('domain match returns matched rule with filtered actions', () => {
    const rules = [{ matchType: 'domain', matchValue: 'example.com', enabled: true, actions: { forceType: 'webpage' } }];
    const result = matchRuleForUrl('https://example.com/page', rules);
    expect(result).toBeTruthy();
    expect(result.matchValue).toBe('example.com');
  });

  test('subdomain match', () => {
    const rules = [{ matchType: 'domain', matchValue: 'example.com', enabled: true, actions: {} }];
    const result = matchRuleForUrl('https://sub.example.com/page', rules);
    expect(result).toBeTruthy();
  });

  test('suffix match', () => {
    const rules = [{ matchType: 'suffix', matchValue: '.pdf', enabled: true, actions: {} }];
    const result = matchRuleForUrl('https://example.com/doc.pdf', rules);
    expect(result).toBeTruthy();
  });

  test('suffix with empty matchValue returns null', () => {
    const rules = [{ matchType: 'suffix', matchValue: '', enabled: true, actions: {} }];
    const result = matchRuleForUrl('https://example.com/doc.pdf', rules);
    expect(result).toBeNull();
  });

  test('suffix with "." matchValue returns null', () => {
    const rules = [{ matchType: 'suffix', matchValue: '.', enabled: true, actions: {} }];
    const result = matchRuleForUrl('https://example.com/doc.pdf', rules);
    expect(result).toBeNull();
  });

  test('suffix with special chars returns null', () => {
    const rules = [{ matchType: 'suffix', matchValue: '.pdf?x=1', enabled: true, actions: {} }];
    const result = matchRuleForUrl('https://example.com/doc.pdf?x=1', rules);
    expect(result).toBeNull();
  });

  test('keyword match', () => {
    const rules = [{ matchType: 'keyword', matchValue: 'docs', enabled: true, actions: {} }];
    const result = matchRuleForUrl('https://example.com/docs/page', rules);
    expect(result).toBeTruthy();
  });

  test('regex match', () => {
    const rules = [{ matchType: 'regex', matchValue: 'example\\.com/docs', enabled: true, actions: {} }];
    const result = matchRuleForUrl('https://example.com/docs/page', rules);
    expect(result).toBeTruthy();
  });

  test('case sensitive match', () => {
    const rules = [{ matchType: 'keyword', matchValue: 'DOCS', enabled: true, caseSensitive: true, actions: {} }];
    const result = matchRuleForUrl('https://example.com/DOCS/page', rules);
    expect(result).toBeTruthy();
  });

  test('case sensitive no match', () => {
    const rules = [{ matchType: 'keyword', matchValue: 'DOCS', enabled: true, caseSensitive: true, actions: {} }];
    const result = matchRuleForUrl('https://example.com/docs/page', rules);
    expect(result).toBeNull();
  });

  test('default matchType returns null', () => {
    const rules = [{ matchType: 'unknown', matchValue: 'example.com', enabled: true, actions: {} }];
    const result = matchRuleForUrl('https://example.com/page', rules);
    expect(result).toBeNull();
  });

  test('priority sorting - higher priority matches first', () => {
    const rules = [
      { matchType: 'domain', matchValue: 'example.com', enabled: true, priority: 1, actions: { forceType: 'webpage' } },
      { matchType: 'domain', matchValue: 'example.com', enabled: true, priority: 10, actions: { forceType: 'image' } }
    ];
    const result = matchRuleForUrl('https://example.com/page', rules);
    expect(result.priority).toBe(10);
  });

  test('disabled rules skipped', () => {
    const rules = [{ matchType: 'domain', matchValue: 'example.com', enabled: false, actions: {} }];
    const result = matchRuleForUrl('https://example.com/page', rules);
    expect(result).toBeNull();
  });

  test('invalid URL returns null', () => {
    const rules = [{ matchType: 'domain', matchValue: 'example.com', enabled: true, actions: {} }];
    const result = matchRuleForUrl('not-a-url', rules);
    expect(result).toBeNull();
  });

  test('rule without matchValue is skipped', () => {
    const rules = [{ matchType: 'domain', matchValue: '', enabled: true, actions: {} }];
    const result = matchRuleForUrl('https://example.com/page', rules);
    expect(result).toBeNull();
  });

  test('suffix match on full URL (not just pathname)', () => {
    const rules = [{ matchType: 'suffix', matchValue: '.com', enabled: true, actions: {} }];
    const result = matchRuleForUrl('https://example.com', rules);
    expect(result).toBeTruthy();
  });

  test('rule with undefined priority gets sorted correctly', () => {
    const rules = [
      { matchType: 'domain', matchValue: 'example.com', enabled: true, priority: 5, actions: { forceType: 'webpage' } },
      { matchType: 'domain', matchValue: 'other.com', enabled: true, actions: { forceType: 'image' } },
      { matchType: 'domain', matchValue: 'test.com', enabled: true, actions: { forceType: 'video' } }
    ];
    const result = matchRuleForUrl('https://example.com/page', rules);
    expect(result.priority).toBe(5);
  });

  test('case sensitive regex match', () => {
    const rules = [{ matchType: 'regex', matchValue: 'DOCS', enabled: true, caseSensitive: true, actions: {} }];
    const result = matchRuleForUrl('https://example.com/DOCS/page', rules);
    expect(result).toBeTruthy();
  });

  test('case sensitive regex no match', () => {
    const rules = [{ matchType: 'regex', matchValue: 'DOCS', enabled: true, caseSensitive: true, actions: {} }];
    const result = matchRuleForUrl('https://example.com/docs/page', rules);
    expect(result).toBeNull();
  });
});

describe('processHtmlForSnapshot', () => {
  test('removes <script> tags', () => {
    const html = '<html><head></head><body><script>alert("x")</script><p>Hello</p></body></html>';
    const result = processHtmlForSnapshot(html, 'https://example.com');
    expect(result).not.toContain('alert');
    expect(result).toContain('<p>Hello</p>');
  });

  test('removes <noscript> tags', () => {
    const html = '<html><head></head><body><noscript>Fallback</noscript><p>Hello</p></body></html>';
    const result = processHtmlForSnapshot(html, 'https://example.com');
    expect(result).not.toContain('Fallback');
  });

  test('removes inline event handlers (onclick etc.)', () => {
    const html = '<html><head></head><body><div onclick="evil()" onmouseover="bad()">Click</div></body></html>';
    const result = processHtmlForSnapshot(html, 'https://example.com');
    expect(result).not.toContain('evil()');
    expect(result).not.toContain('bad()');
  });

  test('removes unquoted inline event handlers', () => {
    const html = '<html><head></head><body><div onclick=evil()>Click</div></body></html>';
    const result = processHtmlForSnapshot(html, 'https://example.com');
    expect(result).not.toContain('evil()');
  });

  test('resolves relative URLs in href/src', () => {
    const html = '<html><head></head><body><a href="/path">Link</a><img src="/img.png"></body></html>';
    const result = processHtmlForSnapshot(html, 'https://example.com');
    expect(result).toContain('href="https://example.com/path"');
    expect(result).toContain('src="https://example.com/img.png"');
  });

  test('resolves URLs in unquoted attributes', () => {
    const html = '<html><head></head><body><img src=/img.png ></body></html>';
    const result = processHtmlForSnapshot(html, 'https://example.com');
    expect(result).toContain('"https://example.com/img.png"');
  });

  test('processes srcset attributes', () => {
    const html = '<html><head></head><body><img srcset="/sm.jpg 300w, /lg.jpg 800w"></body></html>';
    const result = processHtmlForSnapshot(html, 'https://example.com');
    expect(result).toMatch(/srcset="[^"]*example\.com/);
    expect(result).toMatch(/sm\.jpg/);
    expect(result).toMatch(/lg\.jpg/);
  });

  test('adds <base> tag if missing', () => {
    const html = '<html><head></head><body></body></html>';
    const result = processHtmlForSnapshot(html, 'https://example.com');
    expect(result).toContain('<base href="https://example.com">');
  });

  test('does NOT add <base> if already present', () => {
    const html = '<html><head><base href="https://other.com"></head><body></body></html>';
    const result = processHtmlForSnapshot(html, 'https://example.com');
    const baseCount = (result.match(/<base\s/gi) || []).length;
    expect(baseCount).toBe(1);
  });

  test('replaces <form> with onsubmit="return false;"', () => {
    const html = '<html><head></head><body><form action="/submit"><input></form></body></html>';
    const result = processHtmlForSnapshot(html, 'https://example.com');
    expect(result).toContain('onsubmit="return false;"');
  });

  test('uses effectiveBase from existing <base> tag', () => {
    const html = '<html><head><base href="https://cdn.example.com"></head><body><img src="/img.png"></body></html>';
    const result = processHtmlForSnapshot(html, 'https://example.com');
    expect(result).toContain('https://cdn.example.com/img.png');
  });

  test('error case returns original html', () => {
    const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const badHtml = null;
    const result = processHtmlForSnapshot(badHtml, 'https://example.com');
    expect(result).toBeNull();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  test('catch block in quoted URL resolution when _resolveUrl throws', () => {
    const throwingResolver = () => { throw new Error('bad url'); };
    const html = '<html><head></head><body><a href="/path">Link</a></body></html>';
    const result = processHtmlForSnapshot(html, 'https://example.com', throwingResolver);
    expect(result).toContain('href="/path"');
  });

  test('catch block in unquoted URL resolution when _resolveUrl throws', () => {
    const callCount = { n: 0 };
    const selectiveThrow = (base, url) => {
      callCount.n++;
      if (callCount.n > 1) throw new Error('bad url');
      return new URL(url, base).href;
    };
    const html = '<html><head></head><body><a href="/path">Link</a><img src=/img.png ></body></html>';
    const result = processHtmlForSnapshot(html, 'https://example.com', selectiveThrow);
    expect(result).toContain('/img.png');
  });

  test('srcset with trailing comma produces empty parts', () => {
    const html = '<html><head></head><body><img srcset="small.jpg 480w, large.jpg 800w,"></body></html>';
    const result = processHtmlForSnapshot(html, 'https://example.com');
    expect(result).toContain('srcset=');
  });
});
