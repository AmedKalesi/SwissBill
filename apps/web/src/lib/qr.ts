/**
 * Bağımlılıksız, kompakt QR kod üretici (byte mode, hata düzeltme seviyesi M).
 *
 * Landing page'deki canlı QR-fatura önizlemesi için kullanılır. Yalnızca
 * ihtiyaç duyduğumuz kadarı uygulanmıştır: byte (8-bit) modu, ECC seviyesi M,
 * versiyon 1–10 aralığı (Swiss QR payload'ları için fazlasıyla yeterli).
 *
 * Referans: ISO/IEC 18004. Algoritma, Nayuki'nin QR Code generator
 * implementasyonundan uyarlanmıştır (MIT).
 */

// --- Galois alanı (GF(256)) aritmetiği, Reed-Solomon için ---

const EXP_TABLE = new Uint8Array(256);
const LOG_TABLE = new Uint8Array(256);
(function initTables() {
  for (let i = 0; i < 8; i++) {
    EXP_TABLE[i] = 1 << i;
  }
  for (let i = 8; i < 256; i++) {
    EXP_TABLE[i] = EXP_TABLE[i - 4] ^ EXP_TABLE[i - 5] ^ EXP_TABLE[i - 6] ^ EXP_TABLE[i - 8];
  }
  for (let i = 0; i < 255; i++) {
    LOG_TABLE[EXP_TABLE[i]] = i;
  }
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP_TABLE[(LOG_TABLE[a] + LOG_TABLE[b]) % 255];
}

/** Reed-Solomon bölen polinomunu (generator polynomial) üretir. */
function rsGeneratorPoly(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= gfMul(poly[j], EXP_TABLE[i]);
      next[j + 1] ^= poly[j];
    }
    poly = next;
  }
  return poly;
}

/** Veri kod sözcüklerine Reed-Solomon hata düzeltme baytlarını ekler. */
function rsEncode(data: Uint8Array, eccLen: number): Uint8Array {
  const gen = rsGeneratorPoly(eccLen);
  const result = new Uint8Array(eccLen);
  for (const byte of data) {
    const factor = byte ^ result[0];
    result.copyWithin(0, 1);
    result[result.length - 1] = 0;
    for (let i = 0; i < eccLen; i++) {
      result[i] ^= gfMul(gen[i + 1], factor);
    }
  }
  return result;
}

// --- Versiyon başına ECC seviyesi M için blok yapısı ---
// [toplam kod sözcüğü, ECC kod sözcüğü/blok, grup1 blok, grup1 veri, grup2 blok, grup2 veri]
const ECC_M: Record<number, [number, number, number, number, number, number]> = {
  1: [26, 10, 1, 16, 0, 0],
  2: [44, 16, 1, 28, 0, 0],
  3: [70, 26, 1, 44, 0, 0],
  4: [100, 18, 2, 32, 0, 0],
  5: [134, 24, 2, 43, 0, 0],
  6: [172, 16, 4, 27, 0, 0],
  7: [196, 18, 4, 31, 0, 0],
  8: [242, 22, 2, 38, 2, 39],
  9: [292, 22, 3, 36, 2, 37],
  10: [346, 26, 4, 43, 1, 44],
};

/** Verilen bayt uzunluğu için gereken en küçük versiyonu bulur. */
function pickVersion(byteLen: number): number {
  for (let v = 1; v <= 10; v++) {
    const [, , g1Blocks, g1Data, g2Blocks, g2Data] = ECC_M[v];
    const capacity = g1Blocks * g1Data + g2Blocks * g2Data;
    // 4 bit mod + 8/16 bit karakter sayısı + veri
    const countBits = v <= 9 ? 8 : 16;
    const neededBits = 4 + countBits + byteLen * 8;
    if (neededBits <= capacity * 8) return v;
  }
  throw new Error("QR: veri çok uzun (versiyon 10 aşıldı)");
}

/** UTF-8 bayt dizisine çevirir. */
function toUtf8(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

/** Bit dizisine yazan yardımcı. */
class BitBuffer {
  bits: number[] = [];
  push(value: number, length: number) {
    for (let i = length - 1; i >= 0; i--) {
      this.bits.push((value >>> i) & 1);
    }
  }
  get length() {
    return this.bits.length;
  }
}

/** Veriyi kod sözcüklerine (data codewords) dönüştürür. */
function buildDataCodewords(bytes: Uint8Array, version: number): Uint8Array {
  const [, , g1Blocks, g1Data, g2Blocks, g2Data] = ECC_M[version];
  const totalData = g1Blocks * g1Data + g2Blocks * g2Data;

  const bb = new BitBuffer();
  bb.push(0b0100, 4); // Byte mode
  bb.push(bytes.length, version <= 9 ? 8 : 16);
  for (const b of bytes) bb.push(b, 8);

  // Terminator
  const capacityBits = totalData * 8;
  const terminator = Math.min(4, capacityBits - bb.length);
  bb.push(0, terminator);

  // Bayt sınırına hizala
  while (bb.length % 8 !== 0) bb.push(0, 1);

  // Dolgu baytları (0xEC, 0x11)
  const padBytes = [0xec, 0x11];
  let padIndex = 0;
  while (bb.length < capacityBits) {
    bb.push(padBytes[padIndex % 2], 8);
    padIndex++;
  }

  const codewords = new Uint8Array(totalData);
  for (let i = 0; i < totalData; i++) {
    let value = 0;
    for (let j = 0; j < 8; j++) {
      value = (value << 1) | bb.bits[i * 8 + j];
    }
    codewords[i] = value;
  }
  return codewords;
}

/** Veri + ECC kod sözcüklerini bloklara ayırıp serpiştirir. */
function interleave(codewords: Uint8Array, version: number): Uint8Array {
  const [, eccPerBlock, g1Blocks, g1Data, g2Blocks, g2Data] = ECC_M[version];
  const blocks: { data: Uint8Array; ecc: Uint8Array }[] = [];
  let offset = 0;

  const addBlock = (dataLen: number) => {
    const data = codewords.slice(offset, offset + dataLen);
    offset += dataLen;
    blocks.push({ data, ecc: rsEncode(data, eccPerBlock) });
  };

  for (let i = 0; i < g1Blocks; i++) addBlock(g1Data);
  for (let i = 0; i < g2Blocks; i++) addBlock(g2Data);

  const maxData = Math.max(g1Data, g2Data);
  const result: number[] = [];
  for (let i = 0; i < maxData; i++) {
    for (const block of blocks) {
      if (i < block.data.length) result.push(block.data[i]);
    }
  }
  for (let i = 0; i < eccPerBlock; i++) {
    for (const block of blocks) {
      result.push(block.ecc[i]);
    }
  }
  return new Uint8Array(result);
}

/** Versiyon için hizalama deseni (alignment pattern) merkez koordinatları. */
function alignmentPositions(version: number): number[] {
  if (version === 1) return [];
  const numAlign = Math.floor(version / 7) + 2;
  const size = version * 4 + 17;
  const step = version === 32 ? 26 : Math.ceil((size - 13) / (numAlign * 2 - 2)) * 2;
  const result: number[] = [6];
  for (let pos = size - 7; result.length < numAlign; pos -= step) {
    result.splice(1, 0, pos);
  }
  return result;
}

/** Modül matrisini (boolean grid) oluşturur. */
function buildMatrix(codewords: Uint8Array, version: number): boolean[][] {
  const size = version * 4 + 17;
  const modules: boolean[][] = Array.from({ length: size }, () =>
    new Array<boolean>(size).fill(false),
  );
  const isFunction: boolean[][] = Array.from({ length: size }, () =>
    new Array<boolean>(size).fill(false),
  );

  const setFunction = (x: number, y: number, dark: boolean) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    modules[y][x] = dark;
    isFunction[y][x] = true;
  };

  // Finder patterns (3 köşe)
  const drawFinder = (cx: number, cy: number) => {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        setFunction(cx + dx, cy + dy, dist !== 2 && dist !== 4);
      }
    }
  };
  drawFinder(3, 3);
  drawFinder(size - 4, 3);
  drawFinder(3, size - 4);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    setFunction(i, 6, i % 2 === 0);
    setFunction(6, i, i % 2 === 0);
  }

  // Alignment patterns
  const alignPos = alignmentPositions(version);
  for (const ay of alignPos) {
    for (const ax of alignPos) {
      // Finder bölgeleriyle çakışanları atla
      if (
        (ax === 6 && ay === 6) ||
        (ax === 6 && ay === size - 7) ||
        (ax === size - 7 && ay === 6)
      ) {
        continue;
      }
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const dist = Math.max(Math.abs(dx), Math.abs(dy));
          setFunction(ax + dx, ay + dy, dist !== 1);
        }
      }
    }
  }

  // Format bilgisi (ECC seviyesi M + mask 0) — rezerve et
  const formatBits = 0b101010000010010; // ECC M (00) + mask 0, BCH ile
  for (let i = 0; i <= 5; i++) setFunction(8, i, ((formatBits >> i) & 1) !== 0);
  setFunction(8, 7, ((formatBits >> 6) & 1) !== 0);
  setFunction(8, 8, ((formatBits >> 7) & 1) !== 0);
  setFunction(7, 8, ((formatBits >> 8) & 1) !== 0);
  for (let i = 9; i < 15; i++) setFunction(14 - i, 8, ((formatBits >> i) & 1) !== 0);
  for (let i = 0; i < 8; i++) setFunction(size - 1 - i, 8, ((formatBits >> i) & 1) !== 0);
  for (let i = 8; i < 15; i++) setFunction(8, size - 15 + i, ((formatBits >> i) & 1) !== 0);
  setFunction(8, size - 8, true); // Dark module

  // Veri bitlerini yerleştir (zigzag, sağ alttan)
  let bitIndex = 0;
  const totalBits = codewords.length * 8;
  const getBit = (idx: number) => (codewords[idx >> 3] >> (7 - (idx & 7))) & 1;

  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5; // Timing sütununu atla
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (!isFunction[y][x] && bitIndex < totalBits) {
          modules[y][x] = getBit(bitIndex) === 1;
          bitIndex++;
        }
      }
    }
  }

  // Mask 0 uygula: (x + y) % 2 === 0
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!isFunction[y][x] && (x + y) % 2 === 0) {
        modules[y][x] = !modules[y][x];
      }
    }
  }

  return modules;
}

/**
 * Metinden QR kod matrisi üretir.
 * @returns boolean[][] — true = koyu modül
 */
export function generateQrMatrix(text: string): boolean[][] {
  const bytes = toUtf8(text);
  const version = pickVersion(bytes.length);
  const dataCodewords = buildDataCodewords(bytes, version);
  const allCodewords = interleave(dataCodewords, version);
  return buildMatrix(allCodewords, version);
}

/**
 * QR kodunu SVG path (`d` özniteliği) olarak üretir.
 * Tek bir `<path>` ile tüm koyu modülleri çizer — hafif ve ölçeklenebilir.
 */
export function generateQrSvgPath(text: string): { path: string; size: number } {
  const matrix = generateQrMatrix(text);
  const size = matrix.length;
  let d = "";
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (matrix[y][x]) {
        d += `M${x} ${y}h1v1h-1z`;
      }
    }
  }
  return { path: d, size };
}
