# Bilingual CRM Frontend Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh the Easy CRM React frontend into a polished Chinese-first, English-capable sales operations workspace without changing API contracts.

**Architecture:** Keep `frontend/src/App.jsx` as the main app surface and add small local helpers for translations, formatting, empty states, and stage labels. Keep authentication, API calls, and route-less tab navigation intact. Use `frontend/src/styles.css` as the design system layer for shell, tables, forms, cards, responsive behavior, and the Deerflow signature.

**Tech Stack:** Vite, React 18, lucide-react, react-oidc-context, plain CSS, ESLint, Vite build.

---

### Task 1: Translation Layer And Locale State

**Files:**
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Add local translation primitives near constants**

Add `locales`, `stageLabels`, `translations`, `getInitialLocale`, `useLocaleText`, `formatCurrency`, and `displayStage` near the top of `frontend/src/App.jsx`. Keep stage API values unchanged.

- [ ] **Step 2: Run a syntax check through build**

Run: `npm run build --workspace frontend`

Expected: build fails until all new helpers are wired or passes if helpers are syntactically valid and unused warnings are not enforced.

### Task 2: Localize Visible UI Copy

**Files:**
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Thread `t`, `locale`, and `setLocale` through the shell and views**

Pass translation helpers into `LoginScreen`, `Shell`, dashboard content, `CustomersView`, `ContactsView`, and `DealsView`. Replace visible English strings with `t('key')`.

- [ ] **Step 2: Preserve CRUD payload values**

Confirm deal stage form options still submit `prospecting`, `qualified`, `proposal`, `won`, and `lost`, while labels render from localized `stageLabels`.

- [ ] **Step 3: Add localized empty states**

Render empty table rows or compact panels for customers, contacts, deals, recent customers, and open deals.

### Task 3: Operational Visual Refresh

**Files:**
- Modify: `frontend/src/styles.css`
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Replace scaffold styling**

Use a dense operational palette, compact spacing, focus-visible states, stage color classes, stable action button dimensions, and improved table/form hierarchy.

- [ ] **Step 2: Improve login/setup states**

Style login, session loading, and setup configuration screens as part of the same product surface.

- [ ] **Step 3: Add subtle Deerflow attribution**

Add a quiet clickable `Created By Deerflow` link to `https://deerflow.tech` with `target="_blank"` and `rel="noreferrer"`.

### Task 4: Responsive And Accessibility Pass

**Files:**
- Modify: `frontend/src/styles.css`
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Tune desktop, tablet, and mobile layouts**

Keep desktop forms and tables side by side, stack on narrower screens, and ensure table overflow stays horizontal without text overlap.

- [ ] **Step 2: Add labels and title attributes where icon-only controls remain**

Use `aria-label` on edit/delete buttons and language switch controls.

### Task 5: Verification

**Files:**
- Verify: `frontend/src/App.jsx`
- Verify: `frontend/src/styles.css`
- Verify: browser output

- [ ] **Step 1: Run lint**

Run: `npm run lint --workspace frontend`

Expected: exit code 0.

- [ ] **Step 2: Run build**

Run: `npm run build --workspace frontend`

Expected: exit code 0.

- [ ] **Step 3: Review in browser**

Run the Vite dev server and inspect desktop and mobile widths. Confirm the login/setup screen renders, layout is non-overlapping, and static UI includes Chinese default copy and an English switch.
