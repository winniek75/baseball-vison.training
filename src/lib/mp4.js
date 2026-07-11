// WebM → MP4 変換の共通モジュール（iPhoneのLINEで再生できる形式に）
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

let ffmpegPromise = null;
let progressCb = null;

async function getFFmpeg() {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      const ffmpeg = new FFmpeg();
      ffmpeg.on("progress", ({ progress }) => progressCb?.(Math.round(progress * 100)));
      ffmpeg.on("log", ({ message }) => console.log("[ffmpeg]", message));
      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      });
      return ffmpeg;
    })().catch(e => { ffmpegPromise = null; throw e; });
  }
  return ffmpegPromise;
}

export async function convertWebmToMp4(webmBlob, { onProgress, onMessage } = {}) {
  onMessage?.("FFmpegを読み込み中...");
  const ffmpeg = await getFFmpeg();
  progressCb = (pct) => { onProgress?.(pct); onMessage?.(`変換中... ${pct}%`); };
  const inName = `in_${Date.now()}.webm`, outName = `out_${Date.now()}.mp4`;
  await ffmpeg.writeFile(inName, await fetchFile(webmBlob));
  await ffmpeg.exec([
    "-i", inName,
    "-c:v", "libx264",
    "-preset", "fast",
    "-crf", "23",
    "-c:a", "aac",
    "-b:a", "128k",
    "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2",
    "-movflags", "+faststart",
    outName,
  ]);
  const data = await ffmpeg.readFile(outName);
  try { await ffmpeg.deleteFile(inName); await ffmpeg.deleteFile(outName); } catch { /* noop */ }
  progressCb = null;
  return new Blob([data.buffer], { type: "video/mp4" });
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
