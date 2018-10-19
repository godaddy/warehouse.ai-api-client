const sinon = require('sinon');
const assume = require('assume');
const Assets = require('../assets');
const Wrhs = require('..');

assume.use(require('assume-sinon'));

/* eslint-disable max-nested-callbacks */
describe('Assets', function () {
  const wrhs = new Wrhs('https://my-warehouse-api');
  const buildData = {};
  let assets;
  let sendStub;

  beforeEach(function () {
    assets = null;
  });

  afterEach(function () {
    sinon.restore();
    sendStub = null;
  });

  it('should have a get function', function () {
    assets = new Assets();
    assume(assets.get).is.a('function');
  });

  describe('.get', function () {
    beforeEach(function () {
      sendStub = sinon.stub(wrhs, 'send')
        .yields(null, buildData)
        .returns(wrhs);
    });

    it('returns error when no pkg specified', function (done) {
      assets = new Assets();
      assets.get({ pkg: null }, error => {
        assume(error).is.truthy();
        assume(error.message).contains('invalid parameters supplied, missing `pkg`');
        done();
      });
    });

    it('fetches data from warehouse', function (done) {
      assets = new Assets(wrhs);

      const fluentResult = assets.get({ pkg: 'some-pkg', env: 'prod', version: '1.2.3', locale: 'en-NZ', filter: 'foo/bar' }, (error, data) => {
        assume(error).is.falsey();
        assume(data).equals(buildData);
        assume(sendStub).is.called(1);
        assume(sendStub).is.calledWithMatch('assets/files/some-pkg/prod/1.2.3',
          { query: { locale: 'en-NZ', filter: 'foo%2Fbar' }});
        done();
      });

      assume(fluentResult).to.equal(wrhs);
    });

    it('provides defaults', function (done) {
      assets = new Assets(wrhs);

      assets.get({ pkg: 'some-pkg' }, (error, data) => {
        assume(error).is.falsey();
        assume(data).equals(buildData);
        assume(sendStub).is.called(1);
        assume(sendStub).is.calledWithMatch('assets/files/some-pkg/dev',
          { query: { locale: 'en-US' }});
        done();
      });
    });

    it('supports scoped packages', function (done) {
      assets = new Assets(wrhs);

      assets.get({ pkg: '@some-scope/some-pkg' }, (error, data) => {
        assume(error).is.falsey();
        assume(data).equals(buildData);
        assume(sendStub).is.called(1);
        assume(sendStub).is.calledWithMatch('assets/files/%40some-scope%2Fsome-pkg/dev');
        done();
      });
    });

    it('passes through error from warehouse', function (done) {
      sendStub.yields(new Error('This is an error.')).returns(wrhs);
      assets = new Assets(wrhs);

      assets.get({ pkg: 'some-pkg' }, error => {
        assume(error).is.truthy();
        assume(error.message).contains('This is an error.');
        assume(sendStub).is.called(1);
        done();
      });
    });

    it('fetches data from warehouse each time when no cache', function (done) {
      assets = new Assets(wrhs);

      assets.get({ pkg: 'some-pkg' }, (error1, data1) => {
        assume(error1).is.falsey();
        assume(JSON.stringify(data1)).equals(JSON.stringify(buildData));
        assume(sendStub).is.called(1);

        assets.get({ pkg: 'some-pkg' }, (error2, data2) => {
          assume(error2).is.falsey();
          assume(data2).equals(buildData);
          assume(sendStub).is.called(2);
          done();
        });
      });
    });

    it('fetches data from cache when enabled and parameters are the same', function (done) {
      assets = new Assets(wrhs, { cache: { enabled: true }});

      assets.get({ pkg: 'some-pkg' }, (error1, data1) => {
        assume(error1).is.falsey();
        assume(JSON.stringify(data1)).equals(JSON.stringify(buildData));
        assume(sendStub).is.called(1);

        assets.get({ pkg: 'some-pkg' }, (error2, data2) => {
          assume(error2).is.falsey();
          assume(data2).equals(buildData);
          assume(sendStub).is.called(1);
          done();
        });
      });
    });

    it('fetches data from warehouse when cache is enabled and parameters are the different', function (done) {
      assets = new Assets(wrhs, { cache: { enabled: true }});

      assets.get({ pkg: 'some-pkg', locale: 'en-NZ' }, (error1, data1) => {
        assume(error1).is.falsey();
        assume(JSON.stringify(data1)).equals(JSON.stringify(buildData));
        assume(sendStub).is.called(1);

        assets.get({ pkg: 'some-pkg', locale: 'en-CA' }, (error2, data2) => {
          assume(error2).is.falsey();
          assume(data2).equals(buildData);
          assume(sendStub).is.called(2);
          done();
        });
      });
    });

    it('fetches data from warehouse when cache is enabled, parameters are the same, but bypassCache specified', function (done) {
      assets = new Assets(wrhs, { cache: { enabled: true }});

      assets.get({ pkg: 'some-pkg' }, (error1, data1) => {
        assume(error1).is.falsey();
        assume(JSON.stringify(data1)).equals(JSON.stringify(buildData));
        assume(sendStub).is.called(1);

        assets.get({ pkg: 'some-pkg', bypassCache: true }, (error2, data2) => {
          assume(error2).is.falsey();
          assume(data2).equals(buildData);
          assume(sendStub).is.called(2);
          done();
        });
      });
    });

    it('caches data', function (done) {
      assets = new Assets(wrhs, { cache: { enabled: true }});
      assume(assets.cache).is.truthy();
      assume(assets.cache._caches[0]._items).is.truthy();
      assume(Object.keys(assets.cache._caches[0]._items).length).equals(0);

      assets.get({ pkg: 'some-pkg' }, (error, data) => {
        assume(error).is.falsey();
        assume(data).equals(buildData);
        assume(sendStub).is.called(1);
        assume(assets.cache._caches[0]._items).is.truthy();
        assume(Object.keys(assets.cache._caches[0]._items).length).equals(1);
        done();
      });
    });
  });
});
/* eslint-enable max-nested-callbacks */
