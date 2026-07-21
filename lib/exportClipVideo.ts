import { clipDuration, type Clip } from "./clip";
import { useRecordReplayStore } from "./recordReplayStore";
import { saveBlobAsFile } from "./saveBlobAsFile";

const EXPORT_FPS = 30;
const VIDEO_BITS_PER_SECOND = 8_000_000;

const MP4_MIME_TYPES = [
  "video/mp4;codecs=avc1.42E01E",
  "video/mp4;codecs=avc1",
  "video/mp4",
];
const WEBM_MIME_TYPES = [
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
];

function nextPaint(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function getVideoFormat(): { mimeType: string; extension: "mp4" | "webm" } {
  if (typeof MediaRecorder === "undefined") {
    throw new Error("Video export is not supported by this browser.");
  }
  const mimeType = [...MP4_MIME_TYPES, ...WEBM_MIME_TYPES].find((type) => MediaRecorder.isTypeSupported(type));
  if (!mimeType) {
    throw new Error("This browser cannot encode video. Please use a current version of Chrome, Edge, or Safari.");
  }
  return { mimeType, extension: mimeType.includes("webm") ? "webm" : "mp4" };
}

function safeFilename(name: string, extension: "mp4" | "webm"): string {
  const cleaned = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${cleaned || "biomechanics-recording"}.${extension}`;
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

  const { mimeType, extension } = getVideoFormat();
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
    throw new Error("The browser could not start video encoding.");
  }
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };

  let recordingError: Error | null = null;
  const finishedRecording = new Promise<Blob>((resolve, reject) => {
    recorder.onerror = () => {
      recordingError = new Error("The browser could not encode the video.");
    };
    recorder.onstop = () => {
      if (recordingError) {
        reject(recordingError);
        return;
      }
      const blob = new Blob(chunks, { type: mimeType });
      if (blob.size === 0) {
        reject(new Error("The exported video was empty."));
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
    await saveBlobAsFile(video, safeFilename(clip.name, extension));
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
