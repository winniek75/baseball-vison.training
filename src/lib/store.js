// localStorage 永続化ヘルパー（バックエンド不要・端末内保存）
// JSONエクスポート/インポートでPC間の移行・バックアップに対応
const PREFIX = "wise_analyzer_v1:";

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.warn("[store] 保存に失敗:", e);
  }
}

export function exportAll() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(PREFIX)) data[k.slice(PREFIX.length)] = JSON.parse(localStorage.getItem(k));
  }
  const blob = new Blob([JSON.stringify({ app: "wise-analyzer", version: 1, exportedAt: new Date().toISOString(), data }, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `wise-analyzer-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}

export function importAll(file, onDone) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (parsed?.app !== "wise-analyzer" || !parsed.data) throw new Error("形式が違います");
      Object.entries(parsed.data).forEach(([k, v]) => save(k, v));
      onDone?.(true);
    } catch (e) {
      console.error(e);
      onDone?.(false);
    }
  };
  reader.readAsText(file);
}
