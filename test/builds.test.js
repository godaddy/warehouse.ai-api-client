const sinon = require('sinon');
const assume = require('assume');
const Builds = require('../builds');
const Wrhs = require('..');

assume.use(require('assume-sinon'));

/* eslint-disable max-nested-callbacks */
describe('Builds', function () {
  let sandbox;
  const wrhs = new Wrhs('https://my-warehouse-api');
  let builds;
  const buildData = {};
  let sendStub;

  beforeEach(function () {
    builds = null;
    sandbox = sinon.sandbox.create();
  });

  afterEach(function () {
    sandbox.restore();
    sendStub = null;
    if (builds) {
      builds.stopCacheRefresh();
    }
  });

  it('should have a get function', function () {
    builds = new Builds();
    assume(builds.get).is.a('function');
  });

  it('should have a heads function', function () {
    builds = new Builds();
    assume(builds.heads).is.a('function');
  });

  it('should have a meta function', function () {
    builds = new Builds();
    assume(builds.meta).is.a('function');
  });

  it('should have a cancel function', function () {
    builds = new Builds();
    assume(builds.cancel).is.a('function');
  });

  describe('.get', function () {
    beforeEach(function () {
      sendStub = sandbox.stub(wrhs, 'send')
        .callsArgWithAsync(2, null, buildData)
        .returns(wrhs);
    });

    it('returns error when no pkg specified', function (done) {
      builds = new Builds();
      builds.get({ pkg: null }, error => {
        assume(error).is.truthy();
        assume(error.message).contains('invalid parameters supplied, missing `pkg`');
        done();
      });
    });

    it('fetches data from warehouse', function (done) {
      builds = new Builds(wrhs);

      builds.get({ pkg: 'some-pkg', env: 'prod', version: '1.2.3', meta: 'meta', locale: 'en-NZ' }, (error, data) => {
        assume(error).is.falsey();
        assume(data).equals(buildData);
        assume(sendStub).is.called(1);
        assume(sendStub).is.calledWithMatch('builds/some-pkg/prod/1.2.3/meta',
          { query: { locale: 'en-NZ' }});
        done();
      });
    });

    it('provides defaults', function (done) {
      builds = new Builds(wrhs);

      builds.get({ pkg: 'some-pkg' }, (error, data) => {
        assume(error).is.falsey();
        assume(data).equals(buildData);
        assume(sendStub).is.called(1);
        assume(sendStub).is.calledWithMatch('builds/some-pkg/dev',
          { query: { locale: 'en-US' }});
        done();
      });
    });

    it('passes through error from warehouse', function (done) {
      sendStub.restore();
      sendStub = sandbox.stub(wrhs, 'send')
        .callsArgWithAsync(2, new Error('This is an error.'))
        .returns(wrhs);
      builds = new Builds(wrhs);

      builds.get({ pkg: 'some-pkg' }, error => {
        assume(error).is.truthy();
        assume(error.message).contains('This is an error.');
        assume(sendStub).is.called(1);
        done();
      });
    });

    it('fetches data from warehouse each time when no cache', function (done) {
      builds = new Builds(wrhs);

      builds.get({ pkg: 'some-pkg' }, (error1, data1) => {
        assume(error1).is.falsey();
        assume(data1).equals(buildData);
        assume(sendStub).is.called(1);

        builds.get({ pkg: 'some-pkg' }, (error2, data2) => {
          assume(error2).is.falsey();
          assume(data2).equals(buildData);
          assume(sendStub).is.called(2);
          done();
        });
      });
    });

    it('fetches data from cache when enabled and parameters are the same', function (done) {
      builds = new Builds(wrhs, { buildCache: { enabled: true }});

      builds.get({ pkg: 'some-pkg' }, (error1, data1) => {
        assume(error1).is.falsey();
        assume(data1).equals(buildData);
        assume(sendStub).is.called(1);

        builds.get({ pkg: 'some-pkg' }, (error2, data2) => {
          assume(error2).is.falsey();
          assume(data2).equals(buildData);
          assume(sendStub).is.called(1);
          done();
        });
      });
    });

    it('fetches data from warehouse when cache is enabled and parameters are the different', function (done) {
      builds = new Builds(wrhs, { buildCache: { enabled: true }});

      builds.get({ pkg: 'some-pkg', locale: 'en-NZ' }, (error1, data1) => {
        assume(error1).is.falsey();
        assume(data1).equals(buildData);
        assume(sendStub).is.called(1);

        builds.get({ pkg: 'some-pkg', locale: 'en-CA' }, (error2, data2) => {
          assume(error2).is.falsey();
          assume(data2).equals(buildData);
          assume(sendStub).is.called(2);
          done();
        });
      });
    });

    describe('build cache', function () {
      it('caches data on .get', function (done) {
        builds = new Builds(wrhs, { buildCache: { enabled: true }});
        assume(builds._cache).is.truthy();
        assume(builds._cache.size).equals(0);

        builds.get({ pkg: 'some-pkg' }, (error, data) => {
          assume(error).is.falsey();
          assume(data).equals(buildData);
          assume(sendStub).is.called(1);
          assume(builds._cache).is.truthy();
          assume(builds._cache.size).equals(1);
          done();
        });
      });

      it('refreshing the cache calls warehouse for each cache entry', function (done) {
        builds = new Builds(wrhs, { buildCache: { enabled: true }});

        /* eslint-disable no-undefined */
        const paramsA = {
          type: 'builds',
          env: 'dev',
          version: undefined,
          meta: undefined,
          locale: 'en-NZ',
          pkg: 'first-package'
        };
        const cacheKeyA = builds._getHashKey(paramsA);
        builds._cache.set(cacheKeyA, Object.assign({}, paramsA, { data: { foo: 1 }}));

        const paramsB = {
          type: 'builds',
          env: 'test',
          version: '3.2.1',
          meta: undefined,
          locale: 'fr-FR',
          pkg: 'second-package'
        };
        const cacheKeyB = builds._getHashKey(paramsB);
        builds._cache.set(cacheKeyB, Object.assign({}, paramsB, { data: { bar: 2 }}));
        assume(builds._cache.get(cacheKeyA).data).does.not.equals(buildData);
        assume(builds._cache.get(cacheKeyB).data).does.not.equals(buildData);
        /* eslint-enable no-undefined */

        builds._refreshCache();

        setTimeout(() => {
          assume(sendStub).is.called(2);
          assume(sendStub.firstCall).is.calledWithMatch(
            'builds/first-package/dev',
            { query: { locale: 'en-NZ' }});
          assume(sendStub.secondCall).is.calledWithMatch(
            'builds/second-package/test/3.2.1',
            { query: { locale: 'fr-FR' }});

          assume(builds._cache.get(cacheKeyA).data).equals(buildData);
          assume(builds._cache.get(cacheKeyB).data).equals(buildData);
          done();
        }, 1);
      });

      it('failing to refresh the cache leaves old cache in place', function (done) {
        builds = new Builds(wrhs, { buildCache: { enabled: true }});
        sendStub.restore();
        sendStub = sandbox.stub(wrhs, 'send')
          .callsArgWithAsync(2, new Error('This is an error.'))
          .returns(wrhs);

        /* eslint-disable no-undefined */
        const paramsA = {
          type: 'builds',
          env: 'dev',
          version: undefined,
          meta: undefined,
          locale: 'en-NZ',
          pkg: 'first-package'
        };
        const cacheKeyA = builds._getHashKey(paramsA);
        builds._cache.set(cacheKeyA, Object.assign({}, paramsA, { data: { foo: 1 }}));
        assume(builds._cache.get(cacheKeyA).data).does.not.equals(buildData);
        assume(builds._cache.get(cacheKeyA).data).deep.equals({ foo: 1 });
        /* eslint-enable no-undefined */

        builds._refreshCache();

        setTimeout(() => {
          assume(sendStub).is.called(1);
          assume(sendStub.firstCall).is.calledWithMatch(
            'builds/first-package/dev',
            { query: { locale: 'en-NZ' }});

          assume(builds._cache.get(cacheKeyA).data).does.not.equals(buildData);
          assume(builds._cache.get(cacheKeyA).data).deep.equals({ foo: 1 });
          done();
        }, 1);
      });

      it('prevents re-entrancy into refresh', function (done) {
        builds = new Builds(wrhs, { buildCache: { enabled: true }});

        builds._cache.set('a', { pkg: 'first-pkg', locale: 'en-NZ' });
        builds._cache.set('b', { pkg: 'second-pkg', locale: 'en-NZ' });

        builds._refreshCache();
        builds._refreshCache();

        setTimeout(() => {
          assume(sendStub).is.called(2);
          done();
        }, 1);
      });

      it('refreshing empty cache doesn\'t throw', function (done) {
        builds = new Builds(wrhs, { buildCache: { enabled: true }});

        builds._refreshCache();

        setTimeout(() => {
          assume(sendStub.called).is.false();
          done();
        }, 1);
      });

      it('refreshing when cache disabled doesn\'t throw', function () {
        builds = new Builds(wrhs, { buildCache: { enabled: false }});
        assume(builds._cache).does.not.exist();
        assume(() => builds._refreshCache()).does.not.throw();
      });

      it('the cache can be cleared', function () {
        builds = new Builds(wrhs, { buildCache: { enabled: true }});
        builds._cache.set('a', 'b');
        assume(builds._cache.size).equals(1);
        builds.clearCache();
        assume(builds._cache.size).equals(0);
      });

      it('clearing the cache when cache disabled doesn\'t throw', function () {
        builds = new Builds(wrhs, { buildCache: { enabled: false }});
        assume(builds._cache).does.not.exist();
        assume(() => builds.clearCache()).does.not.throw();
      });
    });
  });

  describe('.getFromCache', function () {
    it('yields an error if cache is not enabled', function (done) {
      builds = new Builds(wrhs, { buildCache: { enabled: false }});

      assume(builds._cache).does.not.exist();
      builds.getFromCache({ pkg: 'some-pkg' }, error => {
        assume(error).is.truthy();
        assume(error.message).contains('BuildCache must be enabled to use getFromCache');
        done();
      });
    });

    it('yields an error if no package specified', function (done) {
      builds = new Builds(wrhs, { buildCache: { enabled: true }});

      builds.getFromCache({ pkg: null }, error => {
        assume(error).is.truthy();
        assume(error.message).contains('invalid parameters supplied, missing `pkg`');
        done();
      });
    });

    it('yields falsey when build not in the cache', function (done) {
      builds = new Builds(wrhs, { buildCache: { enabled: true }});

      builds.getFromCache({ pkg: 'some-pkg' }, (error, data) => {
        assume(error).is.falsey();
        assume(data).is.falsey();
        done();
      });
    });

    it('yields the build when it is cached', function (done) {
      builds = new Builds(wrhs, { buildCache: { enabled: true }});

      /* eslint-disable no-undefined */
      const paramsA = {
        type: 'builds',
        env: 'dev',
        version: undefined,
        meta: null,
        locale: 'en-NZ',
        pkg: 'first-package'
      };
      const cacheKeyA = builds._getHashKey(paramsA);
      builds._cache.set(cacheKeyA, Object.assign({}, paramsA, { data: { foo: 1 }}));
      assume(builds._cache.get(cacheKeyA).data).does.not.equals(buildData);
      assume(builds._cache.get(cacheKeyA).data).deep.equals({ foo: 1 });
      /* eslint-enable no-undefined */

      builds.getFromCache({ env: 'dev', locale: 'en-NZ', pkg: 'first-package' }, (error, data) => {
        assume(error).is.falsey();
        assume(data).is.truthy();
        assume(data).deep.equals({ foo: 1 });

        done();
      });
    });

  });

  describe('.heads', function () {
    beforeEach(function () {
      builds = new Builds(wrhs);
      sendStub = sandbox.stub(wrhs, 'send')
        .callsArgWithAsync(2, null, buildData)
        .returns(wrhs);
    });

    it('returns an error when no package specified', function (done) {
      builds.heads({ pkg: null, env: 'prod' }, error => {
        assume(error).is.truthy();
        assume(error.message).contains('Invalid parameters supplied, missing `pkg`');
        done();
      });
    });

    it('sends request for package and environment', function (done) {
      builds.heads({ pkg: 'some-pkg', env: 'prod' }, (error, data) => {
        assume(error).is.falsey();
        assume(data).equals(buildData);
        assume(sendStub).is.called(1);
        assume(sendStub).is.calledWithMatch('builds/-/head',
          { query: { env: 'prod', name: 'some-pkg' }});
        done();
      });
    });

    it('provided default environment', function (done) {
      builds.heads({ pkg: 'another-pkg' }, (error, data) => {
        assume(error).is.falsey();
        assume(data).equals(buildData);
        assume(sendStub).is.called(1);
        assume(sendStub).is.calledWithMatch('builds/-/head',
          { query: { env: 'dev', name: 'another-pkg' }});
        done();
      });
    });

  });

  describe('.meta', function () {
    let buildStub;

    beforeEach(function () {
      builds = new Builds(wrhs);
      buildStub = sandbox.stub(builds, 'get')
        .callsArgWithAsync(1, null, buildData)
        .returns(wrhs);
    });

    it('calls through setting meta', function (done) {
      builds.meta({ pkg: 'some-pig' }, error => {
        assume(error).is.falsey();
        assume(buildStub).is.called(1);
        assume(buildStub).is.calledWithMatch({ pkg: 'some-pig', meta: false });
        done();
      });
    });

    it('allows for meta: true', function (done) {
      builds.meta({ pkg: 'some-pig', meta: true }, error => {
        assume(error).is.falsey();
        assume(buildStub).is.called(1);
        assume(buildStub).is.calledWithMatch({ pkg: 'some-pig', meta: true });
        done();
      });
    });
  });

  describe('.cancel', function () {
    beforeEach(function () {
      builds = new Builds(wrhs);
      sendStub = sandbox.stub(wrhs, 'send')
        .callsArgWithAsync(1, null, buildData)
        .returns(wrhs);
    });

    it('calls wrhs to cancel a build', function (done) {
      builds.cancel({ env: 'prod', version: '7.8.9', pkg: 'package-to-cancel' }, error => {
        assume(error).is.falsey();
        assume(sendStub).is.called(1);
        assume(sendStub).is.calledWithMatch('builds/cancel/package-to-cancel/7.8.9/prod');
        done();
      });
    });

    it('provide defaults', function (done) {
      builds.cancel({ pkg: 'package-to-cancel' }, error => {
        assume(error).is.falsey();
        assume(sendStub).is.called(1);
        assume(sendStub).is.calledWithMatch('builds/cancel/package-to-cancel/dev');
        done();
      });
    });
  });
});
/* eslint-enable max-nested-callbacks */
