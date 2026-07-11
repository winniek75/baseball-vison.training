// ルールベース自動評価エンジン：計測値 → 課題タグ＋コメント案＋推奨ドリル
// 生成AI不使用・APIコストゼロ・判定根拠が常に説明可能

export function evaluateRules(metrics, rules) {
  if (!metrics) return [];
  return rules
    .filter(r => r.enabled)
    .filter(r => {
      const v = metrics[r.metric];
      if (v == null || Number.isNaN(v)) return false;
      return r.op === ">" ? v > r.threshold : v < r.threshold;
    })
    .map(r => ({ ...r, value: metrics[r.metric] }));
}

// 課題タグに合うドリルをライブラリから提案（タグ一致数の多い順）
export function suggestDrills(issues, drills, max = 4) {
  const wanted = new Set(issues.flatMap(i => i.drillTags || []));
  if (wanted.size === 0) return [];
  return drills
    .map(d => ({ d, score: (d.tags || []).filter(t => wanted.has(t)).length }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map(x => x.d);
}

const CIRCLED = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩"];

// LINEにそのまま貼れるフィードバック下書きを組み立てる
export function buildDraft({ studentName, opening, goodPoints, issues, drills, closing }) {
  const lines = [];
  const name = studentName?.trim();
  lines.push(`${name ? name + "さん、" : ""}${opening || "動画ありがとうございます！確認しました👍"}`);
  lines.push("");

  if (goodPoints?.length) {
    lines.push("良い点：");
    goodPoints.forEach(g => lines.push(`・${g}`));
    lines.push("");
  }

  if (issues?.length) {
    lines.push("改善点：");
    issues.forEach(i => lines.push(`・${i.comment}`));
    lines.push("");
  }

  if (drills?.length) {
    lines.push("📋 今週のメニュー：");
    drills.forEach((d, idx) => {
      lines.push(`${CIRCLED[idx] || "・"} ${d.name} ${d.reps || ""}`.trim());
      if (d.note) lines.push(`　└ ${d.note}`);
      if (d.videoUrl) lines.push(`　└ 🎬 お手本動画: ${d.videoUrl}`);
    });
    lines.push("");
  }

  if (closing) lines.push(closing);
  return lines.join("\n").trim();
}
