const tap = require('tap');
const WarehouseSDK = require('./index');
const ObjectAPI = require('./object');

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
});
