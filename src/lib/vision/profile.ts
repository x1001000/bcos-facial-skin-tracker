import type { Region, RegionMetrics, SkinProfile } from "../types";
import { REGIONS } from "../types";
import {
  REGION_LANDMARKS,
  pointInPolygon,
  polygonBounds,
  type Landmark,
} from "./rois";
import {
  rgbToLab,
  luma,
  laplacianVariance,
  sobelEdgeDensity,
  poreDensityProxy,
} from "./metrics";
import { estimatePose, frameQualityPasses } from "./quality";

// Build a tight ROI submask. Returns a Float32Array of luminance plus a
// Uint8Array mask covering the polygon bounding-box crop, along with the
// crop offset and dimensions.
function extractROI(
  imageData: ImageData,
  polygon: { x: number; y: number }[],
): {
  lum: Float32Array;
  mask: Uint8Array;
  w: number;
  h: number;
  pixels: { L: number; a: number; b: number }[];
  area: number;
} {
  const { minX, minY, maxX, maxY } = polygonBounds(polygon);
  const x0 = Math.max(0, Math.floor(minX));
  const y0 = Math.max(0, Math.floor(minY));
  const x1 = Math.min(imageData.width, Math.ceil(maxX));
  const y1 = Math.min(imageData.height, Math.ceil(maxY));
  const w = Math.max(1, x1 - x0);
  const h = Math.max(1, y1 - y0);
  const lum = new Float32Array(w * h);
  const mask = new Uint8Array(w * h);
  const pixels: { L: number; a: number; b: number }[] = [];
  const data = imageData.data;
  let area = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const gx = x + x0, gy = y + y0;
      const inside = pointInPolygon(gx + 0.5, gy + 0.5, polygon);
      if (!inside) continue;
      const di = (gy * imageData.width + gx) * 4;
      const r = data[di], g = data[di + 1], bb = data[di + 2];
      const i = y * w + x;
      lum[i] = luma(r, g, bb);
      mask[i] = 1;
      const [L, a, b] = rgbToLab(r, g, bb);
      pixels.push({ L, a, b });
      area++;
    }
  }
  return { lum, mask, w, h, pixels, area };
}

function meanOf<T>(xs: T[], pick: (t: T) => number) {
  if (xs.length === 0) return 0;
  let s = 0;
  for (const x of xs) s += pick(x);
  return s / xs.length;
}

const WRINKLE_REGIONS: Region[] = ["forehead", "perioral"];

export function buildProfile(
  imageData: ImageData,
  landmarks: Landmark[],
): SkinProfile {
  const W = imageData.width, H = imageData.height;
  const pose = estimatePose(landmarks, W, H);

  const per_region = {} as Record<Region, RegionMetrics>;
  // Compute frame-wide luminance for quality
  let frameLumSum = 0, frameLumN = 0;
  const fullLum = new Float32Array(W * H);
  const data = imageData.data;
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const l = luma(data[i], data[i + 1], data[i + 2]);
    fullLum[p] = l;
    frameLumSum += l;
    frameLumN++;
  }
  // We approximate L* via gamma-corrected luminance; for quality gate this is
  // adequate. We rescale into a 0-100ish band using a fixed factor.
  const frameLuminance = (frameLumSum / Math.max(1, frameLumN)) * (100 / 255);
  const frameBlur = laplacianVariance(fullLum, W, H);

  for (const region of REGIONS) {
    const idxs = REGION_LANDMARKS[region];
    const polygon = idxs
      .filter((i) => i < landmarks.length)
      .map((i) => ({ x: landmarks[i].x * W, y: landmarks[i].y * H }));
    if (polygon.length < 3) {
      per_region[region] = { L: 0, a: 0, b: 0, texture: 0, pore: 0, wrinkle: 0 };
      continue;
    }
    const { lum, mask, w, h, pixels, area } = extractROI(imageData, polygon);
    if (area < 16) {
      per_region[region] = { L: 0, a: 0, b: 0, texture: 0, pore: 0, wrinkle: 0 };
      continue;
    }
    const L = meanOf(pixels, (p) => p.L);
    const a = meanOf(pixels, (p) => p.a);
    const b = meanOf(pixels, (p) => p.b);
    const texture = laplacianVariance(lum, w, h, mask);
    const pore = poreDensityProxy(lum, w, h, mask);
    const wrinkle = WRINKLE_REGIONS.includes(region)
      ? sobelEdgeDensity(lum, w, h, mask)
      : 0;
    per_region[region] = { L, a, b, texture, pore, wrinkle };
  }

  const symmetry = Math.abs(
    per_region.left_cheek.a - per_region.right_cheek.a,
  );
  const overall_texture =
    (per_region.forehead.texture +
      per_region.left_cheek.texture +
      per_region.right_cheek.texture +
      per_region.nose.texture) / 4;
  const overall_redness =
    (per_region.left_cheek.a +
      per_region.right_cheek.a +
      per_region.nose.a) / 3;

  const quality = {
    yaw: pose.yaw,
    pitch: pose.pitch,
    luminance: frameLuminance,
    ipd: pose.ipd,
    blur: frameBlur,
    passed: false,
  };
  quality.passed = frameQualityPasses(quality).passed;

  return { quality, per_region, global: { symmetry, overall_texture, overall_redness } };
}
