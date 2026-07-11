// 初期データ：ドリルライブラリ / 自動評価ルール / 定型文
// すべてアプリ内で編集可能（localStorageに保存され、この初期値は初回のみ使用）

export const ALL_TAGS = [
  "トップ", "体重移動", "軸", "体幹", "下半身", "肘",
  "ミート", "フォロースルー", "スローイング", "守備", "室内OK",
];

export const DEFAULT_DRILLS = [
  { id: "d1", name: "トップ作りドリル（壁立ち）", reps: "×20", tags: ["トップ", "室内OK"], note: "壁に背をつけてトップの形を作る。手の位置は肩より上。", videoUrl: "" },
  { id: "d2", name: "ティー打撃（高め）", reps: "×30", tags: ["ミート"], note: "高めのコースを意識してレベルスイング。", videoUrl: "" },
  { id: "d3", name: "体幹プランク", reps: "30秒×3", tags: ["体幹", "室内OK"], note: "お尻が上がったり落ちたりしないように一直線をキープ。", videoUrl: "" },
  { id: "d4", name: "シャドースイング（鏡チェック）", reps: "×20", tags: ["軸", "トップ", "室内OK"], note: "鏡の前で頭の位置が動かないことを確認しながら。", videoUrl: "" },
  { id: "d5", name: "片足ステップ打ち", reps: "×15", tags: ["体重移動", "下半身"], note: "軸足に体重を乗せてからステップ。突っ込み防止。", videoUrl: "" },
  { id: "d6", name: "タオルシャドーピッチング", reps: "×20", tags: ["肘", "スローイング", "室内OK"], note: "肘の高さを意識。タオルの先が最後に走る感覚。", videoUrl: "" },
  { id: "d7", name: "スクワットジャンプ", reps: "10回×2", tags: ["下半身", "体幹", "室内OK"], note: "着地はつま先→かかとの順で静かに。", videoUrl: "" },
  { id: "d8", name: "ネットスロー（近距離フォーム確認）", reps: "×20", tags: ["スローイング", "肘"], note: "距離より形を優先。肘が下がらないこと。", videoUrl: "" },
  { id: "d9", name: "素振り（フォロースルー意識）", reps: "×30", tags: ["フォロースルー", "軸"], note: "振り切った後に3秒静止できるバランスで。", videoUrl: "" },
  { id: "d10", name: "股関節ストレッチ", reps: "各30秒", tags: ["下半身", "室内OK"], note: "毎日の練習前後に。可動域が広がると体重移動が楽になる。", videoUrl: "" },
];

// 自動評価ルール：計測値(metric)がしきい値(threshold)を op 方向に超えたら課題として提案
// コーチが画面上で しきい値・コメント文・提案ドリルタグ を編集できる
export const METRIC_DEFS = [
  { key: "headSwayPct", label: "頭の横ブレ", unit: "%（身長比）", scope: "scan" },
  { key: "hipSwayPct", label: "腰の横ブレ", unit: "%（身長比）", scope: "scan" },
  { key: "spineTiltMaxDeg", label: "上体の傾き(最大)", unit: "°", scope: "scan" },
  { key: "shoulderTiltMaxDeg", label: "肩ラインの傾き(最大)", unit: "°", scope: "scan" },
  { key: "elbowMinDeg", label: "肘の最小角度", unit: "°", scope: "scan" },
  { key: "kneeMinDeg", label: "膝の最小角度", unit: "°", scope: "scan" },
];

// 動作タイプ：分析時に選択し、そのカテゴリのルールだけで評価する
export const CATEGORIES = [
  { id: "batting", label: "バッティング", icon: "🏏" },
  { id: "pitching", label: "ピッチング", icon: "⚾" },
  { id: "fielding", label: "守備", icon: "🧤" },
];

export const DEFAULT_RULES = [
  // ── バッティング ──
  { id: "r1", category: "batting", enabled: true, metric: "headSwayPct", op: ">", threshold: 12, label: "頭のブレ", comment: "スイング中に頭が左右に動いています。軸を一本イメージして、頭の位置をキープしましょう。", drillTags: ["軸", "体幹"] },
  { id: "r2", category: "batting", enabled: true, metric: "hipSwayPct", op: ">", threshold: 18, label: "突っ込み", comment: "体重移動のときに前へ突っ込み気味です。軸足にしっかり体重を乗せてからステップしましょう。", drillTags: ["体重移動", "下半身"] },
  { id: "r3", category: "batting", enabled: true, metric: "spineTiltMaxDeg", op: ">", threshold: 28, label: "上体の傾き", comment: "上体が大きく傾く瞬間があります。背筋を伸ばして回転する意識を持ちましょう。", drillTags: ["体幹", "軸"] },
  { id: "r4", category: "batting", enabled: true, metric: "shoulderTiltMaxDeg", op: ">", threshold: 25, label: "肩の傾き", comment: "肩のラインが大きく崩れています。トップの位置と肩の水平を確認しましょう。", drillTags: ["トップ", "軸"] },
  { id: "r5", category: "batting", enabled: true, metric: "elbowMinDeg", op: "<", threshold: 55, label: "肘の窮屈さ", comment: "肘のたたみが強く窮屈になっています。振り出しは肘が曲がった状態を保ち、腕を楽に使いましょう。", drillTags: ["肘"] },
  { id: "r6", category: "batting", enabled: true, metric: "kneeMinDeg", op: "<", threshold: 95, label: "重心の沈み", comment: "膝が深く曲がって重心が沈みすぎています。下半身の強さと姿勢を両立させましょう。", drillTags: ["下半身", "体幹"] },
  // ── ピッチング ──
  { id: "p1", category: "pitching", enabled: true, metric: "kneeMinDeg", op: "<", threshold: 110, label: "膝抜け", comment: "踏み込み足の膝が深く曲がり“膝抜け”気味です。股関節で受け止めて、踏み込み足を真っ直ぐ使う意識を持ちましょう。", drillTags: ["下半身", "体幹"] },
  { id: "p2", category: "pitching", enabled: true, metric: "elbowMinDeg", op: "<", threshold: 45, label: "肘抜け傾向", comment: "肘のたたみが強く“肘抜け”につながりやすい状態です。腕の使い方をシャドーで確認しましょう。", drillTags: ["肘", "スローイング"] },
  { id: "p3", category: "pitching", enabled: true, metric: "headSwayPct", op: ">", threshold: 15, label: "頭のブレ", comment: "投球中に頭が大きくブレています。軸足〜リリースまで目線を安定させましょう。", drillTags: ["軸", "体幹"] },
  { id: "p4", category: "pitching", enabled: true, metric: "spineTiltMaxDeg", op: ">", threshold: 35, label: "上体の倒れ", comment: "上体の倒れが早い・大きい状態です。下半身主導で投げる意識を持ちましょう。球速アップにも直結します。", drillTags: ["体幹", "下半身", "スローイング"] },
  // ── 守備 ──
  { id: "f1", category: "fielding", enabled: true, metric: "kneeMinDeg", op: ">", threshold: 130, label: "腰高", comment: "腰が高く、ゴロに対して重心が上がっています。膝を曲げて低い姿勢で捕球体勢を作りましょう。", drillTags: ["守備", "下半身"] },
  { id: "f2", category: "fielding", enabled: true, metric: "headSwayPct", op: ">", threshold: 20, label: "目線のブレ", comment: "捕球までに目線が大きく動いています。最後までボールを見て、頭を安定させましょう。", drillTags: ["守備", "体幹"] },
];

// 既存ユーザーの保存済みルールを新形式へ移行：
// category が無い旧ルールは batting 扱いにし、未所持の新デフォルトルールを追加する
export function migrateRules(stored) {
  const migrated = (stored || []).map(r => ({ category: "batting", ...r }));
  const have = new Set(migrated.map(r => r.id));
  DEFAULT_RULES.forEach(d => { if (!have.has(d.id)) migrated.push({ ...d }); });
  return migrated;
}

export const GOOD_POINT_PRESETS = [
  "体重移動のタイミングが前回より良くなっています",
  "トップの位置が安定してきました",
  "振り切った後のバランスが良いです",
  "頭の位置がブレずにスイングできています",
  "肘の高さがキープできています",
  "下半身を使ってスイングできています",
];

export const OPENING_PRESETS = [
  "動画ありがとうございます！確認しました👍",
  "今週も動画ありがとうございます！しっかり見ました👍",
  "練習おつかれさまです！動画確認しました👍",
];

export const CLOSING_PRESETS = [
  "また来週の動画、楽しみにしています💪",
  "無理せずコツコツ続けていきましょう！",
  "分からないことがあればいつでもLINEしてくださいね。",
];

// 定型フレーズ：よく使う指導の言い回しをワンタップで改善点に挿入（追加・削除可）
export const DEFAULT_SNIPPETS = [
  "バットのヘッドが落ちてしまうため、ミートの確率が下がっています",
  "振り出しは肘が曲がった状態が理想です。振り出しから腕が伸びないよう意識しましょう",
  "タイミングが早いとゴロ、遅いとポップフライになりやすい状態です",
  "股関節の切り替えを覚えると球速が上がります",
  "踏み込み足を真っ直ぐ使う意識はとても良いので、引き続き続けてください",
  "リリース時に膝が曲がる“膝抜け”が出ています",
  "最後までボールを見て、頭を安定させましょう",
];
