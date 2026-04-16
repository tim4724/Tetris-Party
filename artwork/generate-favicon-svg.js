// Generate SVG favicon — "d"-silhouette hex piece (chevron ribbon + right stem).
// Usage: node artwork/generate-favicon-svg.js

const fs = require('fs');
const path = require('path');

const GOLD = '#FFD700';

// Four hex cells forming a "d"-silhouette in flat-top layout:
//   bowl-ish row going down-left + stem going up on the right.
// Cells are in axial (q, r). This is the q piece from HEX_PIECES mirrored
// horizontally — visually reads as lowercase "d".
const CELLS = [
  [1,  0],  // lower-right (base of stem)
  [0,  0],  // middle
  [-1, 0],  // upper-left
  [1, -1],  // upper-right (top of stem)
];

function generateHexSVG() {
  const R = 10; // outer radius
  const hexH = Math.sqrt(3) * R;

  const hexPoints = [];
  for (let i = 0; i < 6; i++) {
    const angle = Math.PI / 3 * i;
    hexPoints.push(`${(R * Math.cos(angle)).toFixed(2)},${(R * Math.sin(angle)).toFixed(2)}`);
  }
  const hexPointsStr = hexPoints.join(' ');

  // Flat-top layout: cx = 1.5 * R * q, cy = hexH * (r + q/2)
  // (No gap — cells touch, matching the game's renderer.)
  const centers = CELLS.map(([q, r]) => [1.5 * R * q, hexH * (r + q / 2)]);

  const allX = centers.flatMap(([cx]) => [cx - R, cx + R]);
  const allY = centers.flatMap(([, cy]) => [cy - hexH / 2, cy + hexH / 2]);
  const minX = Math.min(...allX);
  const minY = Math.min(...allY);
  const maxX = Math.max(...allX);
  const maxY = Math.max(...allY);

  const pad = 0.5;
  const vbX = minX - pad;
  const vbY = minY - pad;
  const vbW = maxX - minX + pad * 2;
  const vbH = maxY - minY + pad * 2;

  const hexes = centers.map(([cx, cy]) =>
    `  <polygon points="${hexPointsStr}" transform="translate(${cx.toFixed(2)},${cy.toFixed(2)})" fill="${GOLD}"/>`
  ).join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vbX.toFixed(2)} ${vbY.toFixed(2)} ${vbW.toFixed(2)} ${vbH.toFixed(2)}">\n${hexes}\n</svg>\n`;
}

const publicDir = path.resolve(__dirname, '..', 'public');

fs.writeFileSync(path.resolve(publicDir, 'favicon.svg'), generateHexSVG());

console.log('Generated: public/favicon.svg');
console.log('Run `magick` to regenerate favicon.ico from the SVG:');
console.log('  magick -background none -density 384 public/favicon.svg -resize "48x48>" -gravity center -extent 48x48 /tmp/favicon-48.png');
console.log('  (repeat for 16, 32, 64 and bundle: magick /tmp/favicon-*.png public/favicon.ico)');
