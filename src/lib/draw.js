// 描画ツール共通モジュール（分析画面・比較画面の両方から使用）
export const TOOLS = {
  POINTER: "pointer", ARROW: "arrow", LINE: "line",
  CIRCLE: "circle", RECT: "rect", ANGLE: "angle",
  FREEHAND: "freehand", TEXT: "text",
};

export const SPEEDS = [
  { label: "1/10", value: 0.1 }, { label: "1/4", value: 0.25 },
  { label: "1/2", value: 0.5 }, { label: "3/4", value: 0.75 }, { label: "等速", value: 1 },
];

export const PRESET_COLORS = ["#00e676", "#ff1744", "#ffea00", "#40c4ff", "#ff6d00", "#e040fb", "#ffffff"];

export function drawArrow(ctx, x1, y1, x2, y2, color, lw) {
  const head = Math.max(18, lw * 5);
  const ang = Math.atan2(y2 - y1, x2 - x1);
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = lw;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - head * Math.cos(ang - Math.PI / 6), y2 - head * Math.sin(ang - Math.PI / 6));
  ctx.lineTo(x2 - head * Math.cos(ang + Math.PI / 6), y2 - head * Math.sin(ang + Math.PI / 6));
  ctx.closePath(); ctx.fill();
}

export function calcAngle(p1, v, p2) {
  const a = Math.atan2(p1.y - v.y, p1.x - v.x);
  const b = Math.atan2(p2.y - v.y, p2.x - v.x);
  let d = Math.abs((b - a) * 180 / Math.PI);
  return Math.round(d > 180 ? 360 - d : d);
}

export function renderShape(ctx, shape) {
  ctx.save();
  ctx.strokeStyle = shape.color; ctx.lineWidth = shape.strokeWidth;
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  switch (shape.type) {
    case TOOLS.LINE:
      ctx.beginPath(); ctx.moveTo(shape.x1, shape.y1); ctx.lineTo(shape.x2, shape.y2); ctx.stroke(); break;
    case TOOLS.ARROW:
      drawArrow(ctx, shape.x1, shape.y1, shape.x2, shape.y2, shape.color, shape.strokeWidth); break;
    case TOOLS.CIRCLE: {
      const cx = (shape.x1 + shape.x2) / 2, cy = (shape.y1 + shape.y2) / 2;
      const rx = Math.abs(shape.x2 - shape.x1) / 2, ry = Math.abs(shape.y2 - shape.y1) / 2;
      ctx.beginPath(); ctx.ellipse(cx, cy, rx || 1, ry || 1, 0, 0, Math.PI * 2); ctx.stroke(); break;
    }
    case TOOLS.RECT:
      ctx.strokeRect(shape.x1, shape.y1, shape.x2 - shape.x1, shape.y2 - shape.y1); break;
    case TOOLS.FREEHAND:
      if (shape.points?.length > 1) {
        ctx.beginPath(); ctx.moveTo(shape.points[0].x, shape.points[0].y);
        shape.points.forEach(p => ctx.lineTo(p.x, p.y)); ctx.stroke();
      } break;
    case TOOLS.ANGLE:
      if (shape.points?.length >= 2) {
        ctx.beginPath(); ctx.moveTo(shape.points[0].x, shape.points[0].y);
        shape.points.forEach(p => ctx.lineTo(p.x, p.y)); ctx.stroke();
        if (shape.points.length === 3) {
          const deg = calcAngle(shape.points[0], shape.points[1], shape.points[2]);
          ctx.font = `bold ${Math.max(16, shape.strokeWidth * 5)}px 'Courier New', monospace`;
          ctx.fillStyle = shape.color; ctx.shadowColor = "rgba(0,0,0,0.8)"; ctx.shadowBlur = 4;
          ctx.fillText(`${deg}deg`, shape.points[1].x + 8, shape.points[1].y - 8);
        }
      } break;
    case TOOLS.TEXT:
      if (shape.text) {
        const fs = Math.max(16, shape.strokeWidth * 6);
        ctx.font = `bold ${fs}px 'Courier New', monospace`;
        ctx.fillStyle = shape.color;
        ctx.shadowColor = "rgba(0,0,0,0.9)"; ctx.shadowBlur = 5;
        shape.text.split("\n").forEach((line, i) => ctx.fillText(line, shape.x1, shape.y1 + i * (fs + 4)));
      } break;
    default: break;
  }
  ctx.restore();
}
