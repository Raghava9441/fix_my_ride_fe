# Frontend architecture

React 19 · React Router 7 · TanStack Query · Zustand · Tailwind v4 · Vite.

Two systems carry most of the weight here: a **route manifest** that four
subsystems are derived from, and a **token layer** that every visual decision
is derived from. Both exist so that adding to this app is a change in one
place rather than in five that must agree.

---

## 1. Routing

### The manifest is the map

`src/lib/routing/registry.tsx` declares every screen exactly once, with
everything anything needs to know about it: URL, guard, title, nav placement,
search keywords, and how to load it.

```
registry.tsx  ──buildRouter.tsx──▶  RouteObject[]   (the router)
                                ├─▶  RouteIndex      (flat, by route id)
                                └─▶  handle per route (breadcrumbs, titles)

RouteIndex ──▶ navigation.ts ──▶ side nav · top nav · command palette
```

Nothing keeps a second list. A nav item exists because a route declared
`nav:`; it is visible because that route's guard would admit you. A nav entry
that 404s or 403s isn't a bug to remember not to write — it's unrepresentable.

### Paths are absolute; nesting is for layout

`src/lib/routing/paths.ts` holds every URL as a literal, and `buildPath` is
typed against the template — a missing or misnamed param is a compile error.
Route nesting composes **chrome and access**, never URL segments, so a full
URL is readable on one line and moving a screen under a different layout
doesn't change its address.

```ts
to.vehicleServiceHistory('veh_123')   // '/vehicles/veh_123/service-history'
buildPath(ROUTE_PATHS.roleDetail, { roleId: 'technician' })
```

### Access composes downward and can only narrow

Each route's effective rule is its own ANDed with every ancestor's. Putting a
screen inside the `admin` subtree makes it admin-only whether or not its own
declaration says so. You cannot widen access by forgetting something.

### Guards distinguish "sign in" from "you can't"

`evaluate()` returns a typed decision, not a boolean, because the three
outcomes need three different responses:

| Situation | Response |
|---|---|
| Session still resolving | Skeleton — **never** redirect (this is the bug that loses deep links on refresh) |
| `unauthenticated` | Redirect to `/login?next=…`, honoured on the way back |
| Anything else | Render 403 **in place**, URL intact, naming the missing permission |

### Loading

Every screen is `React.lazy`. Nav links preload their chunk on hover and
focus, so a click usually lands on already-parsed code. `RootErrorBoundary`
specifically detects a stale-chunk failure after a deploy and offers a reload
rather than showing a blank page.

---

## 2. Access control

`src/lib/access/`

| File | Holds |
|---|---|
| `permissions.ts` | The `resource:action` catalog, mirrored from the API's `Permission.seedDefaults()`. The only place a permission string is a literal. |
| `roles.ts` | Both role vocabularies and the grant matrices between them. |
| `capabilities.ts` | Session → `{ permissions: Set, roles: Set, isSuperuser, tenantId }`. |
| `policy.ts` | Composable rules + the pure evaluator. No React, no router, no network. |
| `AccessProvider.tsx` | One evaluation context for the whole tree. |
| `Can.tsx` | Conditional rendering against the same rules. |

```ts
access.all(access.tenant(), access.permission(P.staffProfile.manage))
access.any(access.role('admin'), access.permission(P.report.readAll))
access.all(access.flag('billing'), access.role('owner', 'admin'))
```

The same rule object drives route guards, nav visibility, palette entries,
and `<Can>`. There is one evaluator, so they cannot disagree.

### There are two role vocabularies, and they are not the same list

1. **Account role** (`owner`, `staff`, `admin`, `fleet_manager`,
   `service_advisor`) — coarse, in the JWT, what the API's `requireRole()`
   actually checks.
2. **RBAC role** (`system_admin` … `vehicle_owner`) — fine-grained, what the
   permission catalog hangs off, enforced by no route yet.

Mixing them up is the easiest way to write a check that is always true or
always false. `roles.ts` documents the bridge.

### What these rules actually buy — read this before trusting them

The API gates most endpoints on "is there a valid token" and nothing more.
Access tokens carry **no permissions claim**; the model-level `staff.can()`
chain that would resolve one is wired into no route. A handful of endpoints
check a coarse role, and exactly one controller (`documents`) does a real
per-resource ownership check.

So permission checks in this client are a **navigational and UX contract**,
not a security boundary. They keep people out of screens that would be empty
or confusing, and they give us the vocabulary to switch on real enforcement
later. They must never be the only thing between a user and someone else's
data — that has to land server-side.

Known gaps worth closing on the API, surfaced by building against it:

- `/staff` is behind `authenticate` only — any account in the tenant can
  create and delete staff.
- `POST /roles/:id/assign` has no admin gate, unlike every other role
  mutation.
- `GET /vehicles` builds its filter from raw query params, and `vehicles` is
  in the tenant plugin's shared-collection set, so it is neither
  ownership-scoped nor tenant-scoped.

When the API starts issuing a resolved permission set,
`deriveCapabilities()` is the single function that changes.

---

## 3. Design system

### Three token layers

`src/styles/tokens.css` → primitives → semantic → component, strictly ordered.
`theme.css` maps the semantic layer into Tailwind's `@theme`, so components
use plain utilities (`bg-surface`, `rounded-card`, `duration-fast`) that stay
axis-aware. No component hard-codes a hex, a px radius, or a duration.

### Ten independent customization axes

Each is a `data-*` attribute on `<html>`, applied before first paint by the
bootstrap in `index.html` and kept in sync by `PreferencesProvider`.

| Axis | Values |
|---|---|
| `theme` | auto · light · dark |
| `accent` | teal · amber · indigo · violet · rose · slate |
| `shape` | sharp · soft · capsule |
| `font` | technical · operator · precision · humanist |
| `density` | comfortable · cozy · compact — **spacing only** |
| `type-scale` | sm · md · lg · xl — **text only** |
| `contrast` | standard · high |
| `motion` | full · reduced |
| `color-vision` | default · deuteranopia · tritanopia |
| `nav` | sidebar · topbar (+ collapsed) |

Independence is structural: every axis is a single-attribute selector, so any
combination is valid and adding a value to one can never require touching
another.

Three of these are worth calling out as deliberate:

- **Density and text size are separate axes.** They were one in v1. A user who
  wants tight spacing with large text — a common accessibility need — could
  not have it.
- **Motion is one multiplier.** `--motion-factor` scales every duration token,
  so the axis is one variable rather than N media queries. An OS-level
  `prefers-reduced-motion` overrides it. Loading spinners are explicitly
  exempt: a frozen spinner reads as a hung request.
- **Color vision re-points the status tokens**, swapping the hues that the
  named deficiency collapses. Status is never carried by hue alone anywhere
  (every `Badge` pairs colour with a dot and text), but a palette that
  survives on its own is still the right default.

`AppearancePage` renders itself from `APPEARANCE_AXES` — there is no per-axis
JSX. Adding an axis is a block in `tokens.css` plus a registry entry, and the
control appears with its label and options already correct.

### Preferences are versioned

`PREFERENCES_VERSION` with a forward `migrate()`. v1's `density: 'compact'`
meant tighter spacing *and* smaller text; v2 splits it across the two axes
that replaced it, preserving intent rather than resetting to defaults.

---

## 4. Layout

```
AppShell
├── TopBar        brand · nav (topbar mode) · ⌘K · notifications · account menu
├── SideNav       sections from the route index, collapsible, preloads on hover
└── main          Breadcrumbs (from useMatches, not the URL string) → <Outlet/>
```

Content scrolls in its own region, so chrome stays put without sticky
gymnastics. The rail becomes an overlay drawer under `md` regardless of
preference. `AuthLayout` is a separate shell — signed-out screens have no
session, nav, or breadcrumbs, so sharing one would mean branching on
`session ? … : …` throughout.

Tabs on detail screens are **child routes**, so they are linkable, survive a
refresh, and go back with the back button — and the visible set is filtered
through each tab route's compiled access rule.

---

## 5. Adding a screen

1. Add the URL to `ROUTE_PATHS` (and a builder in `to` if it has params).
2. Add an entry to `routeManifest`: `path`, `title`, `access`, `component`,
   and `nav` if it belongs in the sidebar.
3. Write the component with a **default export** (it is lazily imported).

Nav, breadcrumbs, document title, command palette, guard, and code-splitting
all follow. Nothing else needs editing.

---

## 6. Development

```bash
npm run dev        # vite, port 5173
npm run build      # tsc -b && vite build
npm run lint       # oxlint
```

`VITE_API_URL` comes from `.env.development` (default
`http://localhost:5000/api/v1`).

**Feature flags** resolve from `localStorage['fmr.flags']` (dev only) →
`VITE_FLAG_<UPPER_SNAKE>` → the default in `FLAG_DEFINITIONS`. A flagged-off
route stays in the manifest and is simply unreachable, which is what makes
trunk-based work on a large route tree tolerable. `serviceQueue` ships off —
there is no queue endpoint yet.

**Previewing a role without a seeded database.** In dev builds only, the auth
store exposes a console handle. The block is removed from production by
Vite's static `import.meta.env.DEV` evaluation.

```js
__fmrAuth.as('staff')     // re-derives capabilities, nav, palette, guards
__fmrAuth.as('owner')
__fmrAuth.clear()
```

Note that a synthetic session carries no token, so any screen that fetches
will 401 and sign you back out. Use it on screens that don't (Appearance,
Permissions, Roles) or point it at a running API.
