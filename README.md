# `warehouse.ai-api-client`

[![Version npm](https://img.shields.io/npm/v/warehouse.ai-api-client.svg?style=flat-square)](https://www.npmjs.com/package/warehouse.ai-api-client)
[![License](https://img.shields.io/npm/l/warehouse.ai-api-client.svg?style=flat-square)](https://github.com/warehouseai/warehouse.ai-api-client/blob/master/LICENSE)
[![npm Downloads](https://img.shields.io/npm/dm/warehouse.ai-api-client.svg?style=flat-square)](https://npmcharts.com/compare/warehouse.ai-api-client?minimal=true)
[![Build Status](https://travis-ci.org/warehouseai/warehouse.ai-api-client.svg?branch=master)](https://travis-ci.org/warehouseai/warehouse.ai-api-client)

API client to communicate with [warehouse.ai][warehouse.ai].

## Install

```bash
npm install warehouse.ai-api-client --save
```

## Usage

```js
const { WarehouseSDK } = require('warehouse.ai-api-client');
const sdk = WarehouseSDK({ baseUrl, username, password });

const main = async () => {
  // Create an object
  await sdk.object().create({
    name: 'my-object',
    env: 'development',
    expiration: '365d',
    variant: 'en-US',
    version: '1.0.0',
    data: { foo: 'bar' }
  });

  // Get an object
  const result = await sdk.object().get({
    name: 'my-object',
    env: 'development',
    acceptedVariants: ['en-US'],
    version: '1.0.0'
  });

  // Set object head
  await sdk.object().setHead({
    name: 'my-object',
    env: 'development',
    version: '1.0.0'
  });

  // Get head
  const result = await sdk.object().getHead({
    name: 'my-object',
    env: 'development'
  });
};

main().catch(console.error);
```

## Test

```bash
npm test
```

## Release

1. Run `commit-and-tag-version` to bump the version, update the changelog, and create a git tag:

   ```bash
   npm run release
   ```

2. Push the commit and the tag:

   ```bash
   git push --follow-tags
   ```

The `release.yaml` GitHub Actions workflow detects the new tag and publishes the package to npm automatically.

[warehouse.ai]: https://github.com/godaddy/warehouse.ai
