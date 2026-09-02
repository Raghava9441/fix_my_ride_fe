import path from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

/**
 * Vite configuration.
 *
 * This project runs **Vite 8, which bundles with Rolldown** (Rust) rather than
 * Rollup. Two consequences worth knowing before editing:
 *
 *   - Bundler options live under `build.rolldownOptions`. `rollupOptions` is
 *     still accepted as a compatibility alias, but the chunking API underneath
 *     is Rolldown's.
 *   - Manual chunking would be `output.codeSplitting.groups`, **not** Rollup's
 *     `manualChunks` callback (gone) and not `advancedChunks` (Rolldown's
 *     earlier name, which this version warns on). Copying a `manualChunks`
 *     snippet from an older guide silently does nothing here.
 *
 * Everything below is deliberate. Options left at their default are noted
 * where the default is worth understanding rather than silently inherited.
 */
export default defineConfig(({ mode }) => {
  // `loadEnv` reads .env files the same way the client does, so config can
  // branch on them. The third argument is the prefix filter — '' loads
  // everything, including vars that are NOT exposed to client code.
  const env = loadEnv(mode, process.cwd(), '')
  const isProduction = mode === 'production'

  // Where the API lives during development, used only by the dev proxy below.
  const apiOrigin = env.DEV_API_ORIGIN || 'http://localhost:5000'

  return {
    plugins: [
      // Fast Refresh, JSX transform, and the automatic runtime. Uses Oxc in
      // Vite 8 rather than Babel, which is why there's no babel config here.
      react(),
      // Tailwind v4 runs as a Vite plugin instead of a PostCSS plugin, so
      // there is deliberately no postcss.config.js in this project.
      tailwindcss(),
    ],

    /**
     * Public base path. `/` assumes the app is served from a domain root.
     * Change to `/app/` if it's ever mounted on a sub-path — every asset URL
     * and the router's basename derive from this.
     */
    base: '/',

    /**
     * Only variables prefixed `VITE_` reach client code. This is a security
     * boundary, not a naming convention: anything exposed here is readable by
     * anyone who opens devtools, so secrets must never carry the prefix.
     */
    envPrefix: 'VITE_',

    resolve: {
      alias: {
        // Mirrors `paths` in tsconfig.app.json. Both have to agree — TS
        // resolves types with one, Vite resolves modules with the other.
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },

    /**
     * Compile-time constants, inlined as literals and then dead-code
     * eliminated. Used here for build provenance: the app can show which
     * build it's running, which is what turns "it's broken" into a specific
     * commit. Values must be JSON-serialised — a bare string would be
     * injected as an identifier.
     */
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0'),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __COMMIT_SHA__: JSON.stringify(env.COMMIT_SHA ?? env.VERCEL_GIT_COMMIT_SHA ?? 'local'),
    },

    /* ---------------------------------------------------------------- */
    /* Development server                                               */
    /* ---------------------------------------------------------------- */

    server: {
      port: 5173,

      /**
       * Fail instead of silently moving to 5174.
       *
       * A dev server that quietly relocates is how you end up debugging a
       * stale tab on the old port, and it breaks any OAuth callback or CORS
       * allow-list pinned to a fixed origin.
       */
      strictPort: true,

      // `true` binds all interfaces so a phone on the same wifi can reach it,
      // which is the only honest way to test the mobile layouts.
      host: true,

      open: false,

      /**
       * Proxy for same-origin API calls in development.
       *
       * Not currently used: `.env.development` points VITE_API_URL at the API
       * origin directly, so the browser talks to it cross-origin and relies on
       * the server's CORS config. Switching VITE_API_URL to a relative
       * `/api/v1` routes through this instead, which removes CORS from the dev
       * loop entirely and makes dev match production (where both are usually
       * behind one origin).
       */
      proxy: {
        '/api': {
          target: apiOrigin,
          changeOrigin: true,
          // The API is HTTP in dev; this would matter against a self-signed
          // HTTPS backend.
          secure: false,
        },
      },

      /**
       * Pre-transform these on server start rather than on first request.
       *
       * Vite compiles per module on demand, so the first navigation to a big
       * screen pays for its whole import graph. Warming the entry path and the
       * heaviest shared modules moves that cost to startup, where nobody is
       * waiting on it.
       */
      warmup: {
        clientFiles: [
          './src/main.tsx',
          './src/App.tsx',
          './src/lib/routing/registry.tsx',
          './src/components/ui/index.ts',
          './src/lib/api/client.ts',
        ],
      },

      hmr: {
        // Full-screen error overlay on a failed HMR update. Left on: silent
        // failures are far worse, because the page keeps showing stale output.
        overlay: true,
      },

      watch: {
        // Never watch build output or coverage — on Windows especially, these
        // generate a lot of change events for files nothing imports.
        ignored: ['**/dist/**', '**/coverage/**', '**/.git/**'],
      },
    },

    /**
     * `vite preview` — serves the built output. This is the only local way to
     * observe real chunking and caching behaviour; `npm run dev` serves
     * unbundled modules and will mislead you about both.
     */
    preview: {
      port: 4173,
      strictPort: true,
      host: true,
    },

    /* ---------------------------------------------------------------- */
    /* Production build                                                 */
    /* ---------------------------------------------------------------- */

    build: {
      /**
       * Left at the default, which in Vite 8 is "Baseline Widely Available"
       * (Chrome/Edge ≥111, Firefox ≥114, Safari ≥16.4).
       *
       * Worth knowing rather than changing: the app relies on features in that
       * baseline — native `<dialog>` with `showModal()` for Modal, and
       * `AbortSignal` composition in the API transport. Lowering the target
       * would compile the syntax down but not polyfill those APIs.
       */
      // target: 'baseline-widely-available',

      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,

      /**
       * `hidden` emits .map files but omits the `//# sourceMappingURL` comment.
       *
       * The maps exist for an error tracker to symbolicate stack traces
       * (see lib/observability/telemetry.ts), but browsers won't fetch them,
       * so source isn't exposed to anyone poking at devtools. Upload them at
       * deploy time and don't serve them publicly.
       */
      sourcemap: isProduction ? 'hidden' : true,

      /**
       * Oxc is the Vite 8 default and is Rust-based — dramatically faster than
       * terser with comparable output. Terser remains available for the rare
       * case where its extra passes measurably win, but it costs build time.
       */
      minify: isProduction ? 'oxc' : false,

      /**
       * Assets under this size are inlined as base64 data URIs, trading a
       * request for bytes. 4KB is the default and a reasonable line: below it
       * a round trip usually costs more than the ~33% base64 overhead.
       */
      assetsInlineLimit: 4096,

      // One CSS file per async chunk rather than a single stylesheet, so a
      // route only loads the CSS it needs.
      cssCodeSplit: true,

      /**
       * Warn above 500KB *uncompressed* per chunk. Kept low deliberately: it's
       * a smoke alarm for an accidental static import pulling a heavy
       * dependency into the eager path, which is exactly how a lazily-loaded
       * app quietly stops being one.
       */
      chunkSizeWarningLimit: 500,

      /**
       * Prints gzipped sizes in the build output. It costs a second or two of
       * build time, and it is the number that actually correlates with load
       * time — worth paying for. Turn off in CI if build minutes are tight.
       */
      reportCompressedSize: true,

      rolldownOptions: {
        output: {
          /*
           * No manual chunk groups — measured, not assumed.
           *
           * Vite's automatic splitting already does the useful work: the
           * `import()` calls in lib/routing/registry.tsx create a chunk per
           * route, and Rolldown hoists anything two or more routes share into
           * its own chunk (that is where `ui`, `access`, `charts`, `api` and
           * `queryKeys` come from — nobody named them).
           *
           * A vendor-splitting config was tried here, grouping react/router
           * and @tanstack into pinned chunks. A/B on identical source:
           *
           *     no groups     total 191.3KB gz   eager 126.9KB gz
           *     with groups   total 188.9KB gz   eager 127.9KB gz
           *
           * 2.4KB smaller overall, 1KB larger on first paint — noise, and the
           * cache-stability argument for it did not survive inspection either
           * (the resulting "vendor" chunk was far larger than React alone,
           * so it was not cleanly separating vendor from app code).
           *
           * Config that costs complexity and buys nothing measurable does not
           * belong here. If this is revisited, re-run that A/B rather than
           * trusting a blog post: chunking outcomes depend on this app's own
           * import graph, and Rolldown's defaults are already good.
           */

          // Predictable, cache-friendly output paths. The hash is what makes
          // long-lived immutable caching safe.
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
      },
    },

    /**
     * Dependency pre-bundling. Vite normally discovers these by crawling the
     * entry, which means a dependency only reached through a lazy route is
     * found *mid-session* and triggers a page reload to re-optimise.
     *
     * Listing the ones that only appear behind lazy routes avoids that
     * mid-work reload.
     */
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query', 'zustand', 'clsx'],
    },

    css: {
      // Maps generated CSS back to source in devtools. Dev only — it inflates
      // the payload and is off in production by default.
      devSourcemap: true,
    },

    /**
     * 'spa' (the default) makes the dev server fall back to index.html for
     * unmatched paths, which is what lets a client-side route survive a hard
     * refresh. Stated explicitly because changing it silently breaks deep
     * links in development only.
     */
    appType: 'spa',
  }
})
