const assume = require('assume');
const sinon = require('sinon');
const Warehouse = require('..');

assume.use(require('assume-sinon'));

describe('warehousei.ai-api-client.tests', function () {
  const wrhs = new Warehouse('https://my-warehouse-api');

  it('should throw an error without a uri', function () {
    assume(() => {
      new Warehouse(); // eslint-disable-line no-new
    }).throws();
  });

  it('should have a publish method', function () {
    assume(wrhs.publish).is.a('function');
  });

  it('should have a builds prototype attached', function () {
    assume(wrhs.builds).is.instanceof(Warehouse.Builds);
  });

  it('should pass the right config to builds', function () {
    const buildsSpy = sinon.spy(Warehouse, 'Builds');
    const buildConfig = { foo: 'bar' };

    const warehouseClient = new Warehouse({
      uri: 'http://ImAUri',
      builds: buildConfig,
      nother: 'thing' });

    assume(warehouseClient).is.not.null();
    assume(buildsSpy).is.called(1);
    assume(buildsSpy).is.calledWithNew();
    assume(buildsSpy).is.calledWithExactly(warehouseClient, buildConfig);
  });
});
