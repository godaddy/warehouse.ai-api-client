const tap = require('tap');
const { WarehouseSDK } = require('./index');
const ObjectAPI = require('./object.js');
const EnvAPI = require('./env.js');
const HookAPI = require('./hook.js');

tap.test('Warehouse SDK', async (t) => {
  const wrhs = new WarehouseSDK({
    baseUrl: 'https://warehouse.com',
    username: 'usr',
    password: 'pwd'
  });

  tap.test('returns an object api instance', async (t) => {
    const objApi = wrhs.object();
    t.type(objApi, ObjectAPI);
  });

  tap.test(
    'returns the same object api instance on repeated calls',
    async (t) => {
      t.equal(wrhs.object(), wrhs.object());
    }
  );

  tap.test('returns an env api instance', async (t) => {
    const envApi = wrhs.env();
    t.type(envApi, EnvAPI);
  });

  tap.test('returns the same env api instance on repeated calls', async (t) => {
    t.equal(wrhs.env(), wrhs.env());
  });

  tap.test('returns an hook api instance', async (t) => {
    const hookApi = wrhs.hook();
    t.type(hookApi, HookAPI);
  });

  tap.test(
    'returns the same hook api instance on repeated calls',
    async (t) => {
      t.equal(wrhs.hook(), wrhs.hook());
    }
  );
});
