// Rasterises a traced favicon path (even-odd) and compares it with the logo's alpha mask.
export function pathPolys(svg) {
  const d = svg.match(/ d="([^"]+)"/)[1];
  return d.split('M').filter(Boolean).map((s) => s.replace('Z', '').split('L').map((p) => p.split(' ').map(Number)));
}
export function evenOdd(polys, x, y) {
  let inside = false;
  for (const poly of polys) {
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}
