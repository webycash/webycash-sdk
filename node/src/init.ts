import type { Backend } from "./backend.js";
import type { BackendType } from "./types.js";

let cachedBackend: Backend | null = null;

/** Resolve the best available backend. */
export async function resolveBackend(preference?: BackendType): Promise<Backend> {
  const pref = preference ?? "auto";

  if (pref === "ffi") return createFfi();
  if (pref === "wasm") return createWasm();

  // "auto": Node.js → try FFI first (native perf), fall back to WASM
  if (typeof process !== "undefined" && process.versions?.node) {
    try {
      return await createFfi();
    } catch {
      /* FFI not available — fall through to WASM */
    }
  }
  return createWasm();
}

async function createFfi(): Promise<Backend> {
  const { FfiBackend } = await import("./backend-ffi.js");
  return FfiBackend.create();
}

async function createWasm(): Promise<Backend> {
  const { WasmBackend } = await import("./backend-wasm.js");
  return WasmBackend.create();
}

/** Get or create a shared backend instance. */
export async function getBackend(preference?: BackendType): Promise<Backend> {
  if (cachedBackend && (!preference || preference === "auto" || preference === cachedBackend.name)) {
    return cachedBackend;
  }
  cachedBackend = await resolveBackend(preference);
  return cachedBackend;
}
