// Both CardCanvas (full editor preview) and the Templates thumbnails need to
// compute the exact same clamped width/height for a given ratio — previously
// they used different math, which is why thumbnails overflowed their boxes.
export function getDisplayDims(ratioW, ratioH, maxW = 420, maxH = 460) {
  let w = maxW, h = Math.round(w * (ratioH / ratioW));
  if (h > maxH) { h = maxH; w = Math.round(h * (ratioW / ratioH)); }
  return { w, h };
}
