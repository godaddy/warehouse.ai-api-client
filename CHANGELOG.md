# Changelog

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
