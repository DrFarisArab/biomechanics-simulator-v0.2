import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

// Shared singleton — Draco's decoder is a ~700KB WASM module, no reason to
// instantiate/download it more than once across BodyModel + SkinOverlay.
// Decoder files are self-hosted (copied from three's own node_modules into
// public/draco/) rather than pointed at Google's CDN, matching this app's
// otherwise fully self-contained asset setup.
let dracoLoader: DRACOLoader | null = null;

export function getDracoLoader(): DRACOLoader {
  if (!dracoLoader) {
    dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("/draco/");
  }
  return dracoLoader;
}
