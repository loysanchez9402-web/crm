# Changelog

## [1.1.0](https://github.com/loysanchez9402-web/crm/compare/v1.0.0...v1.1.0) (2026-08-07)


### Features

* **api:** enhance email domain handling with machine address detection ([70d7e84](https://github.com/loysanchez9402-web/crm/commit/70d7e84b6532a45fae8cdf98e73aa3f19ff39fbb))
* **api:** enhance onboarding and research key handling ([f1d1332](https://github.com/loysanchez9402-web/crm/commit/f1d133213042573672fc0a1d819290221eb686a1))
* **api:** implement Context.dev key verification and enhance capabil… ([d42a04e](https://github.com/loysanchez9402-web/crm/commit/d42a04ec0d2a3d1d35839e8958ad01e12e8f0de0))
* **api:** implement Context.dev key verification and enhance capabilities handling ([5ca4eae](https://github.com/loysanchez9402-web/crm/commit/5ca4eae9871615bfbffededaceeca2a9e4598348))
* **api:** implement delete functionality for companies, contacts, an… ([96bf31b](https://github.com/loysanchez9402-web/crm/commit/96bf31b72d0c8d8931d124e8670e2fc02601f830))
* **api:** implement delete functionality for companies, contacts, and deals ([4457f73](https://github.com/loysanchez9402-web/crm/commit/4457f7348a222ef32d34dedb74c75202c50a01a1))
* **api:** public POST /public/leads endpoint for website consultation requests ([#1](https://github.com/loysanchez9402-web/crm/issues/1)) ([4042133](https://github.com/loysanchez9402-web/crm/commit/4042133ec5f0dfc3e7097128937635f785bebaf4))
* **app:** add dashboard and overview components for enhanced user experience ([181bd28](https://github.com/loysanchez9402-web/crm/commit/181bd28b016c1abacaeec3cf3581e76011af6152))
* **brand-mapping:** introduce fillable function and enhance brand update logic ([aad5945](https://github.com/loysanchez9402-web/crm/commit/aad59457baca4d99fcb0e693e86623c593fccae7))
* **landing:** enhance agent section and footer for improved layout and user engagement ([ad4ceaa](https://github.com/loysanchez9402-web/crm/commit/ad4ceaa9abec8eb5a829a2c6d8553614441e3519))
* **proxy:** implement marketing flag for landing page visibility ([81a36d6](https://github.com/loysanchez9402-web/crm/commit/81a36d66da79564a01a68af43c8639bfd676bdfd))
* **seo-audit:** add SEO audit skill and related resources ([f266040](https://github.com/loysanchez9402-web/crm/commit/f266040348e91c689170be5d459fe8a9dbf5df64))
* **turbo:** update test dependencies and document workspace behavior ([6d2e6e4](https://github.com/loysanchez9402-web/crm/commit/6d2e6e445c0618fb73f30f161767f52b647064b3))


### Fixes

* annotate Prisma-derived return types TS flags as unnameable ([d39a49c](https://github.com/loysanchez9402-web/crm/commit/d39a49c91e14122051f38ac1176429e658ad8f93))
* **api:** apply code-review findings on the security-fix commits ([28da11a](https://github.com/loysanchez9402-web/crm/commit/28da11a1c3a4c0a31bb93b1c09d8acb67920bbed))
* **api:** lock the deal row for the whole amount/currency update ([9414143](https://github.com/loysanchez9402-web/crm/commit/94141437276b06e0afec7b72e754fdc17d68fa98))
* **api:** make EmailThread rollup fields update atomically ([87334ce](https://github.com/loysanchez9402-web/crm/commit/87334ce16149dc7ecf32d1d4aa32615dbcd83e6e))
* **api:** make tRPC auth global instead of opt-in per router ([d1d43de](https://github.com/loysanchez9402-web/crm/commit/d1d43de37f2319d45986ac4fcbe4c9b1dc66978d))
* **api:** make WEBSITE_ORIGIN actually apply to the /public/leads preflight ([cadd4f1](https://github.com/loysanchez9402-web/crm/commit/cadd4f1ddc2c7980964ccef3ef404c9530175112))
* **api:** run biome on hand-edited files to fix format/import-order ([5fec549](https://github.com/loysanchez9402-web/crm/commit/5fec549ff8405ed715a83bd3c7cfd3663e5aa360))
* **api:** type the locked deal read's amount as nullable ([ec5b4fb](https://github.com/loysanchez9402-web/crm/commit/ec5b4fb232b51bc481f479e05b6a4633411d020e))
* **api:** validate APP_URL as comma-separated URLs, not a bare string ([3eff7fb](https://github.com/loysanchez9402-web/crm/commit/3eff7fb9482ca4f6db9534420e0d97afe64c2789))
* **app:** generate route types before type checking ([03d4069](https://github.com/loysanchez9402-web/crm/commit/03d406976cc0a15601b53516a3041c27606489ed))
* **proxy:** refine redirect logic for sign-in path ([73875f0](https://github.com/loysanchez9402-web/crm/commit/73875f0cc22852a035a4f832beb3ced6d111decd))
* **proxy:** update redirect logic for signed-out users ([8871e49](https://github.com/loysanchez9402-web/crm/commit/8871e49d153db694933537a6ac28219d7761478b))
* resolve pre-existing lint failures (unused imports, non-null assertions) ([ac579bd](https://github.com/loysanchez9402-web/crm/commit/ac579bd755075d1bf7df76463b718ffb8b98642d))


### Refactors

* **api:** enhance deletion logic and activity stamp handling ([68f6014](https://github.com/loysanchez9402-web/crm/commit/68f6014eeb68b3fe863fd81e7cb266e2a309d4d0))
* **api:** improve email normalization and enhance record deletion handling ([277afef](https://github.com/loysanchez9402-web/crm/commit/277afef311bd0aa3f48443046052d588c912d673))
* **api:** update record deletion tests and enhance agent task handling ([82694a6](https://github.com/loysanchez9402-web/crm/commit/82694a6c4a3b9774e672207e9ca9f413c96dd9fe))
* **landing:** remove unused Link imports from agent and capabili… ([e2a5a7f](https://github.com/loysanchez9402-web/crm/commit/e2a5a7fc8dd42bdb210e4b1ea851ebde46195392))
* **landing:** remove unused Link imports from agent and capabilities sections ([66213dd](https://github.com/loysanchez9402-web/crm/commit/66213dd2dec88954a831771ccb087f78ce7d7e20))
* **landing:** replace Link components with divs for improved layout consistency ([79749f5](https://github.com/loysanchez9402-web/crm/commit/79749f5e0f760a7d8ceacac6a02e5c30e1d9d2e1))
* **proxy:** streamline onboarding and research gate handling ([a189eab](https://github.com/loysanchez9402-web/crm/commit/a189eab99a74e574ca95df8648d58c9109bad0e1))
* **proxy:** streamline onboarding and research gate handling ([14cb932](https://github.com/loysanchez9402-web/crm/commit/14cb93285600164f61834126098ad7d507141f82))


### Documentation

* **env:** document landing page behavior based on IS_MARKETING flag ([bde4fd5](https://github.com/loysanchez9402-web/crm/commit/bde4fd55aeb848f3fb7b4ee207f12c5bf37c7866))
* **env:** update .env.example and api.md to clarify marketing flag usage ([34900ae](https://github.com/loysanchez9402-web/crm/commit/34900ae78faa490f0bbe6fc8d9a2fc742f7dd959))
* **README:** add stars badge for project visibility ([4dd7e90](https://github.com/loysanchez9402-web/crm/commit/4dd7e90632d98911c5a4531848ef6bdf9626eb19))
* **README:** align images for better presentation in the README ([a075794](https://github.com/loysanchez9402-web/crm/commit/a075794975b2beef2cdab16cf11e38b5d0bd3423))
* **README:** remove duplicate stars badge and improve project visibility ([96173a1](https://github.com/loysanchez9402-web/crm/commit/96173a1ebb6f37167cac443a4f508ef7f15433cb))
* **README:** update stars badge positioning for improved visibility ([b48268e](https://github.com/loysanchez9402-web/crm/commit/b48268e18cf93686006a7d57ee31918fb41c8ecb))

## 1.0.0 (2026-08-03)


### Features

* **brand-mapping:** introduce fillable function and enhance brand update logic ([aad5945](https://github.com/trycompai/crm/commit/aad59457baca4d99fcb0e693e86623c593fccae7))
