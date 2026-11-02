const WIDTH = 1080;
const HEIGHT = 1810;
const FONT = "'PingFang SC','Microsoft YaHei',system-ui,sans-serif";

function rounded(ctx, x, y, width, height, radius, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();
}

function lines(ctx, value, maxWidth, maxLines) {
  const result = [];
  let line = '';
  const text = String(value);
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (ctx.measureText(line + char).width > maxWidth && line) {
      if (result.length === maxLines - 1) { line = `${line.slice(0, -1)}…`; break; }
      result.push(line); line = char;
    } else line += char;
  }
  if (result.length < maxLines) result.push(line);
  return result;
}

function drawParagraph(ctx, value, x, y, maxWidth, maxLines, lineHeight) {
  const parts = lines(ctx, value, maxWidth, maxLines);
  parts.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
}

function drawPhoto(ctx, image, x, y, size) {
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  const crop = Math.min(width, height);
  const sourceX = (width - crop) / 2;
  const sourceY = (height - crop) / 2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(image, sourceX, sourceY, crop, crop, x, y, size, size);
  ctx.restore();
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2 + 2, 0, Math.PI * 2);
  ctx.strokeStyle = '#f1c387';
  ctx.lineWidth = 8;
  ctx.stroke();
}

export function makePoster({ kind, name, primary, secondary, factors, url, photo, tidbit }) {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('当前浏览器无法生成图片');
  const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  gradient.addColorStop(0, '#31243f');
  gradient.addColorStop(1, '#211a31');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = '#f7c384';
  ctx.font = `800 36px ${FONT}`;
  ctx.fillText('✦  猫狗性格研究所', 80, 108);
  ctx.fillStyle = '#cdbbd7';
  ctx.font = `26px ${FONT}`;
  ctx.fillText('从日常里，读懂它的小世界', 80, 154);

  rounded(ctx, 64, 205, 952, 1435, 42, '#fffaf6');
  if (photo?.naturalWidth && photo?.naturalHeight) drawPhoto(ctx, photo, 112, 257, 190);
  else {
    rounded(ctx, 112, 260, 150, 150, 30, '#3a2c4b');
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f7c384';
    ctx.font = `900 39px ${FONT}`;
    ctx.fillText(primary.code, 187, 352, 135);
  }
  ctx.textAlign = 'left';
  ctx.fillStyle = '#986ea8';
  ctx.font = `800 27px ${FONT}`;
  ctx.fillText(`主${kind === 'cat' ? '猫' : '狗'}格 · 25种趣味画像之一`, photo ? 332 : 296, 292);
  ctx.fillStyle = '#30243f';
  ctx.font = `900 71px ${FONT}`;
  ctx.fillText(primary.name, photo ? 328 : 292, 371, photo ? 600 : 645);
  if (photo) {
    ctx.fillStyle = '#a8779c';
    ctx.font = `800 27px ${FONT}`;
    ctx.fillText(primary.code, 332, 418, 570);
  }
  ctx.fillStyle = '#7f6f86';
  ctx.font = `29px ${FONT}`;
  ctx.fillText(`${name} · ${primary.accent}`, 112, 476, 850);

  rounded(ctx, 112, 520, 856, 266, 25, '#f4edf7');
  ctx.fillStyle = '#67477d';
  ctx.font = `800 28px ${FONT}`;
  ctx.fillText('它的性格综述', 146, 574);
  ctx.fillStyle = '#4d4057';
  ctx.font = `26px ${FONT}`;
  drawParagraph(ctx, `${primary.longName}。${primary.story}${primary.overview}`, 146, 627, 778, 5, 38);

  rounded(ctx, 112, 810, 856, 290, 25, '#f9f2e9');
  ctx.fillStyle = '#a67555';
  ctx.font = `800 28px ${FONT}`;
  ctx.fillText(kind === 'cat' ? '小猫趣闻 · 日常情境示例' : '小狗趣闻 · 日常情境示例', 146, 864);
  ctx.fillStyle = '#4d4057';
  ctx.font = `26px ${FONT}`;
  drawParagraph(ctx, tidbit || '', 146, 917, 778, 5, 38);

  rounded(ctx, 112, 1126, 856, 120, 22, '#fff0df');
  ctx.fillStyle = '#a67555';
  ctx.font = `700 25px ${FONT}`;
  ctx.fillText(`还有一点副${kind === 'cat' ? '猫' : '狗'}格`, 143, 1171);
  ctx.fillStyle = '#4d4057';
  ctx.font = `800 39px ${FONT}`;
  ctx.fillText(secondary.name, 143, 1221);

  ctx.fillStyle = '#67477d';
  ctx.font = `800 29px ${FONT}`;
  ctx.fillText('五项行为观察', 112, 1308);
  factors.forEach((factor, index) => {
    const y = 1355 + index * 47;
    ctx.fillStyle = '#63566d';
    ctx.font = `25px ${FONT}`;
    ctx.fillText(factor.name, 112, y, 300);
    rounded(ctx, 410, y - 19, 408, 15, 8, '#ece3ed');
    if (factor.score !== null) rounded(ctx, 410, y - 19, Math.max(1, Math.round(408 * factor.score / 100)), 15, 8, '#b383ba');
    ctx.textAlign = 'right';
    ctx.fillStyle = '#67477d';
    ctx.font = `700 26px ${FONT}`;
    ctx.fillText(factor.score === null ? '暂无' : `${factor.score}`, 965, y);
    ctx.textAlign = 'left';
  });

  ctx.fillStyle = '#bcaec8';
  ctx.font = `24px ${FONT}`;
  ctx.fillText('原创趣味测试 · 结果不是诊断或固定标签', 78, 1702);
  ctx.fillStyle = '#f7c384';
  ctx.font = `23px ${FONT}`;
  ctx.fillText(url, 78, 1744, 920);
  return canvas.toDataURL('image/png');
}

export function pngFile(dataUrl, filename) {
  const binary = atob(dataUrl.split(',')[1]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: 'image/png' });
}
