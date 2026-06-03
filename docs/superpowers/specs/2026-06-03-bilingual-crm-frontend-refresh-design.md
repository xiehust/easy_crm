# Bilingual CRM Frontend Refresh Design

Date: 2026-06-03

## Goal

Refresh the Easy CRM frontend into a bilingual English and Chinese sales operations workspace while preserving the existing React/Vite app, Cognito authentication, API contracts, and CRUD behavior.

The redesign should make the app feel like a practical sales tool instead of a default admin scaffold. It should improve scanability, visual hierarchy, table density, form clarity, responsive behavior, and language coverage without introducing backend changes.

## Scope

In scope:
- Add a `中文 / EN` language switcher with Chinese as the default UI language.
- Centralize UI copy in a local translation map instead of hardcoding visible strings throughout components.
- Translate navigation, dashboard labels, form labels, table headers, buttons, status text, loading/error messages, empty states, and deal stage labels.
- Refresh the visual system for the login screen, authenticated shell, dashboard, CRUD tables, forms, badges, alerts, and responsive layouts.
- Add the required subtle `Created By Deerflow` attribution link to `https://deerflow.tech`.
- Keep the existing data model and API client behavior.

Out of scope:
- Backend, database, Cognito, or infrastructure changes.
- New CRM product workflows such as kanban boards, activity timelines, inline editing, advanced filtering, or per-user saved language preferences.
- Persisting language preference to any backend or user profile.

## Product Direction

The UI should be an operational CRM, not a landing page. It should prioritize repeated work: checking pipeline state, finding customers, editing records, and reviewing open deals. The design should be quiet, compact, and professional.

Chinese should be the default because the deployed demo data is Chinese. English remains fully available through the language switcher.

## Architecture

Keep the current frontend structure:
- `frontend/src/App.jsx` remains the main component file unless the implementation needs small helper extraction.
- `frontend/src/api.js`, `frontend/src/config.js`, and authentication setup remain unchanged unless a frontend bug is discovered.
- `frontend/src/styles.css` remains the primary styling surface.

Add a small translation layer in the frontend:
- A `translations` object keyed by `zh` and `en`.
- A lightweight `t(key)` translation helper.
- Local UI state for active locale, defaulting to `zh`.
- `localStorage` persistence for the active locale, isolated from auth and API behavior.

Deal stages should keep their API values unchanged:
- API values remain `prospecting`, `qualified`, `proposal`, `won`, and `lost`.
- Display labels are localized through translation.
- Stage color classes can be derived from the stage value.

## Components And UI

Login screen:
- Present Easy CRM as a polished business workspace.
- Localize title, helper text, sign-in button, loading, and setup copy.
- Include the subtle Deerflow attribution.

Authenticated shell:
- Improve the shell hierarchy with clearer brand treatment, navigation, refresh, sign out, and language controls.
- Maintain direct navigation between Dashboard, Customers, Contacts, and Deals.
- Ensure touch targets remain usable on mobile.

Dashboard:
- Keep the four summary stats: customers, contacts, deals, and pipeline.
- Improve stat cards with stronger labels, compact helper text, and better numeric hierarchy.
- Keep recent customers and open deals, but make them easier to scan.
- Provide useful empty states when returned arrays are empty.

Customers, contacts, and deals:
- Keep the current create/edit side form plus table layout on desktop.
- Improve field grouping, labels, actions, and editing state clarity.
- Add localized empty states when lists have no records.
- Keep destructive delete actions available but visually restrained.
- Keep search for customers and stage filtering for deals.

Responsive behavior:
- Desktop should use a dense two-column workspace where forms and tables can be compared.
- Tablet and mobile should stack cleanly without overlapping text or controls.
- Tables should remain horizontally scrollable where needed, with stable action sizes.

## Visual System

Use a refined operational palette:
- Neutral light content surface.
- Deep, readable navigation color.
- A small set of accent colors for active navigation, primary actions, and deal stages.
- Avoid generic purple gradients and overly decorative backgrounds.

Typography:
- Use a readable font stack that supports Chinese and English well.
- Keep operational text compact and legible.
- Do not use oversized hero typography inside the app workspace.

Interaction:
- Add focused hover, active, disabled, and focus-visible states.
- Keep motion subtle and functional.
- Avoid layout shift from dynamic labels or icons.

## Error Handling And States

Loading:
- Replace plain `Loading...` text with localized status treatment.

Errors:
- Preserve error messages from API/auth where useful.
- Localize fixed surrounding UI text.

Empty states:
- Add empty-state rows or panels for dashboard lists and CRUD tables.
- The empty messages should be concise and localized.

## Testing And Verification

Verification should include:
- `npm run lint --workspace frontend`
- `npm run build --workspace frontend`
- Browser review with desktop and mobile viewports.
- Confirm login screen renders.
- Confirm authenticated dashboard renders after Cognito login.
- Confirm switching language updates visible UI copy without changing data.
- Confirm CRUD forms and tables still render and use the same API values.

## Acceptance Criteria

- Users can switch between Chinese and English UI labels.
- Chinese is the default UI language.
- Existing Cognito login and logout still work.
- Existing dashboard, customer, contact, and deal CRUD behavior still works.
- Deal stage API values are unchanged while display labels are localized.
- The app has a substantially more polished, dense, operational CRM appearance.
- Mobile layout does not overlap text or controls.
- A subtle clickable `Created By Deerflow` link is present.
