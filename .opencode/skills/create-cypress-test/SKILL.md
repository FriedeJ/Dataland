---
name: create-cypress-test
description: Create a Cypress component or E2E test for a Dataland frontend feature following the repo's conventions
compatibility: opencode
---

## What I do

- Write a Cypress component test or E2E spec for `dataland-frontend` that matches existing conventions, run it, and fix it.

## When to use me

Use this after adding or changing user-facing frontend behavior (new page, component, link, filter, view).

## Workflow

1. Pick the level: component test for one page/component with mocked APIs, E2E for a journey across the real stack.
2. Copy conventions from a neighbour:
   - Component tests: `dataland-frontend/tests/component/components/**/*.cy.ts`. Mount with `getMountingFunction({ keycloak: minimalKeycloakMock(), router })` or `cy.mountWithPlugins(...)`. Pass a router created with `createRouter({ routes, history: createMemoryHistory() })` when you need to assert navigation.
   - E2E: `dataland-frontend/tests/e2e/specs/<area>/index.ts` requiring spec files, registered in `tests/e2e/specs/index.ts` (test group). Use `describeIf` with `executionEnvironments`, `cy.ensureLoggedInAsReader()` and `cy.visitAndCheckAppMount(url)`.
3. Select elements with `data-test` attributes only. Add them to the component if missing.
4. Mock APIs with `cy.intercept('GET', '**/<path>', fixture)`. Keep fixtures small and inline.
5. Run only the new spec:
   - `npx cypress run --component --spec <file> --config retries=0`
   - `npx cypress run --e2e --spec tests/e2e/specs/<area>/index.ts`
6. Finish with `npm run lintci`, `npm run formatci`, `npm run typecheck`, `npm run checkcypresscompilation`.

## Pitfalls learned

- Test files with `// @ts-nocheck` hide typos, e.g. the generated enum is `DataTypeEnum.Sfdr`, not `sfdr`.
- `cypress/unsafe-to-chain-command`: do not chain after `.clear()`; call `.type()` in a new statement.
- PrimeVue column filter menus are covered by the header icon in small viewports; keep filters inline (no Apply step).
- The app shell centers text and PrimeFlex (not Tailwind) provides utility classes.
- Delete temporary screenshot specs before committing.
