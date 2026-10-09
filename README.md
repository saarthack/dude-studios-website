# Dude Studios website

The supplied website export is preserved, including its original CSS, videos, fonts, animations and interactive controls. The ZIP contains compiled assets rather than the original React source components.

Run `npm run build` to create `dist/`. No runtime dependencies are required. Vercel uses the static preset and the build settings in `vercel.json`.

The build normalizes the exported HTML, keeps server and client metadata consistent, adds organization/service/FAQ structured data, a sitemap, crawler rules and an informational `llms.txt`, preloads the existing main fonts, and avoids metadata downloads for offscreen hero videos. Changed JS/CSS receive new content hashes. Original media quality and visible layout are preserved.

Contact buttons and the email copy control use `sarthak.work7@gmail.com`. Social labels remain visually present but inactive until official profiles are provided. The supplied draft-price notice and coming-soon introduction are retained. Pricing is intentionally excluded from structured offers until confirmed.

Canonical origin is derived from `SITE_URL`, then `VERCEL_PROJECT_PRODUCTION_URL`, with a local fallback of `https://dude-studios.vercel.app`. Set `SITE_URL` when a verified custom domain is connected. Update this build configuration rather than changing only the rendered HTML: the exported Next metadata also needs to match.

AI discoverability uses accessible HTML, consistent structured facts and crawlable content. `llms.txt` is an optional reading aid and does not guarantee inclusion or ranking in AI search.
