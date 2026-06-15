(function () {
  'use strict';

  if (window.top !== window.self) {
    return;
  }

  window.QLP = window.QLP || {};
  const _ = QLP;

  _.qrcodePanel = null;

  _.toggleQrcodePanel = function toggleQrcodePanel() {
    if (_.qrcodePanel && _.qrcodePanel.classList.contains('qlp-visible')) {
      _.hideQrcodePanel();
    } else {
      _.showQrcodePanel();
    }
  };

  _.showQrcodePanel = function showQrcodePanel() {
    if (!_.currentLink) return;
    if (!_.qrcodePanel) {
      _.qrcodePanel = document.createElement('div');
      _.qrcodePanel.className = 'qlp-qrcode-panel';
      _.qrcodePanel.id = 'qlp-qrcode-panel';

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
        _.hideQrcodePanel();
      });

      header.appendChild(headerSpan);
      header.appendChild(closeBtn);

      const qrContent = document.createElement('div');
      qrContent.className = 'qlp-qrcode-content';
      qrContent.id = 'qlp-qrcode-content';

      const qrUrl = document.createElement('div');
      qrUrl.className = 'qlp-qrcode-url';
      qrUrl.id = 'qlp-qrcode-url';

      _.qrcodePanel.appendChild(header);
      _.qrcodePanel.appendChild(qrContent);
      _.qrcodePanel.appendChild(qrUrl);

      _.qrcodePanel.addEventListener('click', (e) => {
        e.stopPropagation();
      });

      document.body.appendChild(_.qrcodePanel);
    }

    const qrContent = _.qrcodePanel.querySelector('#qlp-qrcode-content');
    const qrUrl = _.qrcodePanel.querySelector('#qlp-qrcode-url');
    while (qrContent.firstChild) {
      qrContent.removeChild(qrContent.firstChild);
    }
    
    const canvas = document.createElement('canvas');
    canvas.width = 220;
    canvas.height = 220;
    _.generateQRCode(canvas, _.currentLink);
    qrContent.appendChild(canvas);
    
    const displayUrl = _.currentLink.length > 40 ? _.currentLink.slice(0, 40) + '...' : _.currentLink;
    qrUrl.textContent = displayUrl;
    qrUrl.title = _.currentLink;

    _.applyThemeToQrcodePanel();

    if (_.previewPanel && _.previewPanel.classList.contains('qlp-visible')) {
      const panelRect = _.previewPanel.getBoundingClientRect();
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
      _.qrcodePanel.style.left = left + 'px';
      _.qrcodePanel.style.top = top + 'px';
    } else {
      _.qrcodePanel.style.left = (window.innerWidth - 240) / 2 + 'px';
      _.qrcodePanel.style.top = (window.innerHeight - 280) / 2 + 'px';
    }

    _.qrcodePanel.classList.add('qlp-visible');
  };

  _.applyThemeToQrcodePanel = function applyThemeToQrcodePanel() {
    if (!_.qrcodePanel || !_.settings.theme) return;
    const theme = _.settings.theme;
    const isDark = theme.mode === 'dark' || 
      (theme.mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      _.qrcodePanel.style.background = '#1a1a2e';
      _.qrcodePanel.style.color = '#fff';
      _.qrcodePanel.style.border = '1px solid #333';
    } else {
      _.qrcodePanel.style.background = '#fff';
      _.qrcodePanel.style.color = '#333';
      _.qrcodePanel.style.border = '1px solid #e0e0e0';
    }
    _.qrcodePanel.style.borderRadius = theme.borderRadius;
    _.qrcodePanel.style.boxShadow = 'var(--qlp-shadow)';
  };

  _.hideQrcodePanel = function hideQrcodePanel() {
    if (_.qrcodePanel) {
      _.qrcodePanel.classList.remove('qlp-visible');
    }
  };

  _.generateQRCode = function generateQRCode(canvas, text) {
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
  };
})();
