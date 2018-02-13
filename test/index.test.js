const assume = require('assume');
const Warehouse = require('..');

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

  describe('.builds', function () {
    it('should have a get function', function () {
      assume(wrhs.builds.get).is.a('function');
    });

    it('should have a heads function', function () {
      assume(wrhs.builds.heads).is.a('function');
    });

    it('should have a meta function', function () {
      assume(wrhs.builds.meta).is.a('function');
    });

    it('should have a cancel function', function () {
      assume(wrhs.builds.cancel).is.a('function');
    });
  });
});
