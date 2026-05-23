import type { Region } from "../types";

export type Landmark = { x: number; y: number; z: number };

// Landmark index sets per region (MediaPipe Face Landmarker, 478-point mesh).
// These are illustrative anatomical hulls — picked to be stable across pose,
// not biologically optimal. They form a polygon on the image plane.
export const REGION_LANDMARKS: Record<Region, number[]> = {
  forehead: [10, 109, 67, 103, 54, 68, 104, 69, 108, 151, 337, 299, 333, 298, 301, 284, 332, 297, 338],
  left_cheek: [116, 117, 118, 119, 120, 100, 142, 36, 205, 187, 207, 216, 212, 202, 50],
  right_cheek: [345, 346, 347, 348, 349, 329, 371, 266, 425, 411, 427, 436, 432, 422, 280],
  nose: [168, 6, 197, 195, 5, 4, 1, 19, 94, 2, 326, 327, 358, 429, 437, 343, 277, 47, 114, 188, 122, 196, 174, 198, 209],
  perioral: [186, 92, 165, 167, 164, 393, 391, 322, 410, 287, 273, 335, 406, 313, 18, 83, 182, 106, 43, 57, 192, 213, 147],
  chin: [152, 175, 199, 396, 369, 396, 175, 200, 18, 83, 313, 421, 201, 208, 32, 140, 176, 148, 171, 200],
};

export function polygonBounds(points: { x: number; y: number }[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

// Ray casting point-in-polygon.
export function pointInPolygon(
  x: number,
  y: number,
  poly: { x: number; y: number }[],
): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function regionPolygon(
  landmarks: Landmark[],
  region: Region,
  width: number,
  height: number,
): { x: number; y: number }[] {
  return REGION_LANDMARKS[region]
    .filter((i) => i < landmarks.length)
    .map((i) => ({ x: landmarks[i].x * width, y: landmarks[i].y * height }));
}
