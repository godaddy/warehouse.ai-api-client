# Changelog

### 6.1.0

- Add `put` functionality to `builds`.

### 6.0.0

- **BREAKING**: require Node.js@12 minimal.
- Update all dependencies.
- Introduce `Files` class to generate CouchDB attachments.

## 5.0.0

- **BREAKING:** `verify` now passes back the build ID and failure reason in addition to the URI that failed
  - Instead of an array of URI strings, it is now an array of objects containing
    `{ buildId: string, uri: string, reason: string}`
- **MAJOR:** Migrate from `request` to `node-fetch`
  - Some methods in the base export accept an `options` parameter that sets request options. Since these are now passed
    through to `node-fetch` rather than `request`, there may be incompatibilities introduced. As such, this is a major
    version.
- Retry requests on network errors in `verify`

## 4.5.0

- Allow for auth options object for configuring auth. Support basic auth as well as Bearer tokens

## 4.4.1

- [#15] Fix issue with undefined values when parsing query.
- [#13] Add collected documentation and badges.

[#13]: https://github.com/warehouseai/warehouse.ai-api-client/pull/13
[#15]: https://github.com/warehouseai/warehouse.ai-api-client/pull/15
