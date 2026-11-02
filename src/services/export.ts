import { CanvasItem, ProjectData } from '../types/canvas';
import { getItemBounds, getMultiItemBounds } from '../utils/geometry';
import { drawSmoothStroke, pointsToSvgPath } from '../utils/smoothing';

export function renderItemsToCanvas(
  ctx: CanvasRenderingContext2D,
  items: CanvasItem[],
  offsetX: number = 0,
  offsetY: number = 0
) {
  for (const item of items) {
    ctx.save();
    ctx.translate(offsetX, offsetY);

    if (item.type === 'stroke') {
      drawSmoothStroke(ctx, item.points, item.strokeColor, item.strokeWidth, item.opacity);
    } else if (item.type === 'shape') {
      ctx.globalAlpha = item.opacity;
      const center = {
        x: item.x + item.width / 2,
        y: item.y + item.height / 2,
      };
      if (item.rotation) {
        ctx.translate(center.x, center.y);
        ctx.rotate((item.rotation * Math.PI) / 180);
        ctx.translate(-center.x, -center.y);
      }

      ctx.lineWidth = item.strokeWidth;
      ctx.strokeStyle = item.strokeColor;
      ctx.fillStyle = item.hasFill && item.fillColor ? item.fillColor : 'transparent';

      ctx.beginPath();
      if (item.shapeType === 'rect' || item.shapeType === 'square') {
        const radius = Math.min(6, Math.min(item.width, item.height) / 8);
        ctx.roundRect(item.x, item.y, item.width, item.height, radius);
      } else if (item.shapeType === 'circle' || item.shapeType === 'ellipse') {
        const rx = Math.max(1, item.width / 2);
        const ry = Math.max(1, item.height / 2);
        ctx.ellipse(item.x + rx, item.y + ry, rx, ry, 0, 0, Math.PI * 2);
      } else if (item.shapeType === 'triangle') {
        ctx.moveTo(item.x + item.width / 2, item.y);
        ctx.lineTo(item.x + item.width, item.y + item.height);
        ctx.lineTo(item.x, item.y + item.height);
        ctx.closePath();
      } else if (item.shapeType === 'trapezoid') {
        const inset = item.width * 0.22;
        ctx.moveTo(item.x + inset, item.y);
        ctx.lineTo(item.x + item.width - inset, item.y);
        ctx.lineTo(item.x + item.width, item.y + item.height);
        ctx.lineTo(item.x, item.y + item.height);
        ctx.closePath();
      } else if (item.shapeType === 'line') {
        ctx.moveTo(item.x, item.y);
        ctx.lineTo(item.x + item.width, item.y + item.height);
      } else if (item.shapeType === 'arrow' || item.shapeType === 'double-arrow') {
        const fromX = item.x;
        const fromY = item.y;
        const toX = item.x + item.width;
        const toY = item.y + item.height;

        // Draw main line
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();

        // Arrow head at endpoint
        const angle = Math.atan2(toY - fromY, toX - fromX);
        const headLen = Math.max(12, item.strokeWidth * 3);

        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - headLen * Math.cos(angle - Math.PI / 6), toY - headLen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - headLen * Math.cos(angle + Math.PI / 6), toY - headLen * Math.sin(angle + Math.PI / 6));

        if (item.shapeType === 'double-arrow') {
          ctx.moveTo(fromX, fromY);
          ctx.lineTo(fromX + headLen * Math.cos(angle - Math.PI / 6), fromY + headLen * Math.sin(angle - Math.PI / 6));
          ctx.moveTo(fromX, fromY);
          ctx.lineTo(fromX + headLen * Math.cos(angle + Math.PI / 6), fromY + headLen * Math.sin(angle + Math.PI / 6));
        }
      }

      if (item.shapeType !== 'line' && item.shapeType !== 'arrow' && item.shapeType !== 'double-arrow') {
        if (item.hasFill && item.fillColor) {
          ctx.fill();
        }
        if (item.strokeWidth > 0) {
          ctx.stroke();
        }
      } else {
        ctx.stroke();
      }
    } else if (item.type === 'text') {
      ctx.globalAlpha = item.opacity;
      const center = {
        x: item.x + item.width / 2,
        y: item.y + item.height / 2,
      };
      if (item.rotation) {
        ctx.translate(center.x, center.y);
        ctx.rotate((item.rotation * Math.PI) / 180);
        ctx.translate(-center.x, -center.y);
      }

      ctx.font = `${item.fontStyle || 'normal'} ${item.fontWeight || 'normal'} ${item.fontSize}px '${item.fontFamily || 'Inter'}', sans-serif`;
      ctx.fillStyle = item.color || '#111827';
      ctx.textAlign = item.textAlign || 'left';
      ctx.textBaseline = 'top';

      const lines = item.text.split('\n');
      const lineHeight = item.fontSize * 1.25;

      let alignX = item.x;
      if (item.textAlign === 'center') alignX = item.x + item.width / 2;
      else if (item.textAlign === 'right') alignX = item.x + item.width;

      lines.forEach((line, index) => {
        ctx.fillText(line, alignX, item.y + index * lineHeight);
      });
    }

    ctx.restore();
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportToImage(
  items: CanvasItem[],
  format: 'png' | 'jpeg',
  transparentBg: boolean = false,
  backgroundColor: string = '#FFFFFF',
  padding: number = 40
): Promise<Blob | null> {
  return new Promise((resolve) => {
    if (items.length === 0) {
      resolve(null);
      return;
    }

    const bounds = getMultiItemBounds(items);
    if (!bounds) {
      resolve(null);
      return;
    }

    const width = Math.max(200, Math.ceil(bounds.width + padding * 2));
    const height = Math.max(200, Math.ceil(bounds.height + padding * 2));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve(null);
      return;
    }

    if (!transparentBg || format === 'jpeg') {
      ctx.fillStyle = backgroundColor || '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.clearRect(0, 0, width, height);
    }

    const offsetX = padding - bounds.x;
    const offsetY = padding - bounds.y;

    renderItemsToCanvas(ctx, items, offsetX, offsetY);

    canvas.toBlob(
      (blob) => resolve(blob),
      format === 'png' ? 'image/png' : 'image/jpeg',
      format === 'jpeg' ? 0.95 : undefined
    );
  });
}

export function exportToSvg(
  items: CanvasItem[],
  transparentBg: boolean = false,
  backgroundColor: string = '#FFFFFF',
  padding: number = 40
): string {
  const bounds = getMultiItemBounds(items) || { x: 0, y: 0, width: 800, height: 600 };
  const width = Math.max(200, Math.ceil(bounds.width + padding * 2));
  const height = Math.max(200, Math.ceil(bounds.height + padding * 2));
  const offsetX = padding - bounds.x;
  const offsetY = padding - bounds.y;

  let elementsSvg = '';

  for (const item of items) {
    if (item.type === 'stroke') {
      const d = pointsToSvgPath(
        item.points.map((p) => ({ x: p.x + offsetX, y: p.y + offsetY }))
      );
      elementsSvg += `  <path d="${d}" fill="none" stroke="${item.strokeColor}" stroke-width="${item.strokeWidth}" stroke-linecap="round" stroke-linejoin="round" opacity="${item.opacity}" />\n`;
    } else if (item.type === 'shape') {
      const x = item.x + offsetX;
      const y = item.y + offsetY;
      const fill = item.hasFill && item.fillColor ? item.fillColor : 'none';
      const stroke = item.strokeWidth > 0 ? item.strokeColor : 'none';
      const strokeWidth = item.strokeWidth;
      const transform = item.rotation
        ? ` transform="rotate(${item.rotation} ${x + item.width / 2} ${y + item.height / 2})"`
        : '';

      if (item.shapeType === 'rect' || item.shapeType === 'square') {
        elementsSvg += `  <rect x="${x}" y="${y}" width="${item.width}" height="${item.height}" rx="6" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${item.opacity}"${transform} />\n`;
      } else if (item.shapeType === 'circle' || item.shapeType === 'ellipse') {
        const cx = x + item.width / 2;
        const cy = y + item.height / 2;
        const rx = item.width / 2;
        const ry = item.height / 2;
        elementsSvg += `  <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${item.opacity}"${transform} />\n`;
      } else if (item.shapeType === 'triangle') {
        const p1 = `${x + item.width / 2},${y}`;
        const p2 = `${x + item.width},${y + item.height}`;
        const p3 = `${x},${y + item.height}`;
        elementsSvg += `  <polygon points="${p1} ${p2} ${p3}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${item.opacity}"${transform} />\n`;
      } else if (item.shapeType === 'trapezoid') {
        const inset = item.width * 0.22;
        const p1 = `${x + inset},${y}`;
        const p2 = `${x + item.width - inset},${y}`;
        const p3 = `${x + item.width},${y + item.height}`;
        const p4 = `${x},${y + item.height}`;
        elementsSvg += `  <polygon points="${p1} ${p2} ${p3} ${p4}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${item.opacity}"${transform} />\n`;
      } else if (item.shapeType === 'line') {
        elementsSvg += `  <line x1="${x}" y1="${y}" x2="${x + item.width}" y2="${y + item.height}" stroke="${item.strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" opacity="${item.opacity}"${transform} />\n`;
      } else if (item.shapeType === 'arrow' || item.shapeType === 'double-arrow') {
        elementsSvg += `  <line x1="${x}" y1="${y}" x2="${x + item.width}" y2="${y + item.height}" stroke="${item.strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" opacity="${item.opacity}"${transform} />\n`;
      }
    } else if (item.type === 'text') {
      const x = item.x + offsetX;
      const y = item.y + offsetY;
      const lines = item.text.split('\n');
      const lineHeight = item.fontSize * 1.25;
      const transform = item.rotation
        ? ` transform="rotate(${item.rotation} ${x + item.width / 2} ${y + item.height / 2})"`
        : '';

      elementsSvg += `  <g opacity="${item.opacity}"${transform}>\n`;
      lines.forEach((line, index) => {
        elementsSvg += `    <text x="${x}" y="${y + index * lineHeight + item.fontSize * 0.9}" font-family="${item.fontFamily}, sans-serif" font-size="${item.fontSize}" font-weight="${item.fontWeight}" font-style="${item.fontStyle}" fill="${item.color}">${line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</text>\n`;
      });
      elementsSvg += `  </g>\n`;
    }
  }

  const bgRect = !transparentBg
    ? `<rect width="${width}" height="${height}" fill="${backgroundColor}" />\n`
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
${bgRect}${elementsSvg}</svg>`;
}

export function exportToJson(project: ProjectData): string {
  return JSON.stringify(project, null, 2);
}

export function validateAndImportJson(
  jsonText: string
): { valid: boolean; project?: ProjectData; error?: string } {
  try {
    const parsed = JSON.parse(jsonText);
    if (!parsed || typeof parsed !== 'object') {
      return { valid: false, error: 'O arquivo JSON não contém um objeto válido.' };
    }
    if (!Array.isArray(parsed.items)) {
      return { valid: false, error: 'Formato inválido: itens do quadro ausentes.' };
    }

    const importedProject: ProjectData = {
      id: parsed.id || 'proj_' + Math.random().toString(36).substring(2, 9),
      name: parsed.name || 'Quadro Importado',
      createdAt: parsed.createdAt || Date.now(),
      updatedAt: Date.now(),
      viewport: parsed.viewport || { x: 0, y: 0, zoom: 1 },
      items: parsed.items,
      backgroundColor: parsed.backgroundColor || '#FFFFFF',
      gridStyle: parsed.gridStyle || 'none',
    };

    return { valid: true, project: importedProject };
  } catch (err) {
    return { valid: false, error: 'Erro ao analisar arquivo JSON: sintaxe inválida.' };
  }
}
