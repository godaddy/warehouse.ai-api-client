# `warehouse.ai-api-client`

[![Version npm](https://img.shields.io/npm/v/warehouse.ai-api-client.svg?style=flat-square)](https://www.npmjs.com/package/warehouse.ai-api-client)
[![License](https://img.shields.io/npm/l/warehouse.ai-api-client.svg?style=flat-square)](https://github.com/warehouseai/warehouse.ai-api-client/blob/master/LICENSE)
[![npm Downloads](https://img.shields.io/npm/dm/warehouse.ai-api-client.svg?style=flat-square)](https://npmcharts.com/compare/warehouse.ai-api-client?minimal=true)
[![Build Status](https://travis-ci.org/warehouseai/warehouse.ai-api-client.svg?branch=master)](https://travis-ci.org/warehouseai/warehouse.ai-api-client)
[![Dependencies](https://img.shields.io/david/warehouseai/warehouse.ai-api-client.svg?style=flat-square)](https://github.com/warehouseai/warehouse.ai-api-client/blob/master/package.json)

API client to communicate with [warehouse.ai][warehouse.ai].

## Install

```bash
npm install warehouse.ai-api-client --save
```

## Usage

```js
const Warehouse = require('warehouse.ai-api-client');
const wrhs = new Warehouse('https://warehouse-instance');

// Get build for environment for a given package name
wrhs.builds.get({ env, pkg }, (err, build) => {});

// Get release-line information for a package, if version is omitted, uses latest
wrhs.releaseLine.get({ pkg, version }, (err, build) => {});
```

## Configuration

There is ton of configuration you can do with your client. While you can just
pass a `string` like the above snippet to configure where your `wrhs` instance
is hosted, there are a bunch of additional options you can pass as an object:

```js
const wrhs = new Warehouse({
  uri: 'https://warehouse-instance', // where the wrhs instance is located
  statusUri: 'https://warehouse-status-instance', // where the warehouse.ai-status-api instance is located
  retry: {}, // retry configuration (see below)
  auth: 'Bearer 123a4567-1a23-12345-a123-a1ab123a1234', // token you can use to authenticate your request
  timeout: 3e4, // how long to wait until a request times out, in milliseconds
  strictSSL: false, // whether or not to use https
  concurrency: 10, // how many builds to verify at once (you can also use conc as shorthand)
  dry: false, // whether or not to skip verification for each build
  builds: {
    cache: {
      enabled: false
      // any other cache options (see below)
    }
  },
  assets: {
    cache: {
      enabled: false
      // any other cache options (see below)
    }
  }
});
```

- The `retry` options are just parameters passed into [`retryme`].
- The `cache` options are just those passed to [`out-of-band-cache`]

## Test

```bash
npm test
```

[warehouse.ai]: https://github.com/godaddy/warehouse.ai
[`retryme`]: https://github.com/jcrugzz/retryme#usage
[`out-of-band-cache`]: https://github.com/godaddy/out-of-band-cache#usage
