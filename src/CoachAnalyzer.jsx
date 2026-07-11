import { useState, useRef, useEffect, useCallback } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import SidePanel from "./components/SidePanel";
import CompareView from "./components/CompareView";
import { load, save } from "./lib/store";
import { DEFAULT_DRILLS, DEFAULT_SNIPPETS } from "./lib/defaults";
import { TOOLS, SPEEDS, PRESET_COLORS, renderShape, calcAngle } from "./lib/draw";

export default function CoachAnalyzer() {
  const [videoSrc, setVideoSrc] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [tool, setTool] = useState(TOOLS.ARROW);
  const [color, setColor] = useState("#00e676");
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [annotations, setAnnotations] = useState([]);
  const [undoStack, setUndoStack] = useState([[]]);
  const [undoIndex, setUndoIndex] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentShape, setCurrentShape] = useState(null);
  const [anglePoints, setAnglePoints] = useState([]);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [videoSize, setVideoSize] = useState({ w: 1280, h: 720 });
  const [textInput, setTextInput] = useState("");
  const [textPos, setTextPos] = useState(null);

  // View mode / new features
  const [mode, setMode] = useState("single");       // single | compare
  const [mirror, setMirror] = useState(false);      // 左右反転
  const [panelOpen, setPanelOpen] = useState(false);

  // 永続データ（localStorage）
  const [drills, setDrills] = useState(() => load("drills", DEFAULT_DRILLS));
  const [history, setHistory] = useState(() => load("history", []));
  const [snippets, setSnippets] = useState(() => load("snippets", DEFAULT_SNIPPETS));
  const [selectedDrillIds, setSelectedDrillIds] = useState([]);
  const [reportImages, setReportImages] = useState([]); // レポート用にキャプチャした注釈入りフレーム
  const [stripOpen, setStripOpen] = useState(false);    // 連続コマ生成パネル
  const [stripBusy, setStripBusy] = useState(false);
  const [stripCount, setStripCount] = useState(6);
  const [stripInterval, setStripInterval] = useState(0.15);
  const [stripMsg, setStripMsg] = useState("");

  // Recording
  const [recState, setRecState] = useState("idle"); // idle | recording | preview
  const [recBlob, setRecBlob] = useState(null);
  const [recTime, setRecTime] = useState(0);
  const [micError, setMicError] = useState(false);

  // FFmpeg conversion
  const [convState, setConvState] = useState("idle"); // idle | loading | converting | done | error
  const [convProgress, setConvProgress] = useState(0);
  const [convMessage, setConvMessage] = useState("");

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const textInputRef = useRef(null);
  const recorderRef = useRef(null);
  const recChunksRef = useRef([]);
  const recTimerRef = useRef(null);
  const rafRef = useRef(null);
  const annotationsRef = useRef(annotations);
  const currentShapeRef = useRef(null);
  const ffmpegRef = useRef(null);

  useEffect(() => { annotationsRef.current = annotations; }, [annotations]);
  useEffect(() => { currentShapeRef.current = currentShape; }, [currentShape]);
  useEffect(() => { if (videoRef.current) videoRef.current.playbackRate = speed; }, [speed]);

  // 永続化
  useEffect(() => { save("drills", drills); }, [drills]);
  useEffect(() => { save("history", history); }, [history]);
  useEffect(() => { save("snippets", snippets); }, [snippets]);

  const redraw = useCallback(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);
    annotations.forEach(s => renderShape(ctx, s));
    if (currentShape) renderShape(ctx, currentShape);
  }, [annotations, currentShape]);
  useEffect(() => { redraw(); }, [redraw]);

  const getPos = (e) => {
    const c = canvasRef.current; if (!c) return { x: 0, y: 0 };
    const r = c.getBoundingClientRect();
    const scaleX = c.width / r.width, scaleY = c.height / r.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - r.left) * scaleX, y: (clientY - r.top) * scaleY };
  };

  const pushUndo = (ann) => {
    const s = undoStack.slice(0, undoIndex + 1); s.push([...ann]);
    setUndoStack(s); setUndoIndex(s.length - 1);
  };
  const undo = () => { if (undoIndex > 0) { const i = undoIndex - 1; setUndoIndex(i); setAnnotations([...undoStack[i]]); } };
  const redo = () => { if (undoIndex < undoStack.length - 1) { const i = undoIndex + 1; setUndoIndex(i); setAnnotations([...undoStack[i]]); } };
  const clearAll = () => { setAnnotations([]); setAnglePoints([]); setCurrentShape(null); setTextPos(null); pushUndo([]); };

  const handleDown = (e) => {
    if (tool === TOOLS.POINTER) return;
    e.preventDefault();
    const pos = getPos(e);
    if (tool === TOOLS.TEXT) { setTextPos(pos); setTextInput(""); setTimeout(() => textInputRef.current?.focus(), 50); return; }
    if (tool === TOOLS.ANGLE) {
      const pts = [...anglePoints, pos];
      if (pts.length === 3) {
        const shape = { type: TOOLS.ANGLE, points: pts, color, strokeWidth };
        const next = [...annotations, shape]; setAnnotations(next); pushUndo(next);
        setAnglePoints([]); setCurrentShape(null);
      } else { setAnglePoints(pts); setCurrentShape({ type: TOOLS.ANGLE, points: pts, color, strokeWidth }); }
      return;
    }
    setIsDrawing(true);
    if (tool === TOOLS.FREEHAND) setCurrentShape({ type: TOOLS.FREEHAND, points: [pos], color, strokeWidth });
    else setCurrentShape({ type: tool, x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y, color, strokeWidth });
  };

  const handleMove = (e) => {
    if (tool === TOOLS.POINTER || tool === TOOLS.TEXT) return;
    e.preventDefault();
    const pos = getPos(e);
    if (tool === TOOLS.ANGLE && anglePoints.length > 0) { setCurrentShape({ type: TOOLS.ANGLE, points: [...anglePoints, pos], color, strokeWidth }); return; }
    if (!isDrawing) return;
    if (tool === TOOLS.FREEHAND) setCurrentShape(p => ({ ...p, points: [...p.points, pos] }));
    else setCurrentShape(p => ({ ...p, x2: pos.x, y2: pos.y }));
  };

  const handleUp = () => {
    if (!isDrawing || tool === TOOLS.POINTER || tool === TOOLS.ANGLE || tool === TOOLS.TEXT) return;
    if (currentShape) { const next = [...annotations, currentShape]; setAnnotations(next); pushUndo(next); }
    setIsDrawing(false); setCurrentShape(null);
  };

  const commitText = () => {
    if (textPos && textInput.trim()) {
      const shape = { type: TOOLS.TEXT, x1: textPos.x, y1: textPos.y, text: textInput.trim(), color, strokeWidth };
      const next = [...annotations, shape]; setAnnotations(next); pushUndo(next);
    }
    setTextPos(null); setTextInput("");
  };

  const togglePlay = async () => {
    const v = videoRef.current; if (!v) return;
    try { if (v.paused) { await v.play(); } else { v.pause(); } } catch (err) { console.error(err); }
  };

  const stepFrame = (fwd) => {
    const v = videoRef.current; if (!v) return;
    v.pause();
    v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + (fwd ? 1 / 30 : -1 / 30)));
  };

  const handleVideoLoad = () => {
    const v = videoRef.current, c = canvasRef.current; if (!v || !c) return;
    c.width = v.videoWidth || 1280; c.height = v.videoHeight || 720;
    setVideoSize({ w: v.videoWidth, h: v.videoHeight });
    setDuration(v.duration || 0);
    v.playbackRate = speed;
  };

  const handleTimeUpdate = () => {
    const v = videoRef.current; if (!v || !v.duration) return;
    setCurrentTime(v.currentTime); setProgress(v.currentTime / v.duration * 100);
  };

  const seek = (e) => {
    const v = videoRef.current; if (!v || !v.duration) return;
    const r = e.currentTarget.getBoundingClientRect();
    v.currentTime = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * v.duration;
  };

  const exportFrame = () => {
    const v = videoRef.current, c = canvasRef.current; if (!v || !c) return;
    const ec = document.createElement("canvas");
    ec.width = c.width; ec.height = c.height;
    const ctx = ec.getContext("2d");
    ctx.drawImage(v, 0, 0, c.width, c.height);
    annotationsRef.current.forEach(s => renderShape(ctx, s));
    const a = document.createElement("a");
    a.download = `wise-coaching-${Date.now()}.png`;
    a.href = ec.toDataURL("image/png"); a.click();
  };

  // 現在のフレーム＋注釈をレポート用に追加（PDF風レポートの素材になる）
  const captureToReport = () => {
    const v = videoRef.current, c = canvasRef.current; if (!v || !c) return;
    const ec = document.createElement("canvas");
    ec.width = c.width; ec.height = c.height;
    const ctx = ec.getContext("2d");
    ctx.drawImage(v, 0, 0, c.width, c.height);
    annotationsRef.current.forEach(s => renderShape(ctx, s));
    setReportImages(prev => [...prev, ec.toDataURL("image/jpeg", 0.85)]);
  };

  // 連続コマ写真：現在位置から一定間隔でNコマを横並び1枚に合成（雑誌のスイング連続写真風）
  const generateStrip = async () => {
    const v = videoRef.current; if (!v || !v.duration || stripBusy) return;
    setStripBusy(true); setStripMsg("");
    const t0 = v.currentTime, wasPaused = v.paused;
    v.pause();
    const seekTo = (t) => new Promise(res => {
      const on = () => { v.removeEventListener("seeked", on); res(); };
      v.addEventListener("seeked", on);
      v.currentTime = Math.min(v.duration - 0.01, Math.max(0, t));
    });
    try {
      const cellH = 480;
      const cellW = Math.round(v.videoWidth * (cellH / v.videoHeight));
      const gap = 4, labelH = 34;
      const c = document.createElement("canvas");
      c.width = stripCount * cellW + (stripCount - 1) * gap;
      c.height = cellH + labelH;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#000"; ctx.fillRect(0, 0, c.width, c.height);
      for (let i = 0; i < stripCount; i++) {
        const t = t0 + i * stripInterval;
        if (t > v.duration) break;
        await seekTo(t);
        const x = i * (cellW + gap);
        ctx.drawImage(v, x, 0, cellW, cellH);
        ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.fillRect(x, cellH, cellW, labelH);
        ctx.fillStyle = "#ffea00"; ctx.font = "bold 20px monospace";
        ctx.fillText(`${i + 1}  (+${(i * stripInterval).toFixed(2)}s)`, x + 10, cellH + 24);
      }
      setReportImages(prev => [...prev, c.toDataURL("image/jpeg", 0.85)]);
      setStripMsg("✅ 連続コマをレポートに追加しました");
      setTimeout(() => setStripMsg(""), 4000);
      setStripOpen(false);
    } catch (e) {
      console.error(e);
      setStripMsg("⚠ 連続コマの生成に失敗しました");
    }
    await seekTo(t0);
    if (!wasPaused) { try { await v.play(); } catch { /* noop */ } }
    setStripBusy(false);
  };


  // ── Recording ──
  const startRecording = async () => {
    const v = videoRef.current, c = canvasRef.current; if (!v || !c) return;
    setMicError(false);
    const recCanvas = document.createElement("canvas");
    recCanvas.width = c.width; recCanvas.height = c.height;
    const rCtx = recCanvas.getContext("2d");
    const drawLoop = () => {
      rCtx.clearRect(0, 0, recCanvas.width, recCanvas.height);
      rCtx.drawImage(v, 0, 0, recCanvas.width, recCanvas.height);
      annotationsRef.current.forEach(s => renderShape(rCtx, s));
      if (currentShapeRef.current) renderShape(rCtx, currentShapeRef.current); // 描いている途中の線も録画に反映
      rafRef.current = requestAnimationFrame(drawLoop);
    };
    drawLoop();
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
      setRecBlob(new Blob(recChunksRef.current, { type: "video/webm" }));
      setRecState("preview");
      clearInterval(recTimerRef.current);
    };
    rec.start(100);
    recorderRef.current = rec;
    setRecState("recording"); setRecTime(0);
    recTimerRef.current = setInterval(() => setRecTime(t => t + 1), 1000);
  };

  const stopRecording = () => { recorderRef.current?.stop(); clearInterval(recTimerRef.current); };

  // ── FFmpeg MP4 conversion ──
  const convertToMp4 = async () => {
    if (!recBlob) return;
    setConvState("loading"); setConvProgress(0); setConvMessage("FFmpegを読み込み中...");
    try {
      if (!ffmpegRef.current) {
        const ffmpeg = new FFmpeg();
        ffmpeg.on("progress", ({ progress }) => {
          setConvProgress(Math.round(progress * 100));
          setConvMessage(`変換中... ${Math.round(progress * 100)}%`);
        });
        ffmpeg.on("log", ({ message }) => console.log("[ffmpeg]", message));
        const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
        await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
        });
        ffmpegRef.current = ffmpeg;
      }
      const ffmpeg = ffmpegRef.current;
      setConvState("converting"); setConvMessage("変換中... 0%");
      await ffmpeg.writeFile("input.webm", await fetchFile(recBlob));
      // -vf scale: ensure width/height are divisible by 2 (MP4/H.264 requirement)
      await ffmpeg.exec([
        "-i", "input.webm",
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "23",
        "-c:a", "aac",
        "-b:a", "128k",
        "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2",
        "-movflags", "+faststart",
        "output.mp4"
      ]);
      const data = await ffmpeg.readFile("output.mp4");
      const mp4Blob = new Blob([data.buffer], { type: "video/mp4" });
      const url = URL.createObjectURL(mp4Blob);
      const a = document.createElement("a");
      a.href = url; a.download = `wise-coaching-${Date.now()}.mp4`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      // cleanup ffmpeg virtual FS
      try { await ffmpeg.deleteFile("input.webm"); await ffmpeg.deleteFile("output.mp4"); } catch {}
      setConvState("done"); setConvMessage("MP4変換完了！LINEで送信できます");
      setTimeout(() => { setConvState("idle"); setConvMessage(""); setConvProgress(0); }, 4000);
    } catch (err) {
      console.error("FFmpeg error:", err);
      setConvState("error"); setConvMessage("変換に失敗しました。もう一度お試しください。");
      setTimeout(() => { setConvState("idle"); setConvMessage(""); }, 4000);
    }
  };

  const downloadWebm = () => {
    if (!recBlob) return;
    const url = URL.createObjectURL(recBlob);
    const a = document.createElement("a");
    a.href = url; a.download = `wise-coaching-${Date.now()}.webm`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const discardRecording = () => { setRecBlob(null); setRecState("idle"); setRecTime(0); setConvState("idle"); setConvMessage(""); };

  // 動画URLを分析画面に読み込む（ドリルのお手本を開く際にも使用）
  const loadVideoUrl = (url) => {
    setVideoSrc(url);
    setAnnotations([]); setUndoStack([[]]); setUndoIndex(0);
    setAnglePoints([]); setCurrentShape(null); setTextPos(null);
    setIsPlaying(false); setProgress(0); setCurrentTime(0); setDuration(0);
    setRecState("idle"); setRecBlob(null); setConvState("idle");
    setMode("single");
  };

  const handleFile = (e) => {
    const file = e.target.files[0]; if (!file) return;
    loadVideoUrl(URL.createObjectURL(file));
    e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith("video/")) {
      loadVideoUrl(URL.createObjectURL(file));
    }
  };

  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  const fmtRec = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const toolDefs = [
    { id: TOOLS.POINTER,  icon: "↖", label: "選択" },
    { id: TOOLS.ARROW,    icon: "↗", label: "矢印" },
    { id: TOOLS.LINE,     icon: "╱", label: "直線" },
    { id: TOOLS.CIRCLE,   icon: "○", label: "楕円" },
    { id: TOOLS.RECT,     icon: "□", label: "四角" },
    { id: TOOLS.ANGLE,    icon: "∠", label: "角度" },
    { id: TOOLS.FREEHAND, icon: "✏", label: "フリー" },
    { id: TOOLS.TEXT,     icon: "T",  label: "テキスト" },
  ];

  const isConverting = convState === "loading" || convState === "converting";
  const cursor = tool === TOOLS.POINTER ? "default" : tool === TOOLS.TEXT ? "text" : "crosshair";

  return (
    <div style={S.root}>
      {/* Header */}
      <div style={S.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={S.logo}>⚾</div>
          <div>
            <div style={S.logoTitle}>WISE BASEBALL ACADEMY</div>
            <div style={S.logoSub}>COACHING ANALYZER</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, marginLeft: 14 }}>
          {[{ id: "single", label: "🎬 分析" }, { id: "compare", label: "🆚 比較" }].map(m => (
            <button key={m.id} onClick={() => setMode(m.id)}
              style={{ ...S.btn, padding: "5px 12px", borderColor: mode === m.id ? "#00e676" : "#30363d", color: mode === m.id ? "#00e676" : "#8b949e", background: mode === m.id ? "rgba(0,230,118,0.1)" : "transparent" }}>
              {m.label}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={() => setPanelOpen(o => !o)}
          style={{ ...S.btn, borderColor: panelOpen ? "#40c4ff" : "#30363d", color: panelOpen ? "#40c4ff" : "#8b949e", background: panelOpen ? "rgba(64,196,255,0.08)" : "transparent", marginRight: 8 }}>
          ✍ 返信・ドリル
        </button>
        {mode === "single" && videoSrc && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginRight: 8 }}>
            <button onClick={() => setMirror(m => !m)} title="左右反転（左打者/右打者の比較に）"
              style={{ ...S.btn, borderColor: mirror ? "#00e676" : "#30363d", color: mirror ? "#00e676" : "#8b949e" }}>
              ⇋ 反転
            </button>
            <div style={S.divider} />
          </div>
        )}
        {mode === "single" && videoSrc && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {recState === "idle" && (
              <button onClick={startRecording} style={{ ...S.btn, borderColor: "#ff4444", color: "#ff4444", background: "rgba(255,68,68,0.1)" }}>
                🎙 解説録画
              </button>
            )}
            {recState === "recording" && (
              <>
                <span style={{ fontSize: 11, color: "#ff4444", fontWeight: 700 }}>● REC {fmtRec(recTime)}</span>
                <button onClick={stopRecording} style={{ ...S.btn, borderColor: "#ff4444", color: "#ff4444" }}>⏹ 停止</button>
              </>
            )}
            {recState === "preview" && (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {/* MP4 convert button */}
                {!isConverting && convState !== "done" && (
                  <button onClick={convertToMp4} style={{ ...S.btnPrimary, background: "linear-gradient(135deg,#40c4ff,#0091ea)" }}>
                    📱 MP4変換 (iPhone対応)
                  </button>
                )}
                {isConverting && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 100, height: 6, background: "#21262d", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${convProgress}%`, height: "100%", background: "linear-gradient(90deg,#40c4ff,#0091ea)", transition: "width 0.3s", borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 11, color: "#40c4ff" }}>{convMessage}</span>
                  </div>
                )}
                {convState === "done" && <span style={{ fontSize: 11, color: "#00e676", fontWeight: 700 }}>✅ {convMessage}</span>}
                {convState === "error" && <span style={{ fontSize: 11, color: "#ff4444" }}>❌ {convMessage}</span>}
                <button onClick={downloadWebm} style={{ ...S.btn, fontSize: 11 }}>⬇ WebMで保存</button>
                <button onClick={() => setMode("compare")} title="元動画と解説録画を並べて確認"
                  style={{ ...S.btn, fontSize: 11, borderColor: "#ffea00", color: "#ffea00" }}>🆚 元動画と比較</button>
                <button onClick={discardRecording} style={{ ...S.btn, color: "#6e7681" }}>✕ 破棄</button>
              </div>
            )}
            <div style={S.divider} />
            <button onClick={exportFrame} style={S.btnPrimary}>📸 フレーム保存</button>
            <button onClick={captureToReport} title="この画面（注釈込み）をレポートに添付"
              style={{ ...S.btn, borderColor: "#40c4ff", color: "#40c4ff" }}>
              📎 レポートへ{reportImages.length > 0 ? `（${reportImages.length}）` : ""}
            </button>
            <button onClick={() => setStripOpen(o => !o)} title="現在位置から連続コマ写真を生成してレポートに添付"
              style={{ ...S.btn, borderColor: stripOpen ? "#ffea00" : "#30363d", color: stripOpen ? "#ffea00" : "#8b949e" }}>
              🎞 連続コマ
            </button>
            <button onClick={() => fileInputRef.current?.click()} style={S.btn}>📂 別動画</button>
          </div>
        )}
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Toolbar */}
        {mode === "single" && videoSrc && (
          <div style={S.toolbar}>
            {toolDefs.map(t => (
              <button key={t.id} title={t.label}
                onClick={() => { setTool(t.id); setAnglePoints([]); setCurrentShape(null); setTextPos(null); }}
                style={{ ...S.toolBtn, ...(tool === t.id ? S.toolBtnActive : {}) }}>
                <span style={{ fontSize: t.id === TOOLS.TEXT ? 16 : 18, fontWeight: 700 }}>{t.icon}</span>
              </button>
            ))}
            <div style={S.sep} />
            {PRESET_COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)}
                style={{ ...S.colorBtn, background: c, outline: color === c ? "3px solid #fff" : "none", outlineOffset: 2 }} />
            ))}
            <div style={S.sep} />
            {[2, 4, 7].map(w => (
              <button key={w} onClick={() => setStrokeWidth(w)}
                style={{ ...S.widthBtn, borderColor: strokeWidth === w ? "#00e676" : "#21262d" }}>
                <div style={{ width: 20, height: w, borderRadius: w, background: strokeWidth === w ? "#00e676" : "#6e7681" }} />
              </button>
            ))}
            <div style={S.sep} />
            <button title="元に戻す" onClick={undo} disabled={undoIndex === 0}
              style={{ ...S.toolBtn, color: undoIndex === 0 ? "#3d444d" : "#8b949e" }}>↩</button>
            <button title="やり直す" onClick={redo} disabled={undoIndex === undoStack.length - 1}
              style={{ ...S.toolBtn, color: undoIndex === undoStack.length - 1 ? "#3d444d" : "#8b949e" }}>↪</button>
            <button title="全削除" onClick={clearAll} style={{ ...S.toolBtn, color: "#ff4444" }}>🗑</button>
          </div>
        )}

        {/* Main */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {mode === "compare" ? (
            <CompareView drills={drills} mainSrc={videoSrc} recBlob={recBlob}
              onAddReportImage={(img) => setReportImages(prev => [...prev, img])} reportCount={reportImages.length} />
          ) : !videoSrc ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}
              onDrop={handleDrop} onDragOver={e => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)}>
              <div onClick={() => fileInputRef.current?.click()}
                style={{ ...S.dropzone, borderColor: isDragging ? "#00e676" : "#30363d", background: isDragging ? "rgba(0,230,118,0.05)" : "transparent" }}>
                <div style={{ fontSize: 52, marginBottom: 14 }}>🎬</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: isDragging ? "#00e676" : "#c9d1d9", marginBottom: 8 }}>動画をドロップ</div>
                <div style={{ fontSize: 12, color: "#6e7681", marginBottom: 14 }}>またはクリックしてファイル選択</div>
                <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 20 }}>
                  {["MP4", "MOV", "AVI", "M4V"].map(f => <span key={f} style={S.badge}>{f}</span>)}
                </div>
                <div style={{ padding: "12px 18px", background: "rgba(64,196,255,0.07)", borderRadius: 8, borderLeft: "3px solid #40c4ff", textAlign: "left", maxWidth: 300 }}>
                  <div style={{ fontSize: 11, color: "#40c4ff", fontWeight: 700, marginBottom: 5 }}>📱 iPhone対応MP4出力</div>
                  <div style={{ fontSize: 11, color: "#8b949e", lineHeight: 1.7 }}>
                    解説録画後にブラウザ内でMP4変換。<br />
                    iPhoneのLINEで再生できる形式で保存。
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", background: "#000", overflow: "hidden" }}>
                <div style={{ position: "relative", display: "inline-block", maxWidth: "100%", maxHeight: "calc(100vh - 170px)" }}>
                  <video
                    ref={videoRef} src={videoSrc}
                    style={{ display: "block", maxWidth: "100%", maxHeight: "calc(100vh - 170px)", objectFit: "contain", transform: mirror ? "scaleX(-1)" : "none" }}
                    onLoadedMetadata={handleVideoLoad} onTimeUpdate={handleTimeUpdate}
                    onEnded={() => setIsPlaying(false)} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)}
                    playsInline preload="auto"
                  />
                  <canvas ref={canvasRef}
                    style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", cursor }}
                    onMouseDown={handleDown} onMouseMove={handleMove} onMouseUp={handleUp} onMouseLeave={handleUp}
                    onTouchStart={handleDown} onTouchMove={handleMove} onTouchEnd={handleUp}
                  />
                  {textPos && (
                    <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
                      <div style={{ position: "absolute", top: `${textPos.y / videoSize.h * 100}%`, left: `${textPos.x / videoSize.w * 100}%`, pointerEvents: "all" }}>
                        <input ref={textInputRef} value={textInput}
                          onChange={e => setTextInput(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); commitText(); } if (e.key === "Escape") { setTextPos(null); setTextInput(""); } }}
                          placeholder="テキスト → Enter"
                          style={{ background: "rgba(0,0,0,0.8)", border: `1px solid ${color}`, borderRadius: 4, color, padding: "4px 8px", fontSize: 14, fontFamily: "monospace", fontWeight: 700, outline: "none", minWidth: 160 }}
                        />
                      </div>
                    </div>
                  )}
                  {tool === TOOLS.ANGLE && anglePoints.length > 0 && (
                    <div style={S.hint}>{anglePoints.length === 1 ? "▶ 頂点をクリック" : "▶ 2本目の辺をクリック"}</div>
                  )}
                  {recState === "recording" && (
                    <div style={{ position: "absolute", top: 10, right: 10, background: "rgba(200,0,0,0.85)", borderRadius: 6, padding: "4px 10px", fontSize: 12, color: "#fff", fontWeight: 700 }}>
                      ● REC {fmtRec(recTime)}
                    </div>
                  )}
                  {micError && recState === "recording" && (
                    <div style={{ position: "absolute", top: 40, right: 10, background: "rgba(255,165,0,0.9)", borderRadius: 6, padding: "3px 8px", fontSize: 11, color: "#000" }}>
                      ⚠ マイク未接続 (映像のみ録画)
                    </div>
                  )}
                </div>
              </div>

              {/* Controls */}
              <div style={S.controls}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={S.timeLabel}>{fmtTime(currentTime)}</span>
                  <div onClick={seek} style={S.seekBar}>
                    <div style={{ width: `${progress}%`, height: "100%", background: "linear-gradient(90deg,#00e676,#00b248)", borderRadius: 3 }} />
                  </div>
                  <span style={S.timeLabel}>{fmtTime(duration)}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <button onClick={() => stepFrame(false)} style={S.ctrlBtn}>⏮ -1f</button>
                  <button onClick={togglePlay}
                    style={{ ...S.ctrlBtn, minWidth: 80, fontWeight: 700, borderColor: isPlaying ? "#ff4444" : "#00e676", color: isPlaying ? "#ff4444" : "#00e676", background: isPlaying ? "rgba(255,68,68,0.1)" : "rgba(0,230,118,0.1)" }}>
                    {isPlaying ? "⏸ 停止" : "▶ 再生"}
                  </button>
                  <button onClick={() => stepFrame(true)} style={S.ctrlBtn}>+1f ⏭</button>
                  <div style={S.divider} />
                  <span style={{ fontSize: 11, color: "#6e7681" }}>速度</span>
                  {SPEEDS.map(s => (
                    <button key={s.value} onClick={() => setSpeed(s.value)}
                      style={{ ...S.ctrlBtn, minWidth: 44, borderColor: speed === s.value ? "#00e676" : "#30363d", color: speed === s.value ? "#00e676" : "#8b949e", background: speed === s.value ? "rgba(0,230,118,0.1)" : "transparent" }}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {panelOpen && (
          <SidePanel
            videoRef={videoRef} hasVideo={!!videoSrc && mode === "single"}
            drills={drills} setDrills={setDrills}
            selectedDrillIds={selectedDrillIds} setSelectedDrillIds={setSelectedDrillIds}
            history={history} setHistory={setHistory}
            snippets={snippets} setSnippets={setSnippets}
            onClose={() => setPanelOpen(false)}
            onLoadToAnalyzer={loadVideoUrl}
            reportImages={reportImages} setReportImages={setReportImages}
          />
        )}
      </div>

      {stripOpen && mode === "single" && videoSrc && (
        <div style={{ position: "fixed", top: 64, right: 16, zIndex: 50, background: "#161b22", border: "1px solid #ffea00", borderRadius: 10, padding: 14, width: 260, boxShadow: "0 8px 30px rgba(0,0,0,0.5)" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#ffea00", marginBottom: 8 }}>🎞 連続コマ写真（現在位置から）</div>
          <div style={{ fontSize: 11, color: "#8b949e", marginBottom: 4 }}>コマ数</div>
          <div style={{ display: "flex", gap: 5, marginBottom: 8 }}>
            {[4, 6, 8].map(n => (
              <button key={n} onClick={() => setStripCount(n)}
                style={{ flex: 1, background: stripCount === n ? "rgba(255,234,0,0.15)" : "transparent", border: `1px solid ${stripCount === n ? "#ffea00" : "#30363d"}`, borderRadius: 6, color: stripCount === n ? "#ffea00" : "#8b949e", padding: "5px 0", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>{n}</button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: "#8b949e", marginBottom: 4 }}>間隔（秒）</div>
          <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>
            {[0.1, 0.15, 0.2, 0.3].map(s => (
              <button key={s} onClick={() => setStripInterval(s)}
                style={{ flex: 1, background: stripInterval === s ? "rgba(255,234,0,0.15)" : "transparent", border: `1px solid ${stripInterval === s ? "#ffea00" : "#30363d"}`, borderRadius: 6, color: stripInterval === s ? "#ffea00" : "#8b949e", padding: "5px 0", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>{s}</button>
            ))}
          </div>
          <button onClick={generateStrip} disabled={stripBusy}
            style={{ width: "100%", background: "linear-gradient(135deg,#ffea00,#ffc107)", border: "none", borderRadius: 6, padding: "8px 0", color: "#000", fontWeight: 700, cursor: "pointer", fontSize: 12, opacity: stripBusy ? 0.6 : 1 }}>
            {stripBusy ? "生成中..." : "生成してレポートに追加"}
          </button>
          <div style={{ fontSize: 10, color: "#6e7681", marginTop: 6, lineHeight: 1.6 }}>💡 スイング開始の直前にシークしてから生成すると連続写真がきれいに揃います</div>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="video/*" style={{ display: "none" }} onChange={handleFile} />

      {mode === "single" && videoSrc && (
        <div style={S.statusBar}>
          <span>{videoSize.w}x{videoSize.h}</span>
          <span>速度: {speed}x</span>
          <span>ツール: {toolDefs.find(t => t.id === tool)?.label}</span>
          <span>描画: {annotations.length}</span>
          {mirror && <span style={{ color: "#00e676" }}>⇋ 反転中</span>}
          {stripMsg && <span style={{ color: "#ffea00" }}>{stripMsg}</span>}
          {isConverting && <span style={{ color: "#40c4ff" }}>{convMessage}</span>}
        </div>
      )}
    </div>
  );
}

const S = {
  root: { minHeight: "100vh", maxHeight: "100vh", background: "#0a0c10", color: "#e8eaf0", fontFamily: "'Courier New','Consolas',monospace", display: "flex", flexDirection: "column", userSelect: "none", overflow: "hidden" },
  header: { background: "linear-gradient(135deg,#0d1117 0%,#161b22 100%)", borderBottom: "1px solid #21262d", padding: "10px 16px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 },
  logo: { width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#00e676,#00b248)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 },
  logoTitle: { fontSize: 13, fontWeight: 700, letterSpacing: 2, color: "#00e676" },
  logoSub: { fontSize: 10, color: "#6e7681", letterSpacing: 1 },
  toolbar: { width: 56, background: "#0d1117", borderRight: "1px solid #21262d", display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 0", gap: 3, flexShrink: 0, overflowY: "auto" },
  toolBtn: { width: 40, height: 40, borderRadius: 8, border: "1px solid #21262d", background: "transparent", color: "#8b949e", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.12s" },
  toolBtnActive: { border: "2px solid #00e676", background: "rgba(0,230,118,0.12)", color: "#00e676" },
  colorBtn: { width: 24, height: 24, borderRadius: "50%", border: "none", cursor: "pointer" },
  widthBtn: { width: 36, height: 26, borderRadius: 5, border: "1px solid", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  sep: { width: 30, height: 1, background: "#21262d", margin: "4px 0" },
  dropzone: { border: "2px dashed", borderRadius: 16, padding: "48px 56px", textAlign: "center", cursor: "pointer", transition: "all 0.2s" },
  badge: { display: "inline-block", background: "#21262d", borderRadius: 4, padding: "2px 8px", fontSize: 11, color: "#8b949e", fontWeight: 600 },
  hint: { position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.75)", borderRadius: 6, padding: "5px 12px", fontSize: 12, color: "#00e676", border: "1px solid rgba(0,230,118,0.3)", whiteSpace: "nowrap" },
  controls: { background: "#0d1117", borderTop: "1px solid #21262d", padding: "10px 14px", flexShrink: 0 },
  seekBar: { flex: 1, height: 6, background: "#21262d", borderRadius: 3, cursor: "pointer", overflow: "hidden" },
  timeLabel: { fontSize: 11, color: "#8b949e", minWidth: 36, textAlign: "center" },
  ctrlBtn: { background: "transparent", border: "1px solid #30363d", borderRadius: 6, padding: "5px 10px", color: "#8b949e", cursor: "pointer", fontSize: 12, fontFamily: "inherit", fontWeight: 600, whiteSpace: "nowrap" },
  btn: { background: "transparent", border: "1px solid #30363d", borderRadius: 6, padding: "6px 12px", color: "#8b949e", cursor: "pointer", fontSize: 12, fontFamily: "inherit", fontWeight: 600 },
  btnPrimary: { background: "linear-gradient(135deg,#00e676,#00b248)", border: "none", borderRadius: 6, padding: "6px 14px", color: "#000", fontWeight: 700, cursor: "pointer", fontSize: 12, fontFamily: "inherit" },
  divider: { width: 1, height: 24, background: "#21262d", margin: "0 2px" },
  statusBar: { background: "#0d1117", borderTop: "1px solid #21262d", padding: "4px 14px", display: "flex", gap: 20, fontSize: 11, color: "#6e7681", flexShrink: 0 },
};
