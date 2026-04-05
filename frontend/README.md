# ZeroCrush Frontend - Complete Structure Guide

This document describes the **entire frontend folder structure** and the purpose of **each file** in this project.

## Tech Stack

- Next.js App Router (TypeScript)
- React 19
- Tailwind CSS + shadcn/ui-style components
- Prisma ORM (PostgreSQL)
- Nodemailer for transactional emails
- PWA support (manifest + service worker)

## Root Files

### `.env`
Local environment variables used by runtime and build tasks (database URL, auth/mail settings, etc.).

### `components.json`
shadcn/ui configuration file that defines component paths, aliases, and style integration choices.

### `eslint.config.mjs`
ESLint configuration for linting TypeScript/React/Next.js source files.

### `next-env.d.ts`
Auto-generated Next.js TypeScript ambient declarations.

### `next.config.ts`
Next.js framework configuration (build/runtime flags and framework options).

### `package-lock.json`
npm lockfile (kept for dependency snapshot compatibility when npm is used).

### `package.json`
Project manifest: scripts, dependencies, metadata, and tooling definitions.

### `pnpm-lock.yaml`
pnpm lockfile pinning exact dependency graph for reproducible installs.

### `pnpm-workspace.yaml`
pnpm workspace settings file (even for single-package setup, used by pnpm tooling).

### `postcss.config.mjs`
PostCSS pipeline config used by Tailwind and CSS transforms.

### `prisma.config.ts`
Prisma CLI/runtime config (datasource from environment) used by migrate/deploy flows.

### `proxy.ts`
Next.js request interception entrypoint (new convention replacing `middleware.ts`), currently passes requests through.

### `tsconfig.json`
TypeScript compiler configuration for the frontend codebase.

## App Directory (`app/`)

### `app/favicon.ico`
Browser tab favicon asset for the application.

### `app/globals.css`
Global CSS layer: base styles, theme variables, utility extensions, and app-wide visual tokens.

### `app/layout.tsx`
Root App Router layout that wraps every route. Defines fonts, metadata defaults, and global providers/components.

### `app/manifest.ts`
Dynamic web app manifest route used for PWA metadata (name, icons, theme info).

### `app/page.tsx`
Root route page component (`/`) and entry-level navigation behavior.

### `app/admin/page.tsx`
Admin route UI page for admin-level management screens.

### `app/dashboard/page.tsx`
Main operations dashboard page composing live monitoring and workflow panels.

### `app/login/page.tsx`
Authentication UI for admin/management login flows and session bootstrap.

### `app/offline/page.tsx`
Offline fallback page displayed for PWA/offline navigation conditions.

## API Routes (`app/api/`)

### `app/api/auth/management/route.ts`
Management login/auth endpoint. Validates management credentials and returns session-relevant data.

### `app/api/events/route.ts`
CRUD-style endpoint for event listing/creation and event-level server operations.

### `app/api/events/register/route.ts`
Public registration endpoint used to register attendees for an event.

### `app/api/events/verify/route.ts`
Verification endpoint for attendee token/code validation (gate check or code verification).

### `app/api/events/[eventId]/attendees/route.ts`
Dynamic route for fetching/managing attendees scoped to a specific event.

### `app/api/management/route.ts`
Management account collection endpoint (list/create management users by event scope).

### `app/api/management/[id]/route.ts`
Management account detail endpoint (update/delete single management account).

### `app/api/upload-csv/route.ts`
CSV import endpoint for bulk attendee or token-related ingestion workflows.

### `app/api/users/route.ts`
User collection endpoint for general user list/create operations.

## Reusable Components (`components/`)

### `components/CapacityGauge.tsx`
Visual capacity meter component for crowd load/occupancy representation.

### `components/crowd-chart.tsx`
Crowd analytics chart component (time-series/stat chart rendering).

### `components/event-feed.tsx`
Live/updating event feed list component for operational timeline visibility.

### `components/EventRegistration.tsx`
Event registration panel/form component for attendee creation and submission.

### `components/GateEntry.tsx`
Gate check-in component for token verification and entry processing.

### `components/live-feed.tsx`
Live camera/video feed display component.

### `components/LiveMonitoring.tsx`
Live monitoring workspace component combining feed, metrics, and response controls.

### `components/ManagementAccess.tsx`
Management account/role access UI for permissions and tab visibility assignment.

### `components/PWARegister.tsx`
Client-side service worker/PWA registration helper component.

### `components/RegistrationManagement.tsx`
Registration management interface for searching/editing attendee registrations.

### `components/RiskMeter.tsx`
Risk score indicator component for operational safety status.

### `components/Sidebar.tsx`
Primary navigation/sidebar shell with event context, user controls, and route switches.

### `components/smartwatch-panels.tsx`
Dashboard panel composition component(s) for smartwatch/ops-style card layouts.

### `components/stat-card.tsx`
Reusable metric/stat card used across dashboard sections.

## UI Primitives (`components/ui/`)

### `components/ui/badge.tsx`
Small status/label badge primitive.

### `components/ui/button.tsx`
Button primitive with variants and shared styling.

### `components/ui/card.tsx`
Card container primitives for section grouping.

### `components/ui/dialog.tsx`
Dialog/modal primitives for overlay interactions.

### `components/ui/input.tsx`
Text input primitive.

### `components/ui/label.tsx`
Form label primitive.

### `components/ui/select.tsx`
Select/dropdown primitive.

### `components/ui/slider.tsx`
Slider input primitive.

### `components/ui/switch.tsx`
Toggle switch primitive.

### `components/ui/table.tsx`
Table primitives for tabular data rendering.

## Library Layer (`lib/`)

### `lib/api.ts`
Frontend API helper layer wrapping fetch calls and typed request/response helpers.

### `lib/auth.ts`
Auth/session domain utilities: role models, session storage helpers, tab access logic, and admin credential checks.

### `lib/mailer.ts`
Server-side email service: verification code generation and email delivery templates/transport.

### `lib/prisma.ts`
Prisma client initialization and database adapter wiring for server routes.

### `lib/utils.ts`
Shared utility helpers (className merging and misc reusable functions).

## Database (`prisma/`)

### `prisma/schema.prisma`
Prisma schema defining models, relations, and datasource/generator behavior.

### `prisma/migrations/migration_lock.toml`
Prisma migration lock metadata tracking migration provider/state.

### `prisma/migrations/20260312175635_init/migration.sql`
Initial schema migration (base tables/indexes).

### `prisma/migrations/20260313094500_event_scoped_management/migration.sql`
Migration introducing event-scoped management account structures/constraints.

### `prisma/migrations/20260313123000_management_roles/migration.sql`
Migration adding management role metadata/columns.

## Public Assets (`public/`)

### `public/sw.js`
Service worker script for offline caching/PWA behavior.

### `public/mailTemplate.json`
JSON template catalog for outgoing emails (verification and entry-success), with placeholders and subject/text/html bodies.

### `public/icons/apple-touch-icon.svg`
Apple touch icon for iOS home-screen install.

### `public/icons/icon-192.svg`
PWA icon (192px) used in manifest and install prompts.

### `public/icons/icon-512.svg`
PWA icon (512px) for high-resolution install surfaces.

## Build Script (`scripts/`)

### `scripts/build.mjs`
Production build orchestrator:
1. Loads `.env`.
2. Runs `prisma migrate deploy`.
3. Runs `next build`.

This guarantees schema migrations are applied before generating the production bundle.

---

## Notes

- Generated folders such as `.next/` and dependency folders such as `node_modules/` are intentionally not documented here.
- If new files are added, extend this README to keep architecture documentation current.
