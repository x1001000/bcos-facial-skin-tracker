// sRGB -> CIELAB (D65). Standard reference-white conversion.
export function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  // sRGB companding
  const inv = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const R = inv(r), G = inv(g), B = inv(b);
  // sRGB -> XYZ (D65)
  const X = R * 0.4124564 + G * 0.3575761 + B * 0.1804375;
  const Y = R * 0.2126729 + G * 0.7151522 + B * 0.072175;
  const Z = R * 0.0193339 + G * 0.119192 + B * 0.9503041;
  // Normalize by D65 reference white
  const Xn = X / 0.95047, Yn = Y / 1.0, Zn = Z / 1.08883;
  const f = (t: number) =>
    t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  const fx = f(Xn), fy = f(Yn), fz = f(Zn);
  const L = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const b2 = 200 * (fy - fz);
  return [L, a, b2];
}

export function luma(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

// Variance of Laplacian on a luminance array laid out row-major (w, h).
// Higher value = sharper image; we use it as both a focus check and an inverse
// smoothness proxy (more variance over short kernel = rougher).
export function laplacianVariance(
  lum: Float32Array,
  w: number,
  h: number,
  mask?: Uint8Array,
): number {
  // 3x3 Laplacian kernel.
  let sum = 0, sumSq = 0, n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      if (mask && !mask[idx]) continue;
      const v =
        -lum[idx - w - 1] - lum[idx - w] - lum[idx - w + 1] -
        lum[idx - 1] + 8 * lum[idx] - lum[idx + 1] -
        lum[idx + w - 1] - lum[idx + w] - lum[idx + w + 1];
      sum += v;
      sumSq += v * v;
      n++;
    }
  }
  if (n === 0) return 0;
  const mean = sum / n;
  return sumSq / n - mean * mean;
}

// Sobel edge density: fraction of in-mask pixels whose gradient magnitude
// exceeds threshold. Used as a wrinkle proxy on forehead/perioral.
export function sobelEdgeDensity(
  lum: Float32Array,
  w: number,
  h: number,
  mask: Uint8Array,
  threshold = 30,
): number {
  let edges = 0, n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      if (!mask[idx]) continue;
      n++;
      const gx =
        -lum[idx - w - 1] - 2 * lum[idx - 1] - lum[idx + w - 1] +
        lum[idx - w + 1] + 2 * lum[idx + 1] + lum[idx + w + 1];
      const gy =
        -lum[idx - w - 1] - 2 * lum[idx - w] - lum[idx - w + 1] +
        lum[idx + w - 1] + 2 * lum[idx + w] + lum[idx + w + 1];
      const mag = Math.sqrt(gx * gx + gy * gy);
      if (mag > threshold) edges++;
    }
  }
  return n === 0 ? 0 : (edges / n) * 100;
}

// Pore-density proxy: count pixels significantly darker than a local
// average and divide by region area. We approximate the local average with
// a 9x9 box blur and threshold at meanLocal - k*sigmaLocal.
export function poreDensityProxy(
  lum: Float32Array,
  w: number,
  h: number,
  mask: Uint8Array,
  k = 1.5,
): number {
  const blur = boxBlur(lum, w, h, 4);
  let dark = 0, n = 0;
  // Single-pass sigma over masked pixels
  let sum = 0, sumSq = 0, m = 0;
  for (let i = 0; i < lum.length; i++) {
    if (!mask[i]) continue;
    sum += lum[i];
    sumSq += lum[i] * lum[i];
    m++;
  }
  if (m === 0) return 0;
  const mean = sum / m;
  const sigma = Math.sqrt(Math.max(0, sumSq / m - mean * mean));
  for (let i = 0; i < lum.length; i++) {
    if (!mask[i]) continue;
    n++;
    if (lum[i] < blur[i] - k * sigma) dark++;
  }
  return n === 0 ? 0 : (dark / n) * 1000;
}

function boxBlur(src: Float32Array, w: number, h: number, r: number): Float32Array {
  const out = new Float32Array(src.length);
  // separable box blur
  const tmp = new Float32Array(src.length);
  for (let y = 0; y < h; y++) {
    let acc = 0;
    for (let x = -r; x <= r; x++) acc += src[y * w + Math.max(0, Math.min(w - 1, x))];
    for (let x = 0; x < w; x++) {
      tmp[y * w + x] = acc / (2 * r + 1);
      const add = src[y * w + Math.min(w - 1, x + r + 1)];
      const sub = src[y * w + Math.max(0, x - r)];
      acc += add - sub;
    }
  }
  for (let x = 0; x < w; x++) {
    let acc = 0;
    for (let y = -r; y <= r; y++) acc += tmp[Math.max(0, Math.min(h - 1, y)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = acc / (2 * r + 1);
      const add = tmp[Math.min(h - 1, y + r + 1) * w + x];
      const sub = tmp[Math.max(0, y - r) * w + x];
      acc += add - sub;
    }
  }
  return out;
}
