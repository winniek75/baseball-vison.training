// フィードバックレポート出力（印刷 → PDF保存でそのままLINE送付できる）
// これまで手作業で作っていた「注釈入り静止画＋文面」のPDFをデジタル化するもの

const esc = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ── LINE用画像出力：文面＋画像を縦長1枚のPNGに合成（保護者がPDFより開きやすい） ──
function wrapText(ctx, text, maxWidth) {
  const lines = [];
  for (const raw of String(text || "").split("\n")) {
    if (raw === "") { lines.push(""); continue; }
    let cur = "";
    for (const ch of raw) {
      if (ctx.measureText(cur + ch).width > maxWidth && cur) { lines.push(cur); cur = ch; }
      else cur += ch;
    }
    lines.push(cur);
  }
  return lines;
}

const loadImage = (src) => new Promise((res, rej) => {
  const img = new Image();
  img.onload = () => res(img); img.onerror = rej; img.src = src;
});

export async function downloadLineImage({ studentName, categoryLabel, draft, images }) {
  const W = 1080, PAD = 64, BODY = 34, LH = 56;
  const imgs = [];
  for (const src of images || []) {
    try { imgs.push(await loadImage(src)); } catch { /* 読めない画像はスキップ */ }
  }

  // レイアウト計算用の仮キャンバス
  const measure = document.createElement("canvas").getContext("2d");
  measure.font = `${BODY}px "Hiragino Sans","Noto Sans JP",sans-serif`;
  const bodyLines = wrapText(measure, draft, W - PAD * 2);

  const headH = 210;
  const textH = bodyLines.length * LH + 40;
  const imgHs = imgs.map(im => Math.round((W - PAD * 2) * im.height / im.width));
  const imgsH = imgHs.reduce((a, b) => a + b + 24, 0);
  const footH = 90;
  const H = headH + textH + imgsH + footH;

  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, W, H);

  // ヘッダー
  ctx.fillStyle = "#0066cc"; ctx.fillRect(0, 0, W, 10);
  ctx.fillStyle = "#0066cc";
  ctx.font = `bold 26px "Hiragino Sans","Noto Sans JP",sans-serif`;
  ctx.fillText("⚾ WISE BASEBALL ACADEMY", PAD, 70);
  ctx.fillStyle = "#222222";
  ctx.font = `bold 46px "Hiragino Sans","Noto Sans JP",sans-serif`;
  ctx.fillText(studentName ? `${studentName} さん` : "フィードバック", PAD, 135);
  ctx.font = `bold 26px "Hiragino Sans","Noto Sans JP",sans-serif`;
  const dateStr = new Date().toLocaleDateString("ja-JP");
  ctx.fillStyle = "#888888";
  ctx.fillText(`${categoryLabel || ""}　${dateStr}`, PAD, 180);

  // 本文
  ctx.fillStyle = "#222222";
  ctx.font = `${BODY}px "Hiragino Sans","Noto Sans JP",sans-serif`;
  let y = headH + 20;
  for (const line of bodyLines) { ctx.fillText(line, PAD, y); y += LH; }
  y += 20;

  // 画像
  for (let i = 0; i < imgs.length; i++) {
    ctx.drawImage(imgs[i], PAD, y, W - PAD * 2, imgHs[i]);
    ctx.strokeStyle = "#dddddd"; ctx.lineWidth = 2;
    ctx.strokeRect(PAD, y, W - PAD * 2, imgHs[i]);
    y += imgHs[i] + 24;
  }

  // フッター
  ctx.fillStyle = "#999999";
  ctx.font = `22px "Hiragino Sans","Noto Sans JP",sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("WISE Baseball Academy — Coaching Analyzer", W / 2, H - 40);

  const a = document.createElement("a");
  a.download = `wise-feedback-${(studentName || "report").replace(/\s/g, "")}-${Date.now()}.png`;
  a.href = c.toDataURL("image/png");
  a.click();
}

export function openReportWindow({ studentName, categoryLabel, draft, images }) {
  const w = window.open("", "_blank");
  if (!w) {
    alert("ポップアップがブロックされました。ブラウザの設定でこのサイトのポップアップを許可してください。");
    return;
  }
  const date = new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });
  const imgs = (images || []).map(src =>
    `<figure class="shot"><img src="${src}" alt="分析フレーム" /></figure>`
  ).join("");

  w.document.write(`<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<title>フィードバックレポート${studentName ? " - " + esc(studentName) : ""}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: "Hiragino Sans", "Noto Sans JP", "Yu Gothic", sans-serif; color: #222; background: #fff; padding: 40px 48px; line-height: 1.9; }
  .head { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #0066cc; padding-bottom: 10px; margin-bottom: 6px; }
  .brand { font-size: 12px; font-weight: 700; letter-spacing: 2px; color: #0066cc; }
  .date { font-size: 11px; color: #888; }
  h1 { font-size: 20px; margin: 14px 0 2px; }
  .cat { display: inline-block; background: #0066cc; color: #fff; font-size: 11px; font-weight: 700; padding: 2px 10px; border-radius: 3px; margin-bottom: 16px; }
  .body-text { font-size: 13.5px; white-space: pre-wrap; margin-bottom: 24px; }
  .shots { display: flex; flex-wrap: wrap; gap: 10px; }
  .shot { flex: 1 1 45%; max-width: 48%; }
  .shot img { width: 100%; border-radius: 4px; border: 1px solid #ddd; }
  .foot { margin-top: 28px; border-top: 1px solid #ddd; padding-top: 8px; font-size: 10px; color: #999; text-align: center; }
  .printbar { position: fixed; top: 12px; right: 12px; }
  .printbar button { background: #0066cc; color: #fff; border: none; border-radius: 6px; padding: 10px 18px; font-size: 13px; font-weight: 700; cursor: pointer; box-shadow: 0 2px 10px rgba(0,0,0,.2); }
  @media print { .printbar { display: none; } body { padding: 0; } }
</style>
</head>
<body>
  <div class="printbar"><button onclick="window.print()">🖨 印刷 / PDF保存</button></div>
  <div class="head">
    <div class="brand">⚾ WISE BASEBALL ACADEMY</div>
    <div class="date">${esc(date)}</div>
  </div>
  <h1>${studentName ? esc(studentName) + " さん" : "フィードバックレポート"}</h1>
  <div class="cat">${esc(categoryLabel || "")}</div>
  <div class="body-text">${esc(draft)}</div>
  <div class="shots">${imgs}</div>
  <div class="foot">WISE Baseball Academy — Coaching Analyzer</div>
</body>
</html>`);
  w.document.close();
}
