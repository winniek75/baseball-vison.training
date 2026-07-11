import { useState, useMemo, useRef } from "react";
import { buildDraft } from "../lib/rules";
import { ALL_TAGS, GOOD_POINT_PRESETS, OPENING_PRESETS, CLOSING_PRESETS, CATEGORIES } from "../lib/defaults";
import { exportAll, importAll } from "../lib/store";
import { saveVideo, getVideo, deleteVideo } from "../lib/videoStore";
import { openReportWindow, downloadLineImage } from "../lib/report";

const TABS = [
  { id: "fb", label: "✍ 返信作成" },
  { id: "drills", label: "📚 ドリル" },
  { id: "history", label: "🕘 履歴" },
];

export default function SidePanel({
  videoRef, hasVideo,
  drills, setDrills,
  selectedDrillIds, setSelectedDrillIds,
  history, setHistory,
  snippets, setSnippets,
  onClose, onLoadToAnalyzer,
  reportImages, setReportImages,
}) {
  const [tab, setTab] = useState("fb");

  return (
    <div style={P.panel}>
      <div style={P.tabBar}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ ...P.tabBtn, ...(tab === t.id ? P.tabBtnActive : {}) }}>{t.label}</button>
        ))}
        <button onClick={onClose} style={{ ...P.tabBtn, marginLeft: "auto", flex: "0 0 auto", color: "#6e7681" }}>✕</button>
      </div>
      <div style={P.body}>
        {tab === "fb" && (
          <FeedbackTab
            drills={drills} selectedDrillIds={selectedDrillIds} setSelectedDrillIds={setSelectedDrillIds}
            history={history} setHistory={setHistory}
            snippets={snippets} setSnippets={setSnippets}
            reportImages={reportImages} setReportImages={setReportImages} />
        )}
        {tab === "drills" && (
          <DrillsTab drills={drills} setDrills={setDrills}
            selectedDrillIds={selectedDrillIds} setSelectedDrillIds={setSelectedDrillIds}
            onLoadToAnalyzer={onLoadToAnalyzer} />
        )}
        {tab === "history" && <HistoryTab history={history} setHistory={setHistory} />}
      </div>
    </div>
  );
}

/* ── 返信作成タブ：良い点・改善点・メニュー → 下書き → コピー/レポート ── */
function FeedbackTab({ drills, selectedDrillIds, setSelectedDrillIds, history, setHistory, snippets, setSnippets, reportImages, setReportImages }) {
  const [snipManage, setSnipManage] = useState(false);
  const [snipInput, setSnipInput] = useState("");
  const [karteOpenId, setKarteOpenId] = useState(null);
  const [karteCopiedId, setKarteCopiedId] = useState(null);
  const [studentName, setStudentName] = useState("");
  const [category, setCategory] = useState("batting"); // レポート・履歴のラベル用
  const [goodPoints, setGoodPoints] = useState([]);
  const [goodInput, setGoodInput] = useState("");
  const [issuesText, setIssuesText] = useState("");   // 改善点：1行に1つ
  const [opening, setOpening] = useState(OPENING_PRESETS[0]);
  const [closing, setClosing] = useState(CLOSING_PRESETS[0]);
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);

  const categoryLabel = CATEGORIES.find(c => c.id === category)?.label || "";

  const selectedDrills = useMemo(
    () => drills.filter(d => selectedDrillIds.includes(d.id)),
    [drills, selectedDrillIds]
  );

  const addGoodPoint = () => {
    const v = goodInput.trim();
    if (v && !goodPoints.includes(v)) setGoodPoints(p => [...p, v]);
    setGoodInput("");
  };

  const issueLines = issuesText.split("\n").map(s => s.trim()).filter(Boolean);

  // 🗂 生徒カルテ：入力中の生徒名に一致する過去の返信（最新3件）
  const karte = useMemo(() => {
    const q = studentName.trim();
    if (!q) return [];
    return history.filter(h => h.studentName?.includes(q)).slice(0, 3);
  }, [studentName, history]);

  const copyKarte = async (h) => {
    try {
      await navigator.clipboard.writeText(h.text);
      setKarteCopiedId(h.id); setTimeout(() => setKarteCopiedId(null), 1500);
    } catch { /* noop */ }
  };

  const insertSnippet = (s) => {
    setIssuesText(t => (t.trim() ? t.replace(/\s+$/, "") + "\n" + s : s));
  };

  const addSnippet = () => {
    const v = snipInput.trim();
    if (v && !snippets.includes(v)) setSnippets(p => [...p, v]);
    setSnipInput("");
  };

  const generateDraft = () => {
    setDraft(buildDraft({
      studentName, opening,
      goodPoints,
      issues: issueLines.map(comment => ({ comment })),
      drills: selectedDrills,
      closing,
    }));
  };

  const copyDraft = async () => {
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    } catch { /* noop */ }
  };

  const saveToHistory = () => {
    if (!draft.trim()) return;
    const entry = {
      id: `h${Date.now()}`,
      date: new Date().toISOString(),
      studentName: studentName.trim() || "（名前なし）",
      category,
      tags: issueLines.slice(0, 5),
      text: draft,
    };
    setHistory([entry, ...history].slice(0, 300));
  };

  const exportReport = () => {
    openReportWindow({ studentName, categoryLabel, draft, images: reportImages });
  };

  return (
    <div>
      <label style={P.label}>生徒名</label>
      <input value={studentName} onChange={e => setStudentName(e.target.value)}
        placeholder="例：太郎" style={P.input} />

      <label style={P.label}>動作タイプ（レポート・履歴のラベルになります）</label>
      <div style={{ display: "flex", gap: 5 }}>
        {CATEGORIES.map(c => (
          <button key={c.id} onClick={() => setCategory(c.id)}
            style={{ ...P.chip, flex: 1, textAlign: "center", padding: "7px 4px", ...(category === c.id ? P.chipOn : {}) }}>
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      {karte.length > 0 && (
        <div style={{ ...P.card, borderColor: "#40c4ff" }}>
          <div style={P.cardTitle}>🗂 {studentName.trim()} のカルテ（過去の返信 {karte.length}件）</div>
          {karte.map(h => (
            <div key={h.id} style={{ borderBottom: "1px solid #1c2128", padding: "5px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 10, color: "#6e7681" }}>
                  {new Date(h.date).toLocaleDateString("ja-JP")}
                  {h.category && `・${CATEGORIES.find(c => c.id === h.category)?.label || ""}`}
                </span>
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => setKarteOpenId(karteOpenId === h.id ? null : h.id)} style={P.miniBtn}>
                    {karteOpenId === h.id ? "▲ 閉じる" : "▼ 全文"}
                  </button>
                  <button onClick={() => copyKarte(h)} style={P.miniBtn}>
                    {karteCopiedId === h.id ? "✅" : "📋"}
                  </button>
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, margin: "3px 0" }}>
                {(h.tags || []).map(t => <span key={t} style={P.tagBadge}>{t}</span>)}
              </div>
              {karteOpenId === h.id && (
                <div style={{ fontSize: 11, color: "#8b949e", whiteSpace: "pre-wrap", lineHeight: 1.7, background: "#0d1117", borderRadius: 6, padding: 8, marginTop: 4 }}>{h.text}</div>
              )}
            </div>
          ))}
          <div style={{ ...P.note, marginTop: 4 }}>💡 前回の指摘を確認してから書くと「前回の◯◯、良くなってるね」と繋げられます</div>
        </div>
      )}

      <div style={P.card}>
        <div style={P.cardTitle}>👍 良い点（タップで追加・自由入力も可）</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {GOOD_POINT_PRESETS.map(g => {
            const on = goodPoints.includes(g);
            return (
              <button key={g} onClick={() => setGoodPoints(p => on ? p.filter(x => x !== g) : [...p, g])}
                style={{ ...P.chip, ...(on ? P.chipOn : {}) }}>{g}</button>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 5, marginTop: 6 }}>
          <input value={goodInput} onChange={e => setGoodInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") addGoodPoint(); }}
            placeholder="自由入力して Enter か ＋" style={{ ...P.input, flex: 1, margin: 0 }} />
          <button onClick={addGoodPoint} style={P.btn}>＋</button>
        </div>
        {goodPoints.filter(g => !GOOD_POINT_PRESETS.includes(g)).map(g => (
          <div key={g} style={P.metricRow}>
            <span style={{ color: "#c9d1d9" }}>{g}</span>
            <button onClick={() => setGoodPoints(p => p.filter(x => x !== g))} style={P.miniBtn}>外す</button>
          </div>
        ))}
      </div>

      <div style={P.card}>
        <div style={P.cardTitle}>🚩 改善点（1行に1つ）</div>
        <textarea value={issuesText} onChange={e => setIssuesText(e.target.value)}
          placeholder={"例：\nトップの位置がまだ少し浅い\nフォロースルーで左肘をもう少し高く"}
          style={{ ...P.input, height: 90, resize: "vertical", lineHeight: 1.7 }} />
      </div>

      <div style={P.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#c9d1d9" }}>💬 定型フレーズ（タップで改善点に挿入）</span>
          <button onClick={() => setSnipManage(m => !m)} style={{ ...P.miniBtn, color: snipManage ? "#00e676" : "#8b949e" }}>
            {snipManage ? "完了" : "✎ 管理"}
          </button>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {snippets.map(s => (
            <span key={s} style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
              <button onClick={() => !snipManage && insertSnippet(s)}
                style={{ ...P.chip, maxWidth: 260, whiteSpace: "normal", textAlign: "left", lineHeight: 1.5, cursor: snipManage ? "default" : "pointer" }}>{s}</button>
              {snipManage && (
                <button onClick={() => setSnippets(p => p.filter(x => x !== s))}
                  style={{ ...P.miniBtn, color: "#ff4444", padding: "1px 6px" }}>✕</button>
              )}
            </span>
          ))}
        </div>
        {snipManage && (
          <div style={{ display: "flex", gap: 5, marginTop: 8 }}>
            <input value={snipInput} onChange={e => setSnipInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") addSnippet(); }}
              placeholder="よく使う言い回しを追加" style={{ ...P.input, flex: 1, margin: 0 }} />
            <button onClick={addSnippet} style={P.btn}>＋</button>
          </div>
        )}
      </div>

      <div style={P.card}>
        <div style={P.cardTitle}>📋 メニュー（{selectedDrills.length}件選択中）</div>
        {selectedDrills.length === 0
          ? <div style={P.note}>「ドリル」タブからチェックで選択すると、下書きのメニュー欄に入ります</div>
          : selectedDrills.map(d => (
            <div key={d.id} style={P.metricRow}>
              <span style={{ color: "#c9d1d9" }}>{d.name} {d.reps}</span>
              <button onClick={() => setSelectedDrillIds(prev => prev.filter(id => id !== d.id))}
                style={P.miniBtn}>外す</button>
            </div>
          ))}
      </div>

      <label style={P.label}>書き出し</label>
      <select value={opening} onChange={e => setOpening(e.target.value)} style={P.input}>
        {OPENING_PRESETS.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <label style={P.label}>結び</label>
      <select value={closing} onChange={e => setClosing(e.target.value)} style={P.input}>
        {CLOSING_PRESETS.map(c => <option key={c} value={c}>{c}</option>)}
      </select>

      <button onClick={generateDraft} style={{ ...P.primaryBtn, width: "100%", marginTop: 10 }}>
        ✍ 下書きを生成
      </button>

      <textarea value={draft} onChange={e => setDraft(e.target.value)}
        placeholder="ここに下書きが生成されます。自由に添削してください。"
        style={{ ...P.input, height: 220, marginTop: 8, lineHeight: 1.7, resize: "vertical" }} />

      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
        <button onClick={copyDraft} disabled={!draft.trim()}
          style={{ ...P.primaryBtn, flex: 1, opacity: draft.trim() ? 1 : 0.5 }}>
          {copied ? "✅ コピーしました" : "📋 コピー（LINEに貼付）"}
        </button>
        <button onClick={saveToHistory} disabled={!draft.trim()}
          style={{ ...P.btn, opacity: draft.trim() ? 1 : 0.5 }}>💾 履歴へ</button>
      </div>

      <div style={P.card}>
        <div style={P.cardTitle}>📄 レポート出力（添付画像 {reportImages.length}枚）</div>
        {reportImages.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
            {reportImages.map((src, i) => (
              <div key={i} style={{ position: "relative", width: 70 }}>
                <img src={src} alt={`添付${i + 1}`} style={{ width: "100%", borderRadius: 4, border: "1px solid #30363d", display: "block" }} />
                <button onClick={() => setReportImages(prev => prev.filter((_, j) => j !== i))}
                  style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%", border: "none", background: "#ff4444", color: "#fff", fontSize: 10, cursor: "pointer", lineHeight: 1 }}>✕</button>
              </div>
            ))}
          </div>
        )}
        <div style={P.note}>動画に丸や矢印を描いた画面を、ヘッダーの「📎 レポートへ」で添付 → 文面と合わせて印刷用レポートに。</div>
        <button onClick={exportReport} disabled={!draft.trim() && reportImages.length === 0}
          style={{ ...P.primaryBtn, width: "100%", marginTop: 8, background: "linear-gradient(135deg,#40c4ff,#0091ea)", opacity: (draft.trim() || reportImages.length > 0) ? 1 : 0.5 }}>
          📄 レポートを開く（印刷 / PDF保存）
        </button>
        <button onClick={() => downloadLineImage({ studentName, categoryLabel, draft, images: reportImages })}
          disabled={!draft.trim() && reportImages.length === 0}
          style={{ ...P.primaryBtn, width: "100%", marginTop: 6, background: "linear-gradient(135deg,#06c755,#00a344)", color: "#fff", opacity: (draft.trim() || reportImages.length > 0) ? 1 : 0.5 }}>
          🖼 LINE用画像で保存（縦長1枚PNG）
        </button>
        <div style={{ ...P.note, marginTop: 4 }}>💡 保護者はPDFより画像の方が開きやすいので、普段はLINE用画像がおすすめです</div>
      </div>
    </div>
  );
}

/* ── ドリルライブラリタブ ─────────────────────── */
const EMPTY_DRILL = { name: "", reps: "", tags: [], note: "", videoUrl: "", videoKey: "" };

function DrillsTab({ drills, setDrills, selectedDrillIds, setSelectedDrillIds, onLoadToAnalyzer }) {
  const [filterTag, setFilterTag] = useState("");
  const [editing, setEditing] = useState(null); // {id, isNew?, ...form}
  const [preview, setPreview] = useState(null); // {id, url}
  const importRef = useRef(null);
  const [importMsg, setImportMsg] = useState("");
  const [busyId, setBusyId] = useState(null);

  const shown = filterTag ? drills.filter(d => d.tags?.includes(filterTag)) : drills;

  const saveDrill = () => {
    if (!editing?.name?.trim()) return;
    if (editing.isNew) {
      const { isNew, ...d } = editing;
      setDrills(prev => [...prev, d]);
    } else {
      setDrills(prev => prev.map(d => d.id === editing.id ? { ...editing } : d));
    }
    setEditing(null);
  };

  const cancelEdit = async () => {
    // 新規作成を取りやめた場合、アップロード済み動画も掃除する
    if (editing?.isNew && editing.videoKey) await deleteVideo(editing.videoKey);
    setEditing(null);
  };

  const attachVideo = async (file) => {
    if (!editing || !file) return;
    setBusyId(editing.id);
    try {
      const key = `drill_${editing.id}`;
      await saveVideo(key, file);
      setEditing(e => ({ ...e, videoKey: key }));
    } catch (err) {
      console.error(err);
      alert("動画の保存に失敗しました。ブラウザの空き容量をご確認ください。");
    }
    setBusyId(null);
  };

  const detachVideo = async () => {
    if (!editing?.videoKey) return;
    await deleteVideo(editing.videoKey);
    setEditing(e => ({ ...e, videoKey: "" }));
  };

  const removeDrill = async (d) => {
    if (d.videoKey) await deleteVideo(d.videoKey);
    setDrills(prev => prev.filter(x => x.id !== d.id));
    setSelectedDrillIds(prev => prev.filter(id => id !== d.id));
    if (preview?.id === d.id) closePreview();
  };

  const closePreview = () => {
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setPreview(null);
  };

  const togglePreview = async (d) => {
    if (preview?.id === d.id) { closePreview(); return; }
    closePreview();
    setBusyId(d.id);
    const blob = await getVideo(d.videoKey);
    setBusyId(null);
    if (!blob) { alert("動画が見つかりません。編集から再アップロードしてください。"); return; }
    setPreview({ id: d.id, url: URL.createObjectURL(blob) });
  };

  const openInAnalyzer = async (d) => {
    setBusyId(d.id);
    const blob = await getVideo(d.videoKey);
    setBusyId(null);
    if (!blob) { alert("動画が見つかりません。編集から再アップロードしてください。"); return; }
    onLoadToAnalyzer?.(URL.createObjectURL(blob));
  };

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
        <button onClick={() => setFilterTag("")}
          style={{ ...P.chip, ...(filterTag === "" ? P.chipOn : {}) }}>すべて</button>
        {ALL_TAGS.map(t => (
          <button key={t} onClick={() => setFilterTag(t)}
            style={{ ...P.chip, ...(filterTag === t ? P.chipOn : {}) }}>{t}</button>
        ))}
      </div>

      {shown.map(d => {
        // 編集中のドリルはカードの位置でそのままフォームに切り替わる
        if (editing && !editing.isNew && editing.id === d.id) {
          return <DrillForm key={d.id} editing={editing} setEditing={setEditing}
            onSave={saveDrill} onCancel={cancelEdit}
            onAttachVideo={attachVideo} onDetachVideo={detachVideo} busy={busyId === d.id} />;
        }
        const on = selectedDrillIds.includes(d.id);
        return (
          <div key={d.id} style={{ ...P.card, marginTop: 8, borderColor: on ? "#00e676" : "#21262d" }}>
            <label style={{ ...P.checkRow, marginBottom: 4 }}>
              <input type="checkbox" checked={on}
                onChange={() => setSelectedDrillIds(prev => on ? prev.filter(id => id !== d.id) : [...prev, d.id])} />
              <b style={{ color: "#e8eaf0" }}>{d.name} <span style={{ color: "#00e676" }}>{d.reps}</span></b>
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 4 }}>
              {(d.tags || []).map(t => <span key={t} style={P.tagBadge}>{t}</span>)}
              {d.videoKey && <span style={{ ...P.tagBadge, color: "#00e676", borderColor: "rgba(0,230,118,0.4)", background: "rgba(0,230,118,0.08)" }}>🎬 お手本動画あり</span>}
            </div>
            {d.note && <div style={{ fontSize: 11, color: "#8b949e", lineHeight: 1.6 }}>{d.note}</div>}
            {d.videoUrl && <div style={{ fontSize: 11, color: "#40c4ff", wordBreak: "break-all" }}>🔗 {d.videoUrl}</div>}
            {preview?.id === d.id && (
              <video src={preview.url} controls playsInline
                style={{ width: "100%", borderRadius: 6, marginTop: 6, background: "#000" }} />
            )}
            <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
              {d.videoKey && (
                <>
                  <button onClick={() => togglePreview(d)} style={{ ...P.miniBtn, color: "#00e676", borderColor: "#00e676" }}>
                    {busyId === d.id ? "..." : preview?.id === d.id ? "⏹ 閉じる" : "▶ お手本を再生"}
                  </button>
                  <button onClick={() => openInAnalyzer(d)} style={{ ...P.miniBtn, color: "#40c4ff", borderColor: "#40c4ff" }}>
                    🎬 分析画面で開く
                  </button>
                </>
              )}
              <button onClick={() => { closePreview(); setEditing({ ...EMPTY_DRILL, ...d }); }} style={P.miniBtn}>✎ 編集</button>
              <button onClick={() => removeDrill(d)} style={{ ...P.miniBtn, color: "#ff4444" }}>🗑 削除</button>
            </div>
          </div>
        );
      })}

      {editing?.isNew ? (
        <DrillForm editing={editing} setEditing={setEditing}
          onSave={saveDrill} onCancel={cancelEdit}
          onAttachVideo={attachVideo} onDetachVideo={detachVideo} busy={busyId === editing.id} />
      ) : !editing && (
        <button onClick={() => setEditing({ ...EMPTY_DRILL, id: `d${Date.now()}`, isNew: true })}
          style={{ ...P.primaryBtn, width: "100%", marginTop: 10 }}>
          ＋ ドリルを追加
        </button>
      )}

      <div style={{ ...P.card, marginTop: 12 }}>
        <div style={P.cardTitle}>💾 バックアップ（ドリル・ルール・履歴）</div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={exportAll} style={{ ...P.btn, flex: 1 }}>⬇ エクスポート</button>
          <button onClick={() => importRef.current?.click()} style={{ ...P.btn, flex: 1 }}>⬆ インポート</button>
        </div>
        {importMsg && <div style={{ ...P.note, marginTop: 4 }}>{importMsg}</div>}
        <input ref={importRef} type="file" accept="application/json" style={{ display: "none" }}
          onChange={e => {
            const f = e.target.files[0];
            if (f) importAll(f, ok => {
              setImportMsg(ok ? "✅ 読み込みました。ページを再読み込みすると反映されます。" : "⚠ ファイル形式が違います");
            });
            e.target.value = "";
          }} />
        <div style={{ ...P.note, marginTop: 4 }}>※ テキストデータはこの端末のブラウザ内に保存。お手本動画（🎬）は容量が大きいためエクスポート対象外です。動画の元ファイルは別途保管してください。</div>
      </div>
    </div>
  );
}

/* ドリル編集フォーム（カードの位置にインライン表示） */
function DrillForm({ editing, setEditing, onSave, onCancel, onAttachVideo, onDetachVideo, busy }) {
  const videoInputRef = useRef(null);
  return (
    <div style={{ ...P.card, marginTop: 8, borderColor: "#40c4ff" }}>
      <div style={P.cardTitle}>{editing.isNew ? "新しいドリル" : "✎ ドリルを編集"}</div>
      <label style={P.label}>ドリル名 *</label>
      <input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} style={P.input} autoFocus />
      <label style={P.label}>回数（例：×20 / 30秒×3）</label>
      <input value={editing.reps} onChange={e => setEditing({ ...editing, reps: e.target.value })} style={P.input} />
      <label style={P.label}>タグ</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {ALL_TAGS.map(t => {
          const on = editing.tags.includes(t);
          return <button key={t} onClick={() => setEditing({ ...editing, tags: on ? editing.tags.filter(x => x !== t) : [...editing.tags, t] })}
            style={{ ...P.chip, ...(on ? P.chipOn : {}) }}>{t}</button>;
        })}
      </div>
      <label style={P.label}>ポイント・注意点</label>
      <textarea value={editing.note} onChange={e => setEditing({ ...editing, note: e.target.value })}
        style={{ ...P.input, height: 60, resize: "vertical" }} />

      <label style={P.label}>🎬 お手本動画（コーチが一度撮ればずっと使い回せます）</label>
      {editing.videoKey ? (
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#00e676" }}>✅ 動画を登録済み</span>
          <button onClick={() => videoInputRef.current?.click()} style={P.miniBtn}>🔄 差し替え</button>
          <button onClick={onDetachVideo} style={{ ...P.miniBtn, color: "#ff4444" }}>削除</button>
        </div>
      ) : (
        <button onClick={() => videoInputRef.current?.click()} style={{ ...P.btn, width: "100%" }}>
          {busy ? "保存中..." : "⬆ 動画ファイルをアップロード"}
        </button>
      )}
      <input ref={videoInputRef} type="file" accept="video/*" style={{ display: "none" }}
        onChange={e => { const f = e.target.files[0]; if (f) onAttachVideo(f); e.target.value = ""; }} />

      <label style={P.label}>外部リンク（YouTube限定公開など・任意）</label>
      <input value={editing.videoUrl} onChange={e => setEditing({ ...editing, videoUrl: e.target.value })} style={P.input} placeholder="https://..." />
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <button onClick={onSave} style={{ ...P.primaryBtn, flex: 1 }}>💾 保存</button>
        <button onClick={onCancel} style={P.btn}>キャンセル</button>
      </div>
    </div>
  );
}

/* ── 履歴タブ ─────────────────────────────── */
function HistoryTab({ history, setHistory }) {
  const [q, setQ] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const shown = q.trim()
    ? history.filter(h => h.studentName.includes(q.trim()) || h.tags?.some(t => t.includes(q.trim())))
    : history;

  const copy = async (h) => {
    try {
      await navigator.clipboard.writeText(h.text);
      setCopiedId(h.id); setTimeout(() => setCopiedId(null), 1500);
    } catch { /* noop */ }
  };

  return (
    <div>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="🔍 生徒名・課題タグで検索" style={P.input} />
      {shown.length === 0 && <div style={{ ...P.note, marginTop: 10 }}>まだ履歴がありません。「AI分析」タブで下書きを保存すると、生徒ごとの指導記録として蓄積され、次回の下書きに再利用できます。</div>}
      {shown.map(h => (
        <div key={h.id} style={{ ...P.card, marginTop: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <b style={{ color: "#e8eaf0" }}>{h.studentName}</b>
            <span style={{ fontSize: 10, color: "#6e7681" }}>{new Date(h.date).toLocaleDateString("ja-JP")}</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, margin: "4px 0" }}>
            {h.category && <span style={{ ...P.tagBadge, color: "#ffea00", borderColor: "rgba(255,234,0,0.4)", background: "rgba(255,234,0,0.08)" }}>{CATEGORIES.find(c => c.id === h.category)?.label || h.category}</span>}
            {(h.tags || []).map(t => <span key={t} style={P.tagBadge}>{t}</span>)}
          </div>
          <div style={{ fontSize: 11, color: "#8b949e", whiteSpace: "pre-wrap", maxHeight: 90, overflow: "hidden", lineHeight: 1.6 }}>{h.text}</div>
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            <button onClick={() => copy(h)} style={P.miniBtn}>{copiedId === h.id ? "✅ コピー済" : "📋 コピーして再利用"}</button>
            <button onClick={() => setHistory(prev => prev.filter(x => x.id !== h.id))}
              style={{ ...P.miniBtn, color: "#ff4444" }}>🗑</button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── パネル用スタイル ─────────────────────── */
const P = {
  panel: { width: 340, flexShrink: 0, background: "#0d1117", borderLeft: "1px solid #21262d", display: "flex", flexDirection: "column", overflow: "hidden" },
  tabBar: { display: "flex", borderBottom: "1px solid #21262d", flexShrink: 0 },
  tabBtn: { flex: 1, background: "transparent", border: "none", borderBottom: "2px solid transparent", color: "#8b949e", padding: "10px 4px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" },
  tabBtnActive: { color: "#00e676", borderBottom: "2px solid #00e676", background: "rgba(0,230,118,0.05)" },
  body: { flex: 1, overflowY: "auto", padding: 12 },
  label: { display: "block", fontSize: 10, color: "#6e7681", fontWeight: 700, margin: "10px 0 3px", letterSpacing: 0.5 },
  input: { width: "100%", boxSizing: "border-box", background: "#161b22", border: "1px solid #30363d", borderRadius: 6, color: "#e8eaf0", padding: "7px 9px", fontSize: 12, fontFamily: "inherit", outline: "none", marginBottom: 2 },
  primaryBtn: { background: "linear-gradient(135deg,#00e676,#00b248)", border: "none", borderRadius: 6, padding: "9px 12px", color: "#000", fontWeight: 700, cursor: "pointer", fontSize: 12, fontFamily: "inherit" },
  btn: { background: "transparent", border: "1px solid #30363d", borderRadius: 6, padding: "8px 12px", color: "#8b949e", cursor: "pointer", fontSize: 12, fontFamily: "inherit", fontWeight: 600 },
  miniBtn: { background: "transparent", border: "1px solid #30363d", borderRadius: 5, padding: "3px 8px", color: "#8b949e", cursor: "pointer", fontSize: 10, fontFamily: "inherit", fontWeight: 600 },
  card: { background: "#161b22", border: "1px solid #21262d", borderRadius: 8, padding: 10, marginTop: 12 },
  cardTitle: { fontSize: 11, fontWeight: 700, color: "#c9d1d9", marginBottom: 8 },
  metricRow: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, padding: "3px 0", borderBottom: "1px solid #1c2128" },
  checkRow: { display: "flex", gap: 8, alignItems: "flex-start", fontSize: 11, padding: "5px 0", cursor: "pointer", lineHeight: 1.6 },
  chip: { background: "#161b22", border: "1px solid #30363d", borderRadius: 12, padding: "3px 9px", color: "#8b949e", fontSize: 10, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 },
  chipOn: { border: "1px solid #00e676", color: "#00e676", background: "rgba(0,230,118,0.1)" },
  tagBadge: { background: "rgba(64,196,255,0.1)", border: "1px solid rgba(64,196,255,0.3)", borderRadius: 4, padding: "1px 6px", fontSize: 9, color: "#40c4ff", fontWeight: 700 },
  note: { fontSize: 10, color: "#6e7681", lineHeight: 1.6, marginTop: 4 },
  progressWrap: { height: 6, background: "#21262d", borderRadius: 3, overflow: "hidden", marginTop: 6 },
  progressFill: { height: "100%", background: "linear-gradient(90deg,#00e676,#00b248)", transition: "width 0.3s", borderRadius: 3 },
};
