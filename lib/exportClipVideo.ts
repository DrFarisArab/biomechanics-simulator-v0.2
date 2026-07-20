import { clipDuration, type Clip } from "./clip";
import { useRecordReplayStore } from "./recordReplayStore";

const EXPORT_FPS = 30;
const VIDEO_BITS_PER_SECOND = 8_000_000;

const MP4_MIME_TYPES = [
  "video/mp4;codecs=avc1.42E01E",
  "video/mp4;codecs=avc1",
  "video/mp4",
];

function nextPaint(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function getMp4MimeType(): string {
  if (typeof MediaRecorder === "undefined") {
    throw new Error("MP4 export is not supported by this browser.");
  }
  const mimeType = MP4_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
  if (!mimeType) {
    throw new Error("This browser cannot encode MP4 video. Please use a current version of Chrome, Edge, or Safari.");
  }
  return mimeType;
}

function safeFilename(name: string): string {
  const cleaned = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${cleaned || "biomechanics-recording"}.mp4`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

function waitForForwardPlayback(
  duration: number,
  onProgress: (progress: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    let playbackStarted = false;
    const timeoutId = window.setTimeout(
      () => {
        unsubscribe();
        reject(new Error("Video export timed out before playback completed."));
      },
      Math.max(15_000, duration * 3_000)
    );

    const finish = () => {
      window.clearTimeout(timeoutId);
      unsubscribe();
      onProgress(1);
      resolve();
    };

    const unsubscribe = useRecordReplayStore.subscribe((state) => {
      if (state.isPlaying) playbackStarted = true;
      onProgress(Math.min(1, state.currentTime / duration));
      if (playbackStarted && !state.isPlaying && state.currentTime >= duration - 0.01) {
        finish();
      }
    });

    useRecordReplayStore.getState().play();
  });
}

export async function exportClipToMp4(
  clip: Clip,
  onProgress: (progress: number) => void
): Promise<void> {
  const duration = clipDuration(clip);
  if (clip.keyframes.length < 2 || duration <= 0) {
    throw new Error("Add at least two keyframes at different times before exporting.");
  }

  const source = document.querySelector<HTMLCanvasElement>("main canvas");
  if (!source || source.width === 0 || source.height === 0) {
    throw new Error("The model viewport is not ready to export.");
  }

  const mimeType = getMp4MimeType();
  // Capture the WebGL canvas itself. Copying it through a second 2D canvas
  // reads an already-cleared buffer in some browsers, producing black video.
  const stream = source.captureStream(EXPORT_FPS);
  const chunks: Blob[] = [];
  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: VIDEO_BITS_PER_SECOND,
    });
  } catch {
    stream.getTracks().forEach((track) => track.stop());
    throw new Error("The browser could not start MP4 encoding.");
  }
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };

  let recordingError: Error | null = null;
  const finishedRecording = new Promise<Blob>((resolve, reject) => {
    recorder.onerror = () => {
      recordingError = new Error("The browser could not encode the MP4 video.");
    };
    recorder.onstop = () => {
      if (recordingError) {
        reject(recordingError);
        return;
      }
      const blob = new Blob(chunks, { type: mimeType });
      if (blob.size === 0) {
        reject(new Error("The exported MP4 was empty."));
      } else {
        resolve(blob);
      }
    };
  });

  const replay = useRecordReplayStore.getState();
  const previous = {
    currentTime: replay.currentTime,
    isPlaying: replay.isPlaying,
    loop: replay.loop,
    speed: replay.speed,
  };

  try {
    replay.pause();
    replay.setLoop(false);
    replay.setSpeed(1);
    replay.seek(0);
    onProgress(0);
    await nextPaint();
    await nextPaint();

    recorder.start(250);
    await waitForForwardPlayback(duration, onProgress);
    await nextPaint();
    await new Promise((resolve) => window.setTimeout(resolve, 120));
    recorder.stop();

    const video = await finishedRecording;
    downloadBlob(video, safeFilename(clip.name));
  } finally {
    if (recorder.state !== "inactive") recorder.stop();
    stream.getTracks().forEach((track) => track.stop());

    const current = useRecordReplayStore.getState();
    current.pause();
    current.setLoop(previous.loop);
    current.setSpeed(previous.speed);
    current.seek(previous.currentTime);
    if (previous.isPlaying) current.play();
  }
}
