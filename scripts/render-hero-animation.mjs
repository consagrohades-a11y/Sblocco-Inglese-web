import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import Module, { createRequire } from 'node:module';
import { promisify } from 'node:util';

const rootDir = process.cwd();
const outputDir = path.join(rootDir, 'public', 'assets');
const checksDir = path.join(rootDir, '.codex', 'visual-checks');
const frameDir = path.join(rootDir, '.codex', 'hero-frames-v6');
const width = 1920;
const height = 1080;
const fps = 30;
const seconds = 10;
const frameCount = fps * seconds;
const execFileAsync = promisify(execFile);

const bundledNodeModules = path.join(
  os.homedir(),
  '.cache',
  'codex-runtimes',
  'codex-primary-runtime',
  'dependencies',
  'node',
  'node_modules',
);

if (await exists(bundledNodeModules)) {
  const pnpmModules = path.join(bundledNodeModules, '.pnpm', 'node_modules');
  process.env.NODE_PATH = [process.env.NODE_PATH, bundledNodeModules, pnpmModules].filter(Boolean).join(path.delimiter);
  Module._initPaths();
}

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

await fs.mkdir(outputDir, { recursive: true });
await fs.mkdir(checksDir, { recursive: true });
await fs.rm(frameDir, { recursive: true, force: true });
await fs.mkdir(frameDir, { recursive: true });

const ffmpegPath = await findFfmpegPath();

const chromePath = await firstExistingPath([
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
]);

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
});

try {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.setContent(buildHtml(), { waitUntil: 'load' });

  const poster = await page.evaluate(() => window.heroRenderer.capturePng(0.84));
  await writeDataUrl(path.join(outputDir, 'sblocco-hero-poster-v6.png'), poster);

  const frames = [
    ['v6-hero-start.png', 0.08],
    ['v6-hero-unlock.png', 0.34],
    ['v6-hero-brand.png', 0.84],
  ];

  for (const [fileName, time] of frames) {
    const png = await page.evaluate((t) => window.heroRenderer.capturePng(t), time);
    await writeDataUrl(path.join(checksDir, fileName), png);
  }

  for (let frame = 0; frame < frameCount; frame += 1) {
    const png = await page.evaluate((t) => window.heroRenderer.capturePng(t), frame / frameCount);
    await writeDataUrl(path.join(frameDir, `frame-${String(frame).padStart(3, '0')}.png`), png);
  }

  await runFfmpeg(
    [
      '-y',
      '-framerate',
      String(fps),
      '-i',
      path.join(frameDir, 'frame-%03d.png'),
      '-t',
      String(seconds),
      '-an',
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      path.join(outputDir, 'sblocco-hero-loop-v6.mp4'),
    ],
    'MP4',
  );

  await runFfmpeg(
    [
      '-y',
      '-framerate',
      String(fps),
      '-i',
      path.join(frameDir, 'frame-%03d.png'),
      '-t',
      String(seconds),
      '-an',
      '-c:v',
      'libvpx-vp9',
      '-b:v',
      '0',
      '-crf',
      '34',
      '-deadline',
      'good',
      '-cpu-used',
      '4',
      '-pix_fmt',
      'yuv420p',
      path.join(outputDir, 'sblocco-hero-loop-v6.webm'),
    ],
    'WebM',
  );
} finally {
  await browser.close();
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function firstExistingPath(paths) {
  for (const candidate of paths) {
    if (await exists(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

async function findFfmpegPath() {
  const binaryDir = path.join(rootDir, '.codex', 'python-video-tools', 'imageio_ffmpeg', 'binaries');
  const files = await fs.readdir(binaryDir).catch(() => []);
  const binary = files.find((fileName) => fileName.startsWith('ffmpeg') && fileName.endsWith('.exe'));

  if (!binary) {
    throw new Error(
      'Missing ffmpeg helper. Install it with: python -m pip install --target .codex/python-video-tools imageio-ffmpeg',
    );
  }

  return path.join(binaryDir, binary);
}

async function runFfmpeg(args, label) {
  try {
    await execFileAsync(ffmpegPath, args, { maxBuffer: 1024 * 1024 * 24 });
  } catch (error) {
    throw new Error(`${label} encode failed:\n${error.stderr || error.message}`);
  }
}

async function writeDataUrl(filePath, dataUrl) {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  await fs.writeFile(filePath, Buffer.from(base64, 'base64'));
}

function buildHtml() {
  return String.raw`
<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      html,
      body {
        margin: 0;
        background: #f2ecdf;
      }

      canvas {
        display: block;
      }
    </style>
  </head>
  <body>
    <canvas id="stage" width="${width}" height="${height}"></canvas>
    <script>
      const canvas = document.getElementById('stage');
      const ctx = canvas.getContext('2d');
      const W = canvas.width;
      const H = canvas.height;
      const TAU = Math.PI * 2;

      const color = {
        beige: '#f2ecdf',
        sage: '#7d957c',
        terracotta: '#c96545',
        white: '#ffffff',
        charcoal: '#2f332f',
      };

      function clamp(value, min = 0, max = 1) {
        return Math.min(max, Math.max(min, value));
      }

      function mix(a, b, t) {
        return a + (b - a) * t;
      }

      function smooth01(value) {
        const t = clamp(value);
        return t * t * (3 - 2 * t);
      }

      function between(sec, start, end) {
        return smooth01((sec - start) / (end - start));
      }

      function rgba(hex, alpha) {
        const clean = hex.replace('#', '');
        const r = parseInt(clean.slice(0, 2), 16);
        const g = parseInt(clean.slice(2, 4), 16);
        const b = parseInt(clean.slice(4, 6), 16);
        return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
      }

      function rounded(x, y, w, h, r) {
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, r);
      }

      function fillRound(x, y, w, h, r, fill) {
        rounded(x, y, w, h, r);
        ctx.fillStyle = fill;
        ctx.fill();
      }

      function strokeRound(x, y, w, h, r, stroke, lineWidth = 4) {
        rounded(x, y, w, h, r);
        ctx.strokeStyle = stroke;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      }

      function fillStrokeRound(x, y, w, h, r, fill, stroke, lineWidth = 4) {
        fillRound(x, y, w, h, r, fill);
        strokeRound(x, y, w, h, r, stroke, lineWidth);
      }

      function withAlpha(alpha, draw) {
        if (alpha <= 0.001) return;
        ctx.save();
        ctx.globalAlpha *= clamp(alpha);
        draw();
        ctx.restore();
      }

      function drawBackground(t) {
        ctx.fillStyle = color.beige;
        ctx.fillRect(0, 0, W, H);

        const drift = Math.sin(t * TAU) * 7;
        ctx.fillStyle = color.sage;
        ctx.beginPath();
        ctx.arc(-34 + drift, -42, 300, 0, TAU);
        ctx.fill();

        fillRound(1510 - drift, 70, 340, 160, 76, color.terracotta);
        fillRound(70 + drift, 875, 420, 150, 76, color.sage);
      }

      function drawBadge(x, y, label, fill, alpha = 1) {
        withAlpha(alpha, () => {
          fillRound(x, y, 170, 98, 49, fill);
          ctx.fillStyle = color.white;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = '900 50px Arial, Helvetica, sans-serif';
          ctx.fillText(label, x + 85, y + 51);
        });
      }

      function drawArrow(x1, y, x2, progress, alpha) {
        withAlpha(alpha, () => {
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.lineWidth = 10;
          ctx.strokeStyle = rgba(color.charcoal, 0.18);
          ctx.beginPath();
          ctx.moveTo(x1, y);
          ctx.lineTo(x2, y);
          ctx.stroke();

          ctx.strokeStyle = color.sage;
          ctx.beginPath();
          ctx.moveTo(x1, y);
          ctx.lineTo(mix(x1, x2, progress), y);
          ctx.stroke();

          const headX = x2;
          ctx.strokeStyle = color.sage;
          ctx.beginPath();
          ctx.moveTo(headX - 32, y - 24);
          ctx.lineTo(headX, y);
          ctx.lineTo(headX - 32, y + 24);
          ctx.stroke();
        });
      }

      function drawLock(cx, cy, open, alpha, scale = 1) {
        withAlpha(alpha, () => {
          ctx.save();
          ctx.translate(cx, cy);
          ctx.scale(scale, scale);
          const lockColor = open > 0.55 ? color.sage : color.terracotta;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.strokeStyle = lockColor;
          ctx.lineWidth = 12;

          fillStrokeRound(-56, -2, 112, 86, 24, color.white, lockColor, 12);

          ctx.beginPath();
          if (open < 0.5) {
            ctx.arc(0, 0, 48, Math.PI, 0, false);
            ctx.lineTo(48, 6);
            ctx.moveTo(-48, 6);
          } else {
            const lift = between(open, 0.48, 1) * 18;
            ctx.arc(22, -lift, 48, Math.PI * 1.03, Math.PI * 1.83, false);
            ctx.lineTo(90, -2);
          }
          ctx.stroke();

          ctx.fillStyle = lockColor;
          ctx.beginPath();
          ctx.arc(0, 40, 9, 0, TAU);
          ctx.fill();
          ctx.restore();
        });
      }

      function drawSpeechIcon(x, y, size, fill, alpha) {
        withAlpha(alpha, () => {
          fillRound(x, y, size, size * 0.66, size * 0.16, rgba(fill, 0.16));
          ctx.fillStyle = fill;
          ctx.beginPath();
          ctx.moveTo(x + size * 0.22, y + size * 0.66);
          ctx.lineTo(x + size * 0.33, y + size * 0.84);
          ctx.lineTo(x + size * 0.45, y + size * 0.66);
          ctx.closePath();
          ctx.fill();
          fillRound(x + size * 0.18, y + size * 0.22, size * 0.46, size * 0.08, size * 0.04, fill);
          fillRound(x + size * 0.18, y + size * 0.38, size * 0.64, size * 0.08, size * 0.04, fill);
        });
      }

      function drawPencilIcon(x, y, size, alpha) {
        withAlpha(alpha, () => {
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.lineWidth = size * 0.12;
          ctx.strokeStyle = color.terracotta;
          ctx.beginPath();
          ctx.moveTo(x + size * 0.18, y + size * 0.76);
          ctx.lineTo(x + size * 0.74, y + size * 0.2);
          ctx.stroke();

          ctx.strokeStyle = color.sage;
          ctx.beginPath();
          ctx.moveTo(x + size * 0.28, y + size * 0.82);
          ctx.lineTo(x + size * 0.86, y + size * 0.82);
          ctx.stroke();
        });
      }

      function drawProgressIcon(x, y, size, progress, alpha) {
        withAlpha(alpha, () => {
          ctx.lineCap = 'round';
          ctx.lineWidth = size * 0.1;
          ctx.strokeStyle = rgba(color.charcoal, 0.14);
          ctx.beginPath();
          ctx.moveTo(x, y + size * 0.64);
          ctx.lineTo(x + size, y + size * 0.64);
          ctx.stroke();

          ctx.strokeStyle = color.sage;
          ctx.beginPath();
          ctx.moveTo(x, y + size * 0.64);
          ctx.lineTo(x + size * progress, y + size * 0.64);
          ctx.stroke();

          ctx.strokeStyle = color.sage;
          ctx.lineWidth = size * 0.085;
          ctx.beginPath();
          ctx.moveTo(x + size * 0.66, y + size * 0.38);
          ctx.lineTo(x + size * 0.8, y + size * 0.22);
          ctx.lineTo(x + size * 0.94, y + size * 0.38);
          ctx.stroke();
        });
      }

      function drawProcessCard(x, y, w, h, active, kind, progress) {
        const slide = 28 * (1 - active);
        withAlpha(active, () => {
          ctx.save();
          ctx.translate(0, slide);
          ctx.shadowColor = rgba(color.charcoal, 0.08);
          ctx.shadowBlur = 0;
          ctx.shadowOffsetY = 12;
          fillStrokeRound(x, y, w, h, 32, color.white, rgba(color.charcoal, 0.1), 4);
          ctx.shadowColor = 'transparent';

          if (kind === 'practice') {
            drawSpeechIcon(x + 52, y + 52, 126, color.terracotta, 1);
            drawSpeechIcon(x + 126, y + 84, 126, color.sage, progress);
          }

          if (kind === 'correction') {
            drawPencilIcon(x + 74, y + 48, 130, 1);
            fillRound(x + 206, y + 68, 184, 18, 9, rgba(color.terracotta, 0.95));
            fillRound(x + 206, y + 108, 234 * progress, 18, 9, color.sage);
          }

          if (kind === 'confidence') {
            drawProgressIcon(x + 58, y + 56, 300, clamp(0.22 + progress * 0.72), 1);
            fillRound(x + 90, y + 130, 74, 18, 9, color.sage);
            fillRound(x + 190, y + 130, 132, 18, 9, rgba(color.charcoal, 0.18));
          }
          ctx.restore();
        });
      }

      function drawPanel(t, alpha) {
        const sec = t * 10;
        const intro = between(sec, 0.18, 1.2);
        const unlock = between(sec, 2.0, 3.35);
        const practice = between(sec, 3.2, 4.15);
        const correction = between(sec, 4.25, 5.15);
        const confidence = between(sec, 5.2, 6.55);
        const progress = between(sec, 5.1, 7.15);

        const x = 260;
        const y = mix(230, 170, intro);
        const w = 1400;
        const h = 740;

        withAlpha(alpha, () => {
          ctx.save();
          ctx.shadowColor = rgba(color.charcoal, 0.09);
          ctx.shadowBlur = 0;
          ctx.shadowOffsetY = 18;
          fillStrokeRound(x, y, w, h, 44, color.white, rgba(color.charcoal, 0.12), 4);
          ctx.shadowColor = 'transparent';

          drawBadge(x + 152, y + 104, 'IT', color.terracotta, 1);
          drawBadge(x + w - 322, y + 104, 'EN', color.sage, 1);
          drawArrow(x + 420, y + 153, x + w - 430, clamp(unlock), 1);
          drawLock(x + w / 2, y + 153, unlock, 1, 1.2);

          drawProcessCard(x + 170, y + 314, 304, 220, clamp(practice + 0.2), 'practice', unlock);
          drawProcessCard(x + 548, y + 314, 304, 220, correction, 'correction', correction);
          drawProcessCard(x + 926, y + 314, 304, 220, confidence, 'confidence', progress);

          const barX = x + 300;
          const barY = y + 620;
          const barW = 800;
          fillRound(barX, barY, barW, 30, 15, rgba(color.charcoal, 0.1));
          fillRound(barX, barY, barW * clamp(0.08 + progress * 0.9), 30, 15, color.sage);
          fillRound(barX + barW * clamp(0.08 + progress * 0.9) - 22, barY - 7, 44, 44, 22, color.terracotta);

          ctx.restore();
        });
      }

      function drawLogoMark(cx, cy, scale, alpha) {
        withAlpha(alpha, () => {
          ctx.save();
          ctx.translate(cx, cy);
          ctx.scale(scale, scale);

          ctx.shadowColor = rgba(color.charcoal, 0.08);
          ctx.shadowBlur = 0;
          ctx.shadowOffsetY = 14;
          fillStrokeRound(-130, -84, 260, 168, 42, color.white, color.sage, 12);
          ctx.shadowColor = 'transparent';

          ctx.fillStyle = color.white;
          ctx.beginPath();
          ctx.moveTo(-52, 78);
          ctx.lineTo(-14, 132);
          ctx.lineTo(26, 78);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = color.sage;
          ctx.lineWidth = 12;
          ctx.stroke();

          drawLock(0, -2, 1, 1);
          ctx.restore();
        });
      }

      function drawBrandScreen(t, alpha) {
        const sec = t * 10;
        const enter = between(sec, 7.15, 8.1);
        const exit = 1 - between(sec, 8.85, 9.75);
        const a = alpha * enter * exit;
        const y = mix(390, 350, enter);

        drawLogoMark(W / 2, y, mix(0.86, 1, enter), a);

        withAlpha(a, () => {
          ctx.fillStyle = color.charcoal;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = '900 88px Arial, Helvetica, sans-serif';
          ctx.fillText('Sblocco Inglese', W / 2, y + 300);

          fillRound(W / 2 - 170, y + 392, 340, 74, 37, color.sage);
          fillRound(W / 2 - 92, y + 418, 184, 18, 9, color.white);
        });
      }

      function drawScene(t) {
        const sec = t * 10;
        const intro = between(sec, 0.18, 1.2);
        const exit = 1 - between(sec, 8.85, 9.75);
        const final = between(sec, 7.15, 8.1);
        const mainAlpha = intro * exit * (1 - final);

        drawBackground(t);
        drawPanel(t, mainAlpha);
        drawBrandScreen(t, 1);
      }

      function capturePng(t) {
        drawScene(t);
        return canvas.toDataURL('image/png');
      }

      window.heroRenderer = {
        capturePng,
      };

      drawScene(0);
    </script>
  </body>
</html>`;
}
