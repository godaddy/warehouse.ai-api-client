# warehouse.ai-api-client
API client to communicate with [warehouse.ai][warehouse.ai].

## install

```bash
npm install warehouse.ai-api-client --save
```

## Usage

```js
const Warehouse = require('warehouse.ai-api-client');
const wrhs = new Warehouse('https://warehouse-instance');

// Get build for environment for a given package name
wrhs.builds.get({ env, pkg }, (err, build) => {});

```

[warehouse.ai]: https://github.com/godaddy/warehouse.ai
