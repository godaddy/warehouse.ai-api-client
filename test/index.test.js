const assume = require('assume');
const sinon = require('sinon');
const qs = require('querystringify');
const Warehouse = require('..');

assume.use(require('assume-sinon'));

describe('warehousei.ai-api-client.tests', function () {
  const wrhs = new Warehouse('https://my-warehouse-api');

  it('should throw an error without a uri', function () {
    assume(() => {
      new Warehouse(); // eslint-disable-line no-new
    }).throws();
  });

  it('should properly set auth for basic auth', function () {
    const token = 'myuser:mypass';
    const wrhsBasic = new Warehouse({
      uri: 'https://whatever-warehouse.com',
      auth: {
        type: 'basic',
        token
      }
    });

    assume(wrhsBasic.auth).equals(`Basic ${Buffer.from(token, 'utf8').toString('base64')}`);
  });

  it('should properly set auth for bearer auth', function () {
    const token = '123a4567-1a23-12345-a123-a1ab123a1234';
    const wrhsToken = new Warehouse({
      uri: 'https://whatever-warehouse.com',
      auth: {
        type: 'bearer',
        token
      }
    });

    assume(wrhsToken.auth).equals(`Bearer ${token}`);
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

  it('should properly parse undefined query value', function () {
    assume(qs.stringify({ a: void 0, b: null, c: '' })).is.equal('a=&b=&c=');
  });
});
