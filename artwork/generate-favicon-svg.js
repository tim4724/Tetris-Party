// Generate SVG favicons for classic and hex modes
// Usage: node artwork/generate-favicon-svg.js

const fs = require('fs');
const path = require('path');

const PINK = '#FF1493';
const GOLD = '#FFD700';

// --- Classic: T-piece with rounded-rect blocks ---
function generateClassicSVG() {
  // 3x2 grid: top row has center block, bottom row has 3 blocks
  // Block size 18, gap 2, total width = 3*18 + 2*2 = 58, height = 2*18 + 2 = 38
  const block = 18;
  const gap = 2;
  const totalW = 3 * block + 2 * gap;
  const totalH = 2 * block + gap;
  const r = 3;

  // Positions: [col, row]
  const cells = [[1,0], [0,1], [1,1], [2,1]];

  const rects = cells.map(([c, row]) => {
    const x = c * (block + gap);
    const y = row * (block + gap);
    return `  <rect x="${x}" y="${y}" width="${block}" height="${block}" rx="${r}" fill="${PINK}"/>`;
  }).join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW} ${totalH}">\n${rects}\n</svg>\n`;
}

// --- Hex: T-piece with flat-top hexagons ---
function generateHexSVG() {
  // Flat-top hex: pointy sides on left/right, flat on top/bottom
  const R = 10; // outer radius
  const hexW = 2 * R; // 20
  const hexH = Math.sqrt(3) * R; // ~17.32

  // Generate hex polygon points centered at (0,0)
  const hexPoints = [];
  for (let i = 0; i < 6; i++) {
    const angle = Math.PI / 3 * i;
    hexPoints.push(`${(R * Math.cos(angle)).toFixed(2)},${(R * Math.sin(angle)).toFixed(2)}`);
  }
  const hexPointsStr = hexPoints.join(' ');

  // T-piece on flat-top odd-q hex grid
  // Col spacing = 1.5 * R, odd columns shift down by hexH/2
  const gap = 1.5; // spacing between hexes, matching classic block gap
  const colSpacing = 1.5 * R + gap;

  // Offset grid cells: [col, row]
  // Bottom row: (0,1), (1,0), (2,1) — col 1 odd needs row-1 to align visually
  // Top cell:   (1,-1) — above center
  const gridCells = [[0,1], [1,0], [2,1], [1,-1]];

  // Convert grid (col, row) to pixel (cx, cy)
  const centers = gridCells.map(([col, row]) => {
    const cx = col * colSpacing;
    const rowH = hexH + gap;
    const cy = row * rowH + (col & 1 ? rowH / 2 : 0);
    return [cx, cy];
  });

  // Compute bounding box
  const allX = centers.flatMap(([cx]) => [cx - R, cx + R]);
  const allY = centers.flatMap(([, cy]) => [cy - hexH/2, cy + hexH/2]);
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

const classicSvg = generateClassicSVG();
const hexSvg = generateHexSVG();

fs.writeFileSync(path.resolve(publicDir, 'favicon-classic.svg'), classicSvg);
fs.writeFileSync(path.resolve(publicDir, 'favicon-hex.svg'), hexSvg);

console.log('Generated:');
console.log('  public/favicon-classic.svg');
console.log('  public/favicon-hex.svg');
