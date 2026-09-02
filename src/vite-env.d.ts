/// <reference types="vite/client" />

/**
 * Build-time constants injected by `define` in vite.config.ts.
 *
 * Declared here because `define` performs a textual replacement at build time
 * — TypeScript has no way to know these identifiers exist, and without the
 * declaration every use is a compile error.
 */
declare const __APP_VERSION__: string
declare const __BUILD_TIME__: string
declare const __COMMIT_SHA__: string

/**
 * Typed environment variables.
 *
 * Only `VITE_`-prefixed variables reach client code. Typing them means a
 * missing or renamed variable is a compile error rather than an `undefined`
 * that surfaces as a broken request at runtime.
 */
interface ImportMetaEnv {
  readonly VITE_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
