const tap = require('tap');
const WarehouseSDK = require('./index');

tap.test('Warehouse SDK', async (t) => {
  const wrhs = new WarehouseSDK();

  tap.test('gets mock value', async (t) => {
    const val = await wrhs.getObject();
    t.equal(val, 'MOCK');
  });
});
