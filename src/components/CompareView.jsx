import { useState, useRef, useEffect, useCallback } from "react";
import { getVideo } from "../lib/videoStore";
import { TOOLS, SPEEDS, PRESET_COLORS, renderShape } from "../lib/draw";
import { convertWebmToMp4, downloadBlob } from "../lib/mp4";

// 描画ツール（比較用サブセット）
const CMP_TOOLS = [
  { id: TOOLS.POINTER, icon: "🖱", label: "操作" },
  { id: TOOLS.ARROW, icon: "↗", label: "矢印" },
  { id: TOOLS.CIRCLE, icon: "○", label: "丸" },
  { id: TOOLS.LINE, icon: "／", label: "直線" },
  { id: TOOLS.FREEHAND, icon: "✏", label: "フリー" },
];

// 2画面比較：個別に再生・スロー・シーク・描き込み。同時操作・キャプチャ・解説録画も可能
export default function CompareView({ drills = [], mainSrc = null, recBlob = null, onAddReportImage, reportCount = 0 }) {
  const [srcA, setSrcA] = useState(null);
  const [srcB, setSrcB] = useState(null);
  const [mirrorA, setMirrorA] = useState(false);
  const [mirrorB, setMirrorB] = useState(false);
  const [tool, setTool] = useState(TOOLS.POINTER);
  const [color, setColor] = useState("#ff1744");
  const [syncSpeed, setSyncSpeed] = useState(0.5);
  const [bothPlaying, setBothPlaying] = useState(false);
  const vA = useRef(null);
  const vB = useRef(null);
  const cA = useRef(null); // 各画面の描画キャンバス（録画・キャプチャ合成にも使う）
  const cB = useRef(null);
  const mirrorRef = useRef({ a: false, b: false });
  useEffect(() => { mirrorRef.current = { a: mirrorA, b: mirrorB }; }, [mirrorA, mirrorB]);

  // 録画
  const [recState, setRecState] = useState("idle"); // idle | recording | preview
  const [recTime, setRecTime] = useState(0);
  const [cmpRecBlob, setCmpRecBlob] = useState(null);
  const [micError, setMicError] = useState(false);
  const [convState, setConvState] = useState("idle");
  const [convMessage, setConvMessage] = useState("");
  const [capMsg, setCapMsg] = useState("");
  const recorderRef = useRef(null);
  const recChunksRef = useRef([]);
  const rafRef = useRef(0);
  const recTimerRef = useRef(null);

  const drillsWithVideo = drills.filter(d => d.videoKey);
  const each = (fn) => [vA.current, vB.current].forEach(v => v && fn(v));

  const playBoth = async () => {
    if (bothPlaying) { each(v => v.pause()); setBothPlaying(false); return; }
    each(v => { v.playbackRate = syncSpeed; });
    try { await Promise.all([vA.current?.play(), vB.current?.play()]); } catch { /* noop */ }
    setBothPlaying(true);
  };

  const stepBoth = (fwd) => {
    each(v => {
      v.pause();
      v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + (fwd ? 1 / 30 : -1 / 30)));
    });
    setBothPlaying(false);
  };

  const restartBoth = () => { each(v => { v.pause(); v.currentTime = 0; }); setBothPlaying(false); };
  const applySyncSpeed = (s) => { setSyncSpeed(s); each(v => { v.playbackRate = s; }); };

  // ── 2画面を1枚に合成（キャプチャ・録画共通）──
  const drawComposite = (ctx, W, H) => {
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
    const panes = [
      { v: vA.current, c: cA.current, mirror: mirrorRef.current.a },
      { v: vB.current, c: cB.current, mirror: mirrorRef.current.b },
    ].filter(p => p.v && p.v.videoWidth);
    if (panes.length === 0) return;
    const halfW = panes.length === 2 ? (W - 4) / 2 : W;
    panes.forEach((p, idx) => {
      const x0 = idx * (halfW + 4);
      // contain フィット
      const scale = Math.min(halfW / p.v.videoWidth, H / p.v.videoHeight);
      const dw = p.v.videoWidth * scale, dh = p.v.videoHeight * scale;
      const dx = x0 + (halfW - dw) / 2, dy = (H - dh) / 2;
      ctx.save();
      if (p.mirror) { ctx.translate(dx + dw, dy); ctx.scale(-1, 1); ctx.drawImage(p.v, 0, 0, dw, dh); }
      else ctx.drawImage(p.v, dx, dy, dw, dh);
      ctx.restore();
      if (p.c) ctx.drawImage(p.c, dx, dy, dw, dh); // 描き込み（表示どおり非反転で重ねる）
    });
    if (panes.length === 2) { ctx.fillStyle = "#222"; ctx.fillRect(halfW, 0, 4, H); }
  };

  const capMsgShow = (m) => { setCapMsg(m); setTimeout(() => setCapMsg(""), 3500); };

  // 📸 2画面＋描き込みを1枚画像にしてレポートへ
  const captureCompare = () => {
    if (!vA.current?.videoWidth && !vB.current?.videoWidth) return;
    const H = 720;
    const W = (vA.current?.videoWidth && vB.current?.videoWidth) ? 1920 : 1280;
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    drawComposite(c.getContext("2d"), W, H);
    onAddReportImage?.(c.toDataURL("image/jpeg", 0.85));
    capMsgShow("✅ 比較画面をレポートに追加しました");
  };

  // 🎙 比較画面ごと解説録画（両動画＋描き込み＋マイク音声）
  const startRecording = async () => {
    if (!vA.current?.videoWidth && !vB.current?.videoWidth) return;
    setMicError(false);
    const H = 720;
    const W = (vA.current?.videoWidth && vB.current?.videoWidth) ? 1920 : 1280;
    const recCanvas = document.createElement("canvas");
    recCanvas.width = W; recCanvas.height = H;
    const rCtx = recCanvas.getContext("2d");
    const loop = () => { drawComposite(rCtx, W, H); rafRef.current = requestAnimationFrame(loop); };
    loop();
    const tracks = [];
    recCanvas.captureStream(30).getTracks().forEach(t => tracks.push(t));
    try {
      const mic = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      mic.getAudioTracks().forEach(t => tracks.push(t));
    } catch { setMicError(true); }
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus") ? "video/webm;codecs=vp9,opus"
      : MediaRecorder.isTypeSupported("video/webm") ? "video/webm" : "";
    const rec = new MediaRecorder(new MediaStream(tracks), mimeType ? { mimeType } : {});
    recChunksRef.current = [];
    rec.ondataavailable = e => { if (e.data.size > 0) recChunksRef.current.push(e.data); };
    rec.onstop = () => {
      cancelAnimationFrame(rafRef.current);
      rec.stream?.getTracks?.().forEach(t => t.stop());
      setCmpRecBlob(new Blob(recChunksRef.current, { type: "video/webm" }));
      setRecState("preview");
      clearInterval(recTimerRef.current);
    };
    rec.start(100);
    recorderRef.current = rec;
    setRecState("recording"); setRecTime(0);
    recTimerRef.current = setInterval(() => setRecTime(t => t + 1), 1000);
  };

  const stopRecording = () => { recorderRef.current?.stop(); clearInterval(recTimerRef.current); };

  const convertRec = async () => {
    if (!cmpRecBlob) return;
    setConvState("converting");
    try {
      const mp4 = await convertWebmToMp4(cmpRecBlob, { onMessage: setConvMessage });
      downloadBlob(mp4, `wise-compare-${Date.now()}.mp4`);
      setConvState("done"); setConvMessage("MP4変換完了！LINEで送信できます");
      setTimeout(() => { setConvState("idle"); setConvMessage(""); }, 4000);
    } catch (e) {
      console.error(e);
      setConvState("error"); setConvMessage("変換に失敗しました。もう一度お試しください。");
      setTimeout(() => { setConvState("idle"); setConvMessage(""); }, 4000);
    }
  };

  const discardRec = () => { setCmpRecBlob(null); setRecState("idle"); setRecTime(0); setConvState("idle"); setConvMessage(""); };

  const fmtRec = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ flex: 1, display: "flex", gap: 2, background: "#000", overflow: "hidden" }}>
        <Pane title="A：お手本 / 先週 / 元動画" src={srcA} setSrc={setSrcA} videoRef={vA} canvasRef={cA}
          mirror={mirrorA} setMirror={setMirrorA}
          tool={tool} color={color} onAnyPause={() => setBothPlaying(false)}
          drillsWithVideo={drillsWithVideo} mainSrc={mainSrc} recBlob={recBlob} />
        <Pane title="B：生徒 / 今週 / 解説" src={srcB} setSrc={setSrcB} videoRef={vB} canvasRef={cB}
          mirror={mirrorB} setMirror={setMirrorB}
          tool={tool} color={color} onAnyPause={() => setBothPlaying(false)}
          drillsWithVideo={drillsWithVideo} mainSrc={mainSrc} recBlob={recBlob} />
      </div>

      {/* 録画プレビューバー */}
      {recState === "preview" && cmpRecBlob && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#161b22", borderTop: "1px solid #ffea00", padding: "8px 14px", flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "#ffea00", fontWeight: 700 }}>🎙 解説録画 完了（{fmtRec(recTime)}）</span>
          {micError && <span style={{ fontSize: 10, color: "#ff8a65" }}>⚠ マイクなしで録画されました</span>}
          <div style={{ flex: 1 }} />
          {convMessage && <span style={{ fontSize: 11, color: convState === "error" ? "#ff4444" : "#40c4ff" }}>{convMessage}</span>}
          <button onClick={convertRec} disabled={convState === "converting"}
            style={{ ...C.ctrlBtn, borderColor: "#00e676", color: "#00e676", fontWeight: 700, opacity: convState === "converting" ? 0.6 : 1 }}>
            📱 MP4に変換して保存
          </button>
          <button onClick={() => downloadBlob(cmpRecBlob, `wise-compare-${Date.now()}.webm`)} style={C.ctrlBtn}>⬇ WebM</button>
          <button onClick={discardRec} style={{ ...C.ctrlBtn, color: "#6e7681" }}>✕ 破棄</button>
        </div>
      )}

      {/* 共通コントロール */}
      <div style={C.controls}>
        <span style={{ fontSize: 10, color: "#6e7681", fontWeight: 700 }}>描画</span>
        {CMP_TOOLS.map(t => (
          <button key={t.id} onClick={() => setTool(t.id)} title={t.label}
            style={{ ...C.ctrlBtn, minWidth: 36, borderColor: tool === t.id ? "#00e676" : "#30363d", color: tool === t.id ? "#00e676" : "#8b949e", background: tool === t.id ? "rgba(0,230,118,0.1)" : "transparent" }}>
            {t.icon}
          </button>
        ))}
        {PRESET_COLORS.slice(0, 5).map(c => (
          <button key={c} onClick={() => setColor(c)}
            style={{ width: 18, height: 18, borderRadius: "50%", background: c, border: color === c ? "2px solid #fff" : "2px solid transparent", cursor: "pointer", padding: 0 }} />
        ))}
        <div style={{ width: 1, height: 24, background: "#21262d" }} />
        <span style={{ fontSize: 10, color: "#6e7681", fontWeight: 700 }}>同時</span>
        <button onClick={restartBoth} style={C.ctrlBtn}>⏮</button>
        <button onClick={() => stepBoth(false)} style={C.ctrlBtn}>-1f</button>
        <button onClick={playBoth} disabled={!srcA && !srcB}
          style={{ ...C.ctrlBtn, minWidth: 92, fontWeight: 700, borderColor: bothPlaying ? "#ff4444" : "#00e676", color: bothPlaying ? "#ff4444" : "#00e676" }}>
          {bothPlaying ? "⏸ 同時停止" : "▶ 同時再生"}
        </button>
        <button onClick={() => stepBoth(true)} style={C.ctrlBtn}>+1f</button>
        {SPEEDS.map(s => (
          <button key={s.value} onClick={() => applySyncSpeed(s.value)}
            style={{ ...C.ctrlBtn, minWidth: 40, borderColor: syncSpeed === s.value ? "#00e676" : "#30363d", color: syncSpeed === s.value ? "#00e676" : "#8b949e" }}>
            {s.label}
          </button>
        ))}
        <div style={{ width: 1, height: 24, background: "#21262d" }} />
        <button onClick={captureCompare} disabled={!srcA && !srcB} title="2画面＋描き込みを1枚画像にしてレポートへ添付"
          style={{ ...C.ctrlBtn, borderColor: "#40c4ff", color: "#40c4ff" }}>
          📸 レポートへ{reportCount > 0 ? `（${reportCount}）` : ""}
        </button>
        {recState === "recording" ? (
          <button onClick={stopRecording}
            style={{ ...C.ctrlBtn, borderColor: "#ff4444", color: "#ff4444", fontWeight: 700 }}>
            ⏹ 録画停止（{fmtRec(recTime)}）
          </button>
        ) : (
          <button onClick={startRecording} disabled={(!srcA && !srcB) || recState === "preview"}
            title="2画面＋描き込みを音声解説つきで録画（MP4でLINE送付可）"
            style={{ ...C.ctrlBtn, borderColor: "#ffea00", color: "#ffea00", fontWeight: 700, opacity: (!srcA && !srcB) || recState === "preview" ? 0.5 : 1 }}>
            🎙 解説録画
          </button>
        )}
        {capMsg && <span style={{ fontSize: 10, color: "#40c4ff" }}>{capMsg}</span>}
        {recState === "recording" && <span style={{ fontSize: 10, color: "#ff4444", fontWeight: 700 }}>● REC 再生・描き込みがそのまま録画されます</span>}
      </div>
    </div>
  );
}

/* ── 1画面ぶん：動画＋描画キャンバス＋個別コントロール ───────── */
function Pane({ title, src, setSrc, videoRef, canvasRef, mirror, setMirror, tool, color, onAnyPause, drillsWithVideo, mainSrc, recBlob }) {
  const fileRef = useRef(null);
  const drawing = useRef(null);
  const [shapes, setShapes] = useState([]);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(0.5);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const pickSource = async (v) => {
    if (v === "file") { fileRef.current?.click(); return; }
    if (v === "main" && mainSrc) { loadSrc(mainSrc); return; }
    if (v === "rec" && recBlob) { loadSrc(URL.createObjectURL(recBlob)); return; }
    if (v.startsWith("drill:")) {
      const blob = await getVideo(v.slice(6));
      if (blob) loadSrc(URL.createObjectURL(blob));
      else alert("動画が見つかりません。ドリルの編集から再アップロードしてください。");
    }
  };

  const loadSrc = (url) => { setSrc(url); setShapes([]); setTime(0); setDuration(0); setPlaying(false); };

  const redraw = useCallback((extra) => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);
    shapes.forEach(s => renderShape(ctx, s));
    if (extra) renderShape(ctx, extra);
  }, [shapes, canvasRef]);

  useEffect(() => { redraw(); }, [redraw]);

  const onMeta = () => {
    const v = videoRef.current, c = canvasRef.current;
    if (v && c) { c.width = v.videoWidth || 1280; c.height = v.videoHeight || 720; }
    setDuration(v?.duration || 0);
    if (v) v.playbackRate = speed;
  };

  const getPos = (e) => {
    const c = canvasRef.current;
    const r = c.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (c.width / r.width),
      y: (e.clientY - r.top) * (c.height / r.height),
    };
  };

  const onDown = (e) => {
    if (tool === TOOLS.POINTER) return;
    e.preventDefault();
    const pos = getPos(e);
    drawing.current = tool === TOOLS.FREEHAND
      ? { type: TOOLS.FREEHAND, points: [pos], color, strokeWidth: 4 }
      : { type: tool, x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y, color, strokeWidth: 4 };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e) => {
    if (!drawing.current) return;
    const pos = getPos(e);
    if (drawing.current.type === TOOLS.FREEHAND) drawing.current.points.push(pos);
    else { drawing.current.x2 = pos.x; drawing.current.y2 = pos.y; }
    redraw(drawing.current);
  };
  const onUp = () => {
    if (!drawing.current) return;
    const s = drawing.current; drawing.current = null;
    setShapes(prev => [...prev, s]);
  };

  const togglePlay = async () => {
    const v = videoRef.current; if (!v) return;
    if (v.paused) { v.playbackRate = speed; try { await v.play(); } catch { /* noop */ } }
    else { v.pause(); onAnyPause?.(); }
  };

  const step = (fwd) => {
    const v = videoRef.current; if (!v) return;
    v.pause(); onAnyPause?.();
    v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + (fwd ? 1 / 30 : -1 / 30)));
  };

  const changeSpeed = (s) => {
    setSpeed(s);
    if (videoRef.current) videoRef.current.playbackRate = s;
  };

  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  return (
    <div style={C.pane}>
      <div style={C.paneHead}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#00e676", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</span>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {src && (
            <button onClick={() => setMirror(!mirror)}
              style={{ ...C.miniBtn, color: mirror ? "#00e676" : "#8b949e", borderColor: mirror ? "#00e676" : "#30363d" }}>⇋ 反転</button>
          )}
          <select value="" onChange={e => { pickSource(e.target.value); e.target.value = ""; }} style={C.select}>
            <option value="" disabled>📂 動画を選ぶ…</option>
            <option value="file">💻 ファイルから</option>
            {mainSrc && <option value="main">🎬 分析中の動画</option>}
            {recBlob && <option value="rec">🎙 解説録画（直近）</option>}
            {drillsWithVideo.length > 0 && (
              <optgroup label="📚 ドリルのお手本">
                {drillsWithVideo.map(d => <option key={d.id} value={`drill:${d.videoKey}`}>{d.name}</option>)}
              </optgroup>
            )}
          </select>
        </div>
      </div>

      <div style={C.paneBody}>
        {src ? (
          <div style={{ position: "relative", maxWidth: "100%", maxHeight: "100%", display: "flex" }}>
            <video ref={videoRef} src={src} playsInline preload="auto"
              onLoadedMetadata={onMeta}
              onTimeUpdate={e => setTime(e.currentTarget.currentTime)}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => { setPlaying(false); onAnyPause?.(); }}
              onRateChange={e => setSpeed(e.currentTarget.playbackRate)}
              style={{ display: "block", maxWidth: "100%", maxHeight: "100%", objectFit: "contain", transform: mirror ? "scaleX(-1)" : "none" }} />
            <canvas ref={canvasRef}
              onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%",
                cursor: tool === TOOLS.POINTER ? "default" : "crosshair",
                pointerEvents: tool === TOOLS.POINTER ? "none" : "auto", touchAction: "none" }} />
          </div>
        ) : (
          <div onClick={() => fileRef.current?.click()} style={C.empty}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🎬</div>
            <div style={{ fontSize: 12, color: "#8b949e" }}>クリックして動画を選択</div>
          </div>
        )}
      </div>

      {src && (
        <div style={C.paneCtrl}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <button onClick={togglePlay}
              style={{ ...C.miniBtn, minWidth: 40, fontWeight: 700, color: playing ? "#ff4444" : "#00e676", borderColor: playing ? "#ff4444" : "#00e676" }}>
              {playing ? "⏸" : "▶"}
            </button>
            <button onClick={() => step(false)} style={C.miniBtn}>-1f</button>
            <button onClick={() => step(true)} style={C.miniBtn}>+1f</button>
            <input type="range" min={0} max={duration || 0} step={0.01} value={time}
              onChange={e => { const v = videoRef.current; if (v) v.currentTime = Number(e.target.value); }}
              style={{ flex: 1, accentColor: "#00e676", minWidth: 40 }} />
            <span style={{ fontSize: 9, color: "#6e7681", fontFamily: "monospace", whiteSpace: "nowrap" }}>{fmt(time)}/{fmt(duration)}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
            {SPEEDS.map(s => (
              <button key={s.value} onClick={() => changeSpeed(s.value)}
                style={{ ...C.miniBtn, minWidth: 34, borderColor: speed === s.value ? "#00e676" : "#30363d", color: speed === s.value ? "#00e676" : "#8b949e" }}>
                {s.label}
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <button onClick={() => setShapes(prev => prev.slice(0, -1))} disabled={shapes.length === 0}
              style={{ ...C.miniBtn, opacity: shapes.length ? 1 : 0.4 }}>↩ 戻す</button>
            <button onClick={() => setShapes([])} disabled={shapes.length === 0}
              style={{ ...C.miniBtn, color: "#ff4444", opacity: shapes.length ? 1 : 0.4 }}>🗑 描画クリア</button>
          </div>
        </div>
      )}

      <input ref={fileRef} type="file" accept="video/*" style={{ display: "none" }}
        onChange={e => { const f = e.target.files[0]; if (f) loadSrc(URL.createObjectURL(f)); e.target.value = ""; }} />
    </div>
  );
}

const C = {
  pane: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 },
  paneHead: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: "#0d1117", borderBottom: "1px solid #21262d", gap: 6 },
  paneBody: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#000", overflow: "hidden" },
  paneCtrl: { background: "#0d1117", borderTop: "1px solid #21262d", padding: "6px 10px", flexShrink: 0 },
  empty: { border: "2px dashed #30363d", borderRadius: 12, padding: "36px 44px", textAlign: "center", cursor: "pointer" },
  miniBtn: { background: "transparent", border: "1px solid #30363d", borderRadius: 5, padding: "3px 8px", color: "#8b949e", cursor: "pointer", fontSize: 10, fontFamily: "inherit", fontWeight: 600, whiteSpace: "nowrap" },
  select: { background: "#161b22", border: "1px solid #30363d", borderRadius: 5, padding: "3px 6px", color: "#c9d1d9", fontSize: 10, fontFamily: "inherit", fontWeight: 600, cursor: "pointer", maxWidth: 150 },
  controls: { display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", background: "#0d1117", borderTop: "1px solid #21262d", padding: "8px 14px", flexShrink: 0 },
  ctrlBtn: { background: "transparent", border: "1px solid #30363d", borderRadius: 6, padding: "5px 8px", color: "#8b949e", cursor: "pointer", fontSize: 12, fontFamily: "inherit", fontWeight: 600, whiteSpace: "nowrap" },
};
