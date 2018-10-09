const sinon = require('sinon');
const assume = require('assume');
const Packages = require('../packages');
const Wrhs = require('..');

assume.use(require('assume-sinon'));

/* eslint-disable max-nested-callbacks */
describe('Packages', function () {
  const wrhs = new Wrhs('https://my-warehouse-api');
  let packages;
  let sendStub;

  beforeEach(function () {
    packages = null;
  });

  afterEach(function () {
    sinon.restore();
    sendStub = null;
  });

  it('should have a get function', function () {
    packages = new Packages();
    assume(packages.get).is.a('function');
  });

  describe('.get - single', function () {
    const mockData = { name: 'some-pkg' };

    beforeEach(function () {
      sendStub = sinon.stub(wrhs, 'send')
        .callsArgWithAsync(1, null, mockData)
        .returns(wrhs);
    });

    it('fetches data about a single package', function (done) {
      packages = new Packages(wrhs);

      packages.get({ pkg: 'some-pkg' }, (error, data) => {
        assume(error).is.falsey();
        assume(data).equals(mockData);
        assume(sendStub).is.called(1);
        assume(sendStub).is.calledWithMatch('packages/some-pkg');
        done();
      });
    });

    it('supports scoped packages', function (done) {
      packages = new Packages(wrhs);

      packages.get({ pkg: '@some-scope/some-pkg' }, (error, data) => {
        assume(error).is.falsey();
        assume(data).equals(mockData);
        assume(sendStub).is.called(1);
        assume(sendStub).is.calledWithMatch('packages/%40some-scope%2Fsome-pkg');
        done();
      });
    });

    it('passes through error from warehouse', function (done) {
      sendStub.restore();
      sendStub = sinon.stub(wrhs, 'send')
        .callsArgWithAsync(1, new Error('This is an error.'))
        .returns(wrhs);
      packages = new Packages(wrhs);

      packages.get({ pkg: 'some-pkg' }, error => {
        assume(error).is.truthy();
        assume(error.message).contains('This is an error.');
        assume(sendStub).is.called(1);
        done();
      });
    });
  });

  describe('get - all', function () {
    const mockData = [{ name: 'some-pkg' }];

    beforeEach(function () {
      sendStub = sinon.stub(wrhs, 'send')
        .callsArgWithAsync(1, null, mockData)
        .returns(wrhs);
    });

    it('passes through error from warehouse', function (done) {
      sendStub.restore();
      sendStub = sinon.stub(wrhs, 'send')
        .callsArgWithAsync(1, new Error('This is an error.'))
        .returns(wrhs);
      packages = new Packages(wrhs);

      packages.get(error => {
        assume(error).is.truthy();
        assume(error.message).contains('This is an error.');
        assume(sendStub).is.called(1);
        done();
      });
    });

    it('has defaults', function (done) {
      packages = new Packages(wrhs);

      // eslint-disable-next-line no-undefined
      const fluentResult = packages.get(undefined, (error, data) => {
        assume(error).is.falsey();
        assume(data).equals(mockData);
        assume(sendStub).is.called(1);
        assume(sendStub).is.calledWithMatch('packages');
        done();
      });

      assume(fluentResult).to.equal(wrhs);
    });

    it('fetches data about all packages', function (done) {
      packages = new Packages(wrhs);

      const fluentResult = packages.get((error, data) => {
        assume(error).is.falsey();
        assume(data).equals(mockData);
        assume(sendStub).is.called(1);
        assume(sendStub).is.calledWithMatch('packages');
        done();
      });

      assume(fluentResult).to.equal(wrhs);
    });
  });
});
/* eslint-enable max-nested-callbacks */
