---
name: visual-check-with-playwright
description: Verify frontend changes in a real headless browser against the running local stack, using DOM and geometry checks plus screenshots
compatibility: opencode
---

## What I do

- Log in to the local stack, open pages, assert on text, attributes and layout geometry, and take screenshots when judging visuals.

## When to use me

Use this after UI changes, especially layout, overflow, selection or filter behavior that component tests cannot show in the real app shell.

## Setup (once per sandbox)

1. `mkdir -p /tmp/opencode/pw && cd /tmp/opencode/pw && npm init -y && npm install playwright`
2. The sandbox proxy needs the CA and the Playwright CDN allowed on the host: `sbx policy allow network cdn.playwright.dev`.
3. `echo $PROXY_CA_CERT_B64 | base64 -d > /tmp/opencode/proxy-ca.pem`
4. `NODE_EXTRA_CA_CERTS=/tmp/opencode/proxy-ca.pem npx playwright install chromium`

## Workflow

1. Write a small `.mjs` script: `chromium.launch()`, `newContext({ ignoreHTTPSErrors: true })`, go to `https://local-dev.dataland.com/<route>`, fill `#username`/`#password` (`data_admin` / `password`) and click `#kc-login`.
2. Wait for a concrete element, e.g. `waitForSelector('[data-test="..."]', { timeout: 200000 })`. The Vite dev server is slow on a cold start; a fixed sleep or a short timeout gives false failures and blank screenshots.
3. Run: `NODE_EXTRA_CA_CERTS=/tmp/opencode/proxy-ca.pem node script.mjs`.
4. Prefer assertions over eyeballing:
   - horizontal overflow: compare `document.documentElement.scrollWidth` with `clientWidth` and list elements whose `getBoundingClientRect().right` exceeds it
   - state: read `data-*` attributes, counts and `innerText`
5. Take screenshots only for visual judgment, then read the PNG. Screenshots are written when the script finishes, so read them after the run.
6. Keep scripts in `/tmp/opencode`, never in the repo.

## Pitfalls learned

- Pressing Escape closes whole PrimeVue overlays, not just inner dropdowns.
- Elements inside collapsed table sections use `v-show`; expand the section first.
- Cypress `cy.screenshot` of an element can come out clipped; use viewport screenshots.
