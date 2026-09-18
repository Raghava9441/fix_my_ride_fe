# The API layer

Everything in `src/lib/api/`. This is the single door between the React app
and the backend: **no component, hook, or store calls `fetch` directly.**

This document is written to be read start to finish by someone who has never
touched this codebase. Sections 1–4 are the mental model. Section 5 is the
cookbook you'll actually use day to day. Sections 6–9 are for when something
breaks or you need to change the layer itself.

---

## 1. What problem this solves

A frontend that talks to an HTTP API has to answer the same dozen questions on
*every single call*:

| Question | If you answer it per call site… |
|---|---|
| What's the base URL? | 200 copies of `import.meta.env.VITE_API_URL` |
| Is there an auth token? | 200 places to forget the header |
| What if the token expired? | 200 places that each fire their own refresh |
| What if the network is down? | `TypeError: Failed to fetch` reaching a component |
| What if it hangs? | A spinner that never resolves |
| Should we retry? | Someone retries a `POST` and creates two invoices |
| What if the user navigated away? | An error toast for a request they abandoned |
| Six widgets want the same data | Six identical requests |
| How do I find this in the server logs? | Guessing from timestamps |
| How slow is this endpoint really? | No idea |

Answering them once, in one place, is the whole point. A feature says *"get
vehicle 123"* and gets back either the data or one well-described error —
correctly authenticated, timed out, retried, deduplicated, measured, and
logged, without asking for any of it.

The second goal is **scale**. This app has ~20 features and several hundred
endpoints. The design constraint was: adding the 300th endpoint must not touch
this folder. It doesn't — endpoints live in per-feature service modules
(section 5.5), and `src/lib/api/` stays a small set of files one person can
hold in their head.

### Why `fetch` and not axios

Axios was removed. Every axios feature we used — interceptors, cancellation,
JSON handling — is reimplemented here anyway, because retry, dedupe,
telemetry, and envelope parsing all need control that axios's interceptor
model makes awkward. It cost **19.0 KB gzipped** in the entry bundle against
**~3.6 KB** for this layer that replaced it. `AbortSignal` composition, and
the distinction between *aborted* and *failed*, are also first-class in
`fetch` and weren't in the axios wrapper.

---

## 2. The layers

Read this diagram top to bottom; it is also the order the code executes in.

```
  ┌─────────────────────────────────────────────────────────────┐
  │  COMPONENTS / SCREENS                                       │
  │  useVehicles(), useCreateVehicle()                          │
  └───────────────────────────┬─────────────────────────────────┘
                              │
  ┌───────────────────────────▼─────────────────────────────────┐
  │  FEATURE HOOKS   src/features/*/api/queries.ts, mutations.ts│
  │  TanStack Query. Caching, invalidation, optimistic updates. │
  └───────────────────────────┬─────────────────────────────────┘
                              │
  ┌───────────────────────────▼─────────────────────────────────┐
  │  FEATURE SERVICES   src/features/*/api/service.ts           │
  │  The ONLY place URLs and payload shapes are written down.   │
  │  Knows nothing about React.                                 │
  └───────────────────────────┬─────────────────────────────────┘
                              │   ← the boundary: import '@/lib/api'
  ╔═══════════════════════════▼═════════════════════════════════╗
  ║  THIS FOLDER — src/lib/api/                                 ║
  ║                                                             ║
  ║   index.ts      the public surface (import from here only)   ║
  ║   client.ts     composes everything below                    ║
  ║   dedupe.ts     share one in-flight request between callers  ║
  ║   authRefresh.ts single-flight token refresh on 401          ║
  ║   retry.ts      should we try again, and when                ║
  ║   transport.ts  ONE fetch attempt → ApiResponse | ApiError   ║
  ║   errors.ts     every failure normalized to one ApiError     ║
  ║   types.ts      the response envelope contract               ║
  ║   config.ts     every tunable number                         ║
  ╚═════════════════════════════════════════════════════════════╝
                              │
  ┌───────────────────────────▼─────────────────────────────────┐
  │  src/lib/auth/tokenStore.ts   ·   src/lib/observability/*    │
  └─────────────────────────────────────────────────────────────┘
```

Inside this folder, `client.ts` composes the concerns in this order:

```
dedupe ─▶ [ attempt loop:  auth ─▶ transport ─▶ classify ─▶ retry ] ─▶ observe
```

Two ordering decisions carry real weight:

- **Dedupe is outermost.** Callers who join an existing request share the
  retry and auth work too, not just the socket.
- **The attempt loop is innermost.** A retry must re-read the access token: a
  401 that triggered a refresh means the token captured before the first
  attempt is already stale.

---

## 3. Every file, and why it exists

| File | Lines | Responsibility | The "why" in one sentence |
|---|---|---|---|
| `index.ts` | 41 | Public exports | Features import from `@/lib/api` and nothing deeper, so internals stay free to change. |
| `config.ts` | 74 | Timeouts, retry knobs, headers | "Why did that request wait 30 seconds" has exactly one place to look. |
| `types.ts` | 123 | Response envelope + `RequestOptions` | Mirrors the backend's `utils/apiResponse.ts`; the contract is written down, not assumed. |
| `domain.ts` | 64 | `Id`, `IsoDate`, `Ref<T>`, `Address`, `BaseDocument` | The same four shapes recur in every model; re-declaring them per feature is how they drift apart. |
| `errors.ts` | 290 | `ApiError` + classification | Components branch on `kind`, never on a status code or a library-specific guard. |
| `requestId.ts` | 28 | Correlation id generator | A failure a user reports can be found in backend logs without guessing from timestamps. |
| `transport.ts` | 229 | One `fetch` attempt | Isolates "HTTP happened" from every policy decision about it. |
| `retry.ts` | 156 | Retry policy, backoff, budget | Answers *is repeating this safe* separately from *did it look transient*. |
| `dedupe.ts` | 174 | In-flight coalescing | Six widgets reading one lookup endpoint should make one request. |
| `authRefresh.ts` | 118 | Single-flight token refresh | Three concurrent 401s must produce exactly **one** refresh call. |
| `client.ts` | 402 | Composition + observability | The one function everything goes through. |
| `list.ts` | 38 | `fetchPage()` | Twenty service modules would otherwise repeat the same unwrap — slightly differently. |
| `queryKeys.ts` | 268 | Every TanStack Query key | Hand-written keys drift, and a mismatched invalidation fails *silently*. |
| `devtools.ts` | 137 | `window.__fmrApi` inspector | The Network tab can't tell you *which feature* fired a request, or whether it was deduped. |

Plus 4 test files (~770 lines) covering the behaviours that are easy to
regress — section 8.

---

## 4. One request, end to end

Follow a single call. This is `useVehicles()` on the vehicle list screen.

### 4.1 The call site

```ts
// src/features/vehicles/api/service.ts
list(filters = {}, signal?: AbortSignal): Promise<Page<Vehicle>> {
  return fetchPage<Vehicle>({
    url: '/vehicles',
    params: filters,
    signal,                      // from TanStack Query
    operation: 'vehicles.list',  // stable metric label
  })
}
```

`fetchPage` calls `request()`. Everything below happens inside it.

### 4.2 Labelling — `resolveOperation`

Metrics are keyed on `operation`, **never** the URL. `/vehicles/abc123` and
`/vehicles/def456` as separate time series is the high-cardinality mistake
that gets a metric dropped by the backend. Services pass an explicit label;
if one forgets, `client.ts` synthesises a fallback with ids collapsed to
`:id`, so an unlabelled call can't poison the namespace.

### 4.3 Deduplication — `dedupe.ts`

On by default for `GET`/`HEAD`. A key is built from method + URL + sorted
params + body:

```
"GET /vehicles?limit=20&page=1#"
```

Params are sorted so `?a=1&b=2` and `?b=2&a=1` collide, and empty values are
dropped so `?q=` and no `q` share one entry.

If that key is already in flight, this caller **joins** it instead of opening
a second connection. `deduped: true` is recorded for the metrics.

**The subtle part is cancellation.** Subscribers share one underlying request,
so one subscriber aborting must not cancel everybody else's data. Each
subscriber gets its own promise that rejects on *its own* signal, and the
shared request is aborted only when the refcount hits zero. Two guards in
there are load-bearing and look redundant until you know the bug:

- A `released` flag, so a subscriber that aborts decrements the refcount
  *once* — not again when the shared promise settles. Without it the count
  goes negative, and the next subscriber to abort cancels the shared request
  out from under everyone still waiting. In React StrictMode (mount →
  unmount → remount on every page load) that fired essentially always.
- **Evict from the map before aborting.** The entry's own cleanup removes it
  in a `.finally()`, a microtask later. A caller arriving inside that window
  would join an entry whose controller is already aborted and be cancelled
  instantly — which is exactly the StrictMode shape, and what made list
  screens render a cancelled-request error on load.

### 4.4 The attempt loop — `client.ts execute()`

```
attempt = 1
loop:
  ├─ read access token NOW (a refresh may have replaced it)
  ├─ performRequest()  ── transport, one attempt
  ├─ success? → return
  └─ ApiError?
       ├─ 401, credentialed, not yet refreshed? → refresh once, re-attempt
       ├─ decideRetry() says no  → throw
       └─ decideRetry() says yes → sleep(backoff, signal); attempt++
```

### 4.5 Auth — `attemptWithAuth`

`Authorization: Bearer <token>` is attached unless the call sets
`anonymous: true` (login, refresh, public endpoints). The token is read **at
attempt time, not once up front**, because a concurrent refresh may have
replaced it while this request sat queued.

On a 401 the request gets **exactly one** re-authentication, and only if it
carried credentials in the first place. Looping here — or treating 401 as a
retryable failure — is how a client turns one expired token into an
authentication storm.

### 4.6 Transport — `transport.ts performRequest()`

One attempt. No retries, no dedupe, no refresh. Its only job: turn a request
description into an `ApiResponse` **or** an `ApiError`, with nothing escaping
as a raw `TypeError` or `DOMException`.

```
buildUrl()          base + path + query (empty values dropped, not sent as ?q=)
withTimeout()       compose caller's signal with a timeout controller
fetch()             headers: Accept, X-Request-Id, Authorization, traceparent
                    Content-Type: application/json — UNLESS body is FormData
readEnvelope()      parse JSON if content-type says JSON, else null
classify            !ok → ApiError · 204/no body → data: undefined
                    2xx with success:false → still an ApiError
```

Details worth knowing:

- **Timeout vs. cancellation must not collapse.** A timeout *aborts the
  signal*, so checking `aborted` first would misreport every timeout as a
  cancellation and silently swallow it instead of retrying. The code checks
  `didTimeOut()` first, deliberately.
- **`AbortSignal.any` isn't used** — not in every browser we support, and the
  manual version also records *which* signal fired.
- **`cleanup()` runs in a `finally`.** A left-behind timer or abort listener
  keeps its closure — and the response it captured — alive. That's the shape
  most "the SPA leaks memory" bugs actually take.
- **`FormData` passes straight through.** Setting `Content-Type` ourselves
  would omit the multipart boundary the browser generates, and the server
  would fail to parse the body.
- **The server's request id wins** when one comes back, because that's the id
  in the backend logs. Ours is the fallback for requests that never reached
  the application at all (gateway 502, CORS rejection, connection reset) —
  exactly the failures that are otherwise untraceable.
- **A 2xx carrying `success: false`** throws. Rare, but the envelope permits
  it, and treating it as success hands a component a failure object typed as
  its data.

### 4.7 Retry — `retry.ts`

Two independent questions, **both** must be yes:

1. **Did the failure look transient?** → `error.retryable`
   (`network`, `timeout`, `server`, `rate_limited`)
2. **Is repeating this request safe?** → idempotency, by method

```
GET · HEAD · PUT · DELETE   idempotent by HTTP semantics → retried
POST · PATCH                NOT idempotent              → never auto-retried
```

A retried `POST /service-records` after a timeout can create a second job —
and a timeout is precisely the case where the client *cannot tell* whether the
server already processed it. A caller whose endpoint is idempotency-keyed can
opt in with `retry: true`.

Hard stops before anything else:

| Condition | Why not retried |
|---|---|
| `canceled` | Nobody is waiting for the result |
| `unauthenticated` | The credentials are the problem; repeating can trip lockout. `authRefresh` handles 401, and that's a re-authentication, not a retry |

**Backoff is exponential with full jitter** — `random(0, cap)`, not the more
common `cap/2 + random(cap/2)`. When an API recovers from an outage, every
waiting client retries at the same instant and knocks it back over. Spreading
uniformly across the whole window is what actually decorrelates them.

**The retry budget** is a token bucket shared by the whole app: 12 tokens,
refilling one per second. Without it, a broad 503 turns N concurrent queries
into N × 3 requests aimed at an API that is already failing — the client
becomes part of the outage. Normal intermittent failures still get their
retries; only a correlated storm exhausts it.

**`sleep()` is interruptible.** Otherwise cancelling a request leaves a timer
holding its closure alive for up to 4 seconds, and the retry fires after the
component is gone.

### 4.8 Token refresh — `authRefresh.ts`

```
  Request A ─┐
  Request B ─┼─▶ 401 ─▶ ONE refresh ─▶ retry all three
  Request C ─┘
```

Three concurrent 401s produce one refresh call. Firing three isn't merely
wasteful: with refresh-token rotation the 2nd and 3rd present a token the 1st
already consumed, the server rejects them as replay, and **the user is signed
out in the middle of a working session.** The single-flight promise is
`inFlight ??= performRefresh().finally(() => { inFlight = null })` — cleared
after settling, so a later 401 can start a fresh one while everyone waiting
on this one shares its result.

Two deliberate decisions:

- **It uses raw `fetch`, not the client.** A refresh going through the client
  would be subject to the same 401 interception it exists to resolve, and
  would recurse.
- **The auth store registers a callback** via `setSessionExpiredHandler()`
  rather than being imported. That keeps this layer free of a dependency on
  application state — and of the import cycle that would come with it.
  `src/lib/auth/store.ts:277` is where it's wired.

The rotated refresh token **must** be stored on success, or the *next* refresh
presents a token that has already been spent.

### 4.9 Error normalization — `errors.ts`

Every failure path — transport, HTTP status, malformed envelope, cancellation
— becomes one `ApiError`. Error handling in a component is a `switch` on
`kind`, not a pile of `axios.isAxiosError` and `err.response?.status`.

| `kind` | Trigger | Retryable | Reported |
|---|---|:---:|:---:|
| `network` | offline, DNS, CORS, connection reset | ✓ | ✓ |
| `timeout` | we gave up waiting | ✓ | ✓ |
| `canceled` | navigation, superseded search, unmount | ✗ | ✗ |
| `validation` | 400 / 422 — `fieldErrors` populated | ✗ | ✗ |
| `unauthenticated` | 401 | ✗ | ✗ |
| `forbidden` | 403 | ✗ | ✗ |
| `not_found` | 404 | ✗ | ✗ |
| `conflict` | 409 — changed underneath us | ✗ | ✓ |
| `rate_limited` | 429 — `retryAfterMs` populated | ✓ | ✓ |
| `server` | 5xx | ✓ | ✓ |
| `client` | any other 4xx | ✗ | ✓ |
| `parse` | 2xx whose body wasn't the envelope | ✗ | ✓ |
| `unknown` | anything else | ✗ | ✓ |

Four things on `ApiError` you'll use constantly:

```ts
error.kind                  // branch on this
error.userMessage           // safe to render — never a raw 5xx message
error.is('AUTH_010')        // match the server's stable code or key
error.fieldErrors           // [{ field, message }] for form validation
```

And three design choices behind them:

- **`name` becomes `'AbortError'` for cancellations.** Cancellation is not a
  failure. TanStack Query and anything else that sniffs `err.name` must keep
  treating an aborted request as cancelled, not show an error to someone who
  has already navigated away.
- **`userMessage` is generic for 5xx/parse/unknown.** A 500's message can
  carry stack fragments or internal identifiers; those belong in logs, not on
  screen. `validation` is the one kind whose server message *is* shown,
  because it was written for the user.
- **`toJSON()` deliberately excludes `details`.** `details` carries whatever
  the server attached to the code, and for at least one code (`AUTH_010`,
  MFA challenge) **that is a live credential**. An error object that reaches
  the console, a log drain, and an error tracker must not be the thing that
  leaks it — so reading it is opt-in at the call site, via
  `error.detailString('mfaToken')`.

> **Branch on `code`, not on `status`.** Status is too coarse: an MFA
> challenge and a wrong password are both 401, and treating them the same
> tells a user with 2FA that their password is wrong. `message` is prose and
> will be reworded. `code` is the stable contract.

### 4.10 Observability — the tail of `request()`

Every request, success or failure, produces four things:

| Sink | What it gets |
|---|---|
| `apiMetrics.record()` | operation, duration, outcome, retries, deduped, status |
| `telemetry.span()` | a span named `api <operation>` |
| `recordTrace()` | DEV-only inspector entry (see section 6) |
| `log.debug` / `log.error` | structured line, **URL redacted** |

Three rules here:

- **Cancellations are never reported.** They're the user moving on, not a
  fault. On a search-as-you-type field they'd be the majority of everything
  reported, burying real errors. `error.isReportable` encodes this, and also
  excludes expected 4xx.
- **URLs are redacted** (`redactUrl`) before logging — query strings routinely
  carry search terms and identifiers.
- **Telemetry fingerprints on `['api', operation, kind]`**, not on the
  message, so one endpoint's failures don't shatter into an issue per request
  id.

### 4.11 Cancellation, rethrown

The last few lines of `request()` look like a bug and aren't:

```ts
if (apiError.kind === 'canceled' && options.signal?.aborted) {
  throw options.signal.reason ?? apiError
}
```

The normalization guarantee covers *failures*. A cancellation the caller asked
for isn't one. Server-state libraries identify their own cancellations by the
reason they aborted with — TanStack Query throws its `CancelledError` and
reverts the query to its previous state when it sees that reason come back.
Substituting an `ApiError` made every cancellation look like a genuine
rejection and put the query into an error state: on any StrictMode
double-mount, list screens rendered an error for a request the user never
abandoned. Observability above has already recorded it, so nothing is lost.

---

## 5. Using it

### 5.1 The four entry points

```ts
import { api, request, requestData, fetchPage } from '@/lib/api'

api.get<Vehicle>('/vehicles/123')            // → Vehicle          (data only)
api.getPage<Vehicle[]>('/vehicles')          // → ApiResponse      (keeps meta)
api.post<Vehicle>('/vehicles', input)
api.put<Vehicle>('/vehicles/123', input)
api.patch<Vehicle>('/vehicles/123', input)
api.delete<void>('/vehicles/123')

fetchPage<Vehicle>({ url: '/vehicles', params })  // → Page<Vehicle>
```

`api.*` are thin wrappers on purpose — **all** behaviour lives in `request()`.

- Need `meta` (pagination, server annotations)? → `request()` / `api.getPage`
- Just the payload? → `requestData()` / `api.get` etc.
- A list endpoint? → `fetchPage()`, which returns `{ items, pagination }` and
  synthesises a single-page descriptor for the endpoints that still return a
  bare array. Callers get one shape and never branch on which style of
  response they got.

### 5.2 `RequestOptions`

```ts
{
  url: '/vehicles/123',        // required, relative to API_BASE_URL
  method: 'GET',               // default GET
  params: { page: 1, q: '' },  // undefined/null/'' are dropped, not sent
  body: input,                 // JSON.stringify'd, or passed through if FormData
  headers: { … },
  signal,                      // ALWAYS forward TanStack Query's signal
  operation: 'vehicles.get',   // ALWAYS set — this is the metric key

  timeoutMs: 60_000,           // default 15s; API_CONFIG.longTimeoutMs for exports
  retry: true,                 // opt in for an idempotency-keyed POST
  maxRetries: 0,               // override the count
  dedupe: false,               // turn off for a deliberate poll
  anonymous: true,             // no Authorization header (login, public)
}
```

### 5.3 Reading data

```ts
export function useVehicle(vehicleId: string) {
  return useQuery({
    queryKey: queryKeys.vehicles.detail(vehicleId),
    queryFn: ({ signal }) => vehicleService.get(vehicleId, signal),
    enabled: Boolean(vehicleId),
  })
}
```

**Always forward `signal`.** It is what makes a search race impossible:

```
"car" ─▶ "car service" ─▶ "car service near me"
```

Each keystroke changes the query key, Query aborts the superseded request's
signal, the transport cancels the fetch. An older response cannot arrive late
and overwrite a newer one, because it never completes.

### 5.4 Writing data

```ts
export function useUpdateVehicle(vehicleId: string) {
  const queryClient = useQueryClient()

  return useMutation<Vehicle, ApiError, UpdateVehicleInput, { previous?: Vehicle }>({
    mutationKey: ['vehicles', 'update', vehicleId],
    mutationFn: (input) => vehicleService.update(vehicleId, input),

    onMutate: async (input) => {
      // Not optional: a GET resolving after we write the optimistic value
      // would overwrite it with pre-edit server state, and the change would
      // appear to revert on its own.
      await queryClient.cancelQueries({ queryKey: queryKeys.vehicles.detail(vehicleId) })
      const previous = queryClient.getQueryData<Vehicle>(queryKeys.vehicles.detail(vehicleId))
      /* … write optimistic value … */
      return { previous }
    },

    onSuccess: (vehicle) => {
      queryClient.setQueryData(queryKeys.vehicles.detail(vehicle._id), vehicle)
      void queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.lists() })
    },
  })
}
```

Two rules run through every mutation in this codebase:

1. **Mutations are never retried automatically.** Nothing overrides the
   client-wide default.
2. **Invalidate by the narrowest key that covers the change.** Editing one
   vehicle invalidates that detail and the lists (its row may have changed) —
   *not* `queryKeys.vehicles.all`, which would also discard every other
   vehicle's cached sub-resources.

### 5.5 Adding a new endpoint

You will almost never edit `src/lib/api/`. The steps are:

1. **Add the method to the feature's `service.ts`** — path, params, response
   type, and a stable `operation` label. Accept `signal?: AbortSignal`.
2. **Add a key to `queryKeys.ts`** if it's a read.
3. **Add a hook** in `queries.ts` (forward `signal`) or `mutations.ts`
   (invalidate narrowly).
4. **Export it** from the feature's `api/index.ts`.

```ts
// 1 — service.ts
const BASE = '/vehicles'
const byId = (id: string) => `${BASE}/${encodeURIComponent(id)}`   // always encode

get(vehicleId: string, signal?: AbortSignal): Promise<Vehicle> {
  return api.get<Vehicle>(byId(vehicleId), { signal, operation: 'vehicles.get' })
}
```

Services know nothing about React, and re-implement nothing about transport.
This is the layer that makes the architecture hold at hundreds of endpoints:
each feature owns one, and the client stays a single file none of them modify.

### 5.6 Query keys

Hierarchical arrays, so invalidation can target a level:

```
queryKeys.vehicles.all           ['vehicles']                → everything
queryKeys.vehicles.lists()       ['vehicles','list']         → every list/filter
queryKeys.vehicles.list({q})     ['vehicles','list',{q}]     → one filter
queryKeys.vehicles.detail(id)    ['vehicles','detail',id]    → one record
queryKeys.vehicles.documents(id) ['vehicles','detail',id,'documents']
```

Sub-resource keys nest **under** their parent's detail key on purpose, so
invalidating a vehicle also invalidates its documents and reminders without
those having to be listed anywhere.

Everything is `as const`, so keys are literal tuples and a typo in a level
name is a compile error rather than a cache miss. That matters because the
failure mode of a drifted key is invisible: no error, no warning, just stale
data on screen.

### 5.7 Handling errors in a component

```ts
import { isApiError } from '@/lib/api'

if (isApiError(error)) {
  if (error.kind === 'validation') return <FieldErrors errors={error.fieldErrors} />
  if (error.is('AUTH_010'))        return <MfaPrompt token={error.detailString('mfaToken')} />
  return <Alert>{error.userMessage}</Alert>
}
```

Never inspect `error.status` to decide what to render, and never assume which
HTTP library is underneath. Ask the error what kind it is.

### 5.8 Shared domain primitives

```ts
import { isPopulated, refId, type Ref, type BaseDocument } from '@/lib/api'
```

`Ref<T> = Id | T` models a Mongoose reference honestly: it arrives as a bare
id or as the populated document depending on whether the endpoint called
`.populate()`. Modelling it as a union forces call sites to handle both, which
beats typing it as the populated shape and getting `undefined` at runtime on
the endpoints that don't populate.

```ts
const owner = isPopulated(vehicle.owner) ? vehicle.owner.name : '—'
const ownerId = refId(vehicle.owner)
```

---

## 6. Debugging

In dev builds, the console has an inspector. The Network tab shows *what* went
out; it can't tell you which feature triggered it, or whether it was served
from cache, deduplicated onto another request, retried, or cancelled — which
is most of what you want when a screen fires nine requests it shouldn't.

```js
__fmrApi.recent()                     // last 25: what, when, how long, deduped?
__fmrApi.failures()                   // what failed and why, with request ids
__fmrApi.slow(500)                    // operations over a threshold
__fmrApi.stats()                      // per-operation counts, P50/P95/P99
__fmrApi.byOperation('vehicles.list')
__fmrApi.byRequestId('fmr-…')         // find the request from an error report
__fmrApi.clear()
```

It's a **bounded ring buffer** (200 entries) — an unbounded array here would
be exactly the memory leak this layer exists to prevent — and it is
**entirely stripped from production**: every entry point is behind
`import.meta.env.DEV`, which Vite evaluates statically, so the buffer and its
retained URLs don't exist in a release bundle.

### Common symptoms

| Symptom | Look at |
|---|---|
| `[api] VITE_API_URL is not set` at startup | `.env.development`. Deliberate: a missing var used to produce requests to the dev server's own origin that 404'd with an HTML body |
| Requests hang ~15s then fail | `API_CONFIG.timeoutMs`; use `longTimeoutMs` for exports/reports |
| Duplicate requests on one screen | Different query keys hitting the same URL, or `dedupe: false` |
| Signed out mid-session | Refresh-token rotation — check the rotated token is being stored |
| Retries stop happening | Budget exhausted (`retryBudget.available`), or the method is non-idempotent |
| Error toast after navigating away | A cancellation that isn't being classified as one — check the `signal` is forwarded |

---

## 7. Configuration

All in `config.ts`:

| Setting | Value | Why |
|---|---|---|
| `timeoutMs` | 15 s | Per **attempt**, not per retry sequence |
| `longTimeoutMs` | 60 s | Exports and reports that legitimately take a while |
| `retry.maxRetries` | 2 | 2 retries = at most 3 requests |
| `retry.baseDelayMs` | 300 ms | Doubles each attempt |
| `retry.maxDelayMs` | 4 s | A long backoff can't strand a user behind a spinner |
| `retry.jitter` | `true` | Full jitter — decorrelates the thundering herd |
| `retryBudget` | 12 | App-wide ceiling on retries in flight |
| `devtools.maxEntries` | 200 | Ring buffer size |
| `metricsFlushMs` | 60 s | Metrics window |

`API_BASE_URL` comes from `VITE_API_URL` and **throws at module load** if it's
missing, with the fix in the message. Failing loudly beats silently issuing
requests against a relative URL.

---

## 8. Tests

`~770 lines` across four files, all in `src/lib/api/`. They cover the
behaviours that are easy to regress and expensive to get wrong:

**`client.test.ts`** — envelope unwrapping · `meta` preserved · param
serialization · request id headers (ours vs. the server's) · 204 without
inventing a body · network failure surfaced as `kind: 'network'` not a raw
`TypeError` · field errors carried through · a 2xx with `success: false`
rejected · timeout reported as a timeout, not a cancellation · retry on 500 ·
give up after the configured count · **never** retry a POST · retry a POST
when explicitly opted in · no retry on 404 · stop when the budget is
exhausted · the caller's own abort reason rethrown · bearer token attached /
omitted for `anonymous` · server errors reported but cancellations not.

**`authRefresh.test.ts`** — refresh once on 401 and replay the original ·
store the rotated token · **exactly one** refresh for concurrent 401s · clear
the session and notify once on failure · no refresh without a refresh token ·
at most one refresh per request (no 401 loop) · never retry a 401 as if it
were transient.

**`dedupe.test.ts`** — key stable regardless of param order · empty params
ignored · different bodies separated · concurrent identical GETs collapsed ·
different URLs not collapsed · a fresh request after the first settles · POSTs
not deduped · **one subscriber aborting does not cancel the others** · shared
request aborted once everyone has left · survives the StrictMode
mount/unmount/remount sequence · a caller arriving just after the last
subscriber left starts a fresh request · a newer search supersedes an older
one without the older overwriting it.

The last four are the regression tests for the two load-bearing guards in
section 4.3. If you touch `dedupe.ts`, run these first.

---

## 9. The rules, in one place

**Do**

- Import from `@/lib/api` — never `@/lib/api/transport` or any other internal.
  An import from a subpath is an obvious review flag.
- Put URLs in a feature `service.ts`, never in a component or hook.
- Pass a stable `operation` on every call.
- Forward TanStack Query's `signal` into every service call.
- `encodeURIComponent` every path parameter.
- Branch on `error.kind` and `error.code`; render `error.userMessage`.
- Use `queryKeys.*`; invalidate the narrowest key that covers the change.

**Don't**

- Call `fetch` or `axios` anywhere outside this folder.
- Retry a `POST`/`PATCH` unless the endpoint is idempotency-keyed.
- Log or serialize `ApiError.details` — it can hold a live credential.
- Show a raw 5xx `message` to a user.
- Hand-write a query key.
- Inspect `error.status` to choose what to render.
- Put feature knowledge (vehicles, invoices, sessions) in `src/lib/api/`.

---

## Appendix — the response envelope

Mirrors the backend's `utils/apiResponse.ts`.

```ts
// success
{ success: true, statusCode: 200, message: '…', data: T,
  meta: { pagination?, requestId? } | null, timestamp: '…' }

// failure
{ success: false, statusCode?: 400, message: '…', code?: 'AUTH_010',
  key?: 'auth.mfa_required', correlationId?: '…',
  errors?: [{ field?, message }], details?: { … }, timestamp: '…' }
```

Two gotchas baked into the types:

- **`statusCode` is optional on failures.** `auth.routes.ts` builds the
  MFA-required body inline rather than throwing through the global error
  handler, and omits it. The HTTP status always wins.
- **`details` is a step in a flow, not decoration.** `POST /auth/login`
  answers 401 `AUTH_010` with `{ mfaToken }` there; without it the client
  can't complete the sign-in it just started. It's also why `details` is
  never serialized by default.
