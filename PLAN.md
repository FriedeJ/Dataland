# Plan: Data Model documentation explorer

Branch: `feature/data-model-documentation`

## Goal
An integrated, login-protected frontend page that renders the JSONs of the specification service in an explorable
format, plus hints and links elsewhere in the frontend that make users aware of it.

## Background
- A **framework** (SFDR, PCAF, EU Taxonomy, ...) is a tree (category -> subcategory -> field) whose leaves reference
  **data point types**. Each type has a **base type** (technical shape and validator). Types are shared between
  frameworks (`usedBy`).
- Specification service (public inside the stack, proxied at `/specifications`):
  `GET /frameworks`, `GET /frameworks/{id}` (the `schema` field is a JSON **string**), `GET /data-point-types/{id}`,
  `GET /data-point-base-types/{id}`. There is no list endpoint for data point types.
- The frontend uses PrimeFlex (not Tailwind) and PrimeVue; there is a global theme with dark highlight colours.

## Decisions
- Route is behind login (`requiresAuthentication: true`), like the rest of the platform.
- Frontend-only first. Data point types are fetched lazily per selected field (cached via vue-query), so no N+1 on load.
  A backend list endpoint is only a fallback.
- Deep-linkable URLs: `/data-model/:frameworkId?field=<dataPointTypeId>`.

## Phases

### Phase 0 - Setup  [done]
- [x] Local stack running, `/specifications/frameworks` reachable
- [x] Feature branch

### Phase 1 - Client plumbing  [done]
- [x] `generateSpecificationServiceClient` Gradle task, wired into `generateClients`
- [x] `specificationController` registered in `ApiClients.ts` (base path `/specifications`)
- [x] vue-query hooks in `src/api-queries/specification-service/`
- [x] Schema parsing / filtering helpers in `src/utils/DataModelUtils.ts`

### Phase 2 - MVP page  [done]
- [x] Route `/data-model/:frameworkId?` and "DATA MODEL" tab
- [x] `DataModelPage.vue`: framework cards / select, tree, search
- [x] `DataModelFieldDetails.vue`: definition, constraints, calculation rules, base type + example, "used by" links
- [x] Component tests (`tests/component/components/pages/DataModelPage.cy.ts`)

### Phase 3 - Awareness hints and links  [done]
- [x] "DATA MODEL" button on the dataset view (`ViewFrameworkBase.vue`)
- [x] Book icon next to the info icon of each field on the dataset view, deep-linking to the data point
- [x] Hint with link on the company cockpit
- Footer link intentionally skipped: the footer is shared with the public website, but the page requires login.

### Phase 4 - Tests  [done]
- [x] Component tests (page, dataset view button, field link, cockpit hint)
- [x] E2E test `tests/e2e/specs/data-model/` (registered in test group 1)

### Phase 5 - Stretch
- [x] Real data point names in the tree (fetched in parallel, cached) and search by name and business definition
- [x] Tree collapsed by default, expansion state preserved while browsing
- [x] Example shown as table instead of raw JSON
- [ ] Type column in the example table (needs a backend change)
- [ ] Example download code, links to example datasets
- [ ] Mobile polish (basic stacked layout exists)

## Verification (frontend)
`npm run lintci`, `npm run formatci`, `npm run typecheck`, `npm run checkcypresscompilation`,
`npx cypress run --component --spec <spec>`.

## Notes
- `origin` currently points to `d-fine/Dataland`. Fork before pushing.
- The theme's `highlight` colours are dark on dark, so selected tree nodes need a scoped override (done in the page).
