const sinon = require('sinon');
const assume = require('assume');
const Cache = require('../cache');

assume.use(require('assume-sinon'));

/* eslint-disable max-nested-callbacks */
describe('Cache', function () {
  let sandbox;
  let cache;
  // const buildData = {};
  // let sendStub;
  let refreshIndex = 0;

  beforeEach(function () {
    cache = null;
    refreshIndex = 0;
    sandbox = sinon.sandbox.create();
    cache = new Cache(refreshData);
  });

  afterEach(function () {
    sandbox.restore();
    // sendStub = null;
    if (cache) {
      cache.stopRefresh();
    }
  });

  function refreshData(params, fn) {
    fn(null, refreshIndex++);
  }

  it('can be constructed', function () {
    assume(cache).is.truthy();
    assume(cache._refresh.intervalId).is.not.null();
    assume(cache._refresh.interval).equals(20 * 60 * 60 * 1000);
    assume(cache._refresh.limit).equals(10);
  });

  it('doesn\'t set refresh interval for negative intervals', function () {
    cache.stopRefresh();
    cache = new Cache(refreshData, { refresh: { interval: -1 }});

    assume(cache._refresh.intervalId).is.null();
  });

  it('allows for default overrides', function () {
    cache.stopRefresh();
    cache = new Cache(refreshData, { refresh: { interval: 5, limit: 1 }});

    assume(cache._refresh.intervalId).is.not.null();
    assume(cache._refresh.interval).equals(5);
    assume(cache._refresh.limit).equals(1);
  });

  describe('.get', function () {
    it('returns null for non-cached content', function () {
      const result = cache.get({ i: 'don\'t', exist: false });
      assume(result).is.null();
    });

    it('returns data for cached content', function () {
      const params = { exists: true };
      const data = 'foo';
      const cacheKey = cache._getHashKey(params);
      cache._cache.set(cacheKey, { data });

      const result = cache.get(params);

      assume(result).is.not.null();
      assume(result).equals(data);
    });
  });

  describe('.set', function () {
    it('sets cache to have params and data', function () {
      const params = { exists: true };
      const data = 'foo';
      const cacheKey = cache._getHashKey(params);

      cache.set(params, data);

      const rawData = cache._cache.get(cacheKey);
      assume(rawData).is.not.null();
      assume(rawData.params).equals(params);
      assume(rawData.data).equals(data);
    });

    it('replaces old data', function () {
      const params = { exists: true };
      const data = 'new';
      const cacheKey = cache._getHashKey(params);

      cache.set(params, 'old');
      cache.set(params, data);

      const rawData = cache._cache.get(cacheKey);
      assume(rawData).is.not.null();
      assume(rawData.params).equals(params);
      assume(rawData.data).equals(data);
    });
  });

  describe('.clear', function () {
    it('doesn\'t throw on empty cache', function () {
      cache.clear();
    });

    it('empties the cache', function () {
      cache._cache.set(1, 2);
      cache._cache.set(3, 4);

      assume(cache._cache.size).equals(2);

      cache.clear();

      assume(cache._cache.size).equals(0);
    });
  });

  describe('.resumeRefresh', function () {
    it('restarts the interval', function () {
      clearInterval(cache._refresh.intervalId);
      cache._refresh.intervalId = null;

      cache.resumeRefresh();

      assume(cache._refresh.intervalId).is.not.null();
    });

    it('doesn\'t restart the interval if its already running', function () {
      const intervalId = cache._refresh.intervalId;

      cache.resumeRefresh();

      assume(cache._refresh.intervalId).equals(intervalId);
    });
  });

  describe('.stopRefresh', function () {
    it('stops the interval', function () {
      assume(cache._refresh.intervalId).is.not.null();

      cache.stopRefresh();

      assume(cache._refresh.intervalId).is.null();
    });

    it('doesn\'t error if no interval', function () {
      clearInterval(cache._refresh.intervalId);
      cache._refresh.intervalId = null;

      cache.stopRefresh();
    });
  });

  describe('._refreshCache', function () {

  });
  // describe('.get', function () {
  //   beforeEach(function () {
  //     sendStub = sandbox.stub(wrhs, 'send')
  //       .callsArgWithAsync(2, null, buildData)
  //       .returns(wrhs);
  //   });

  //   it('returns error when no pkg specified', function (done) {
  //     builds = new Builds();
  //     builds.get({ pkg: null }, error => {
  //       assume(error).is.truthy();
  //       assume(error.message).contains('invalid parameters supplied, missing `pkg`');
  //       done();
  //     });
  //   });

  //   it('fetches data from warehouse', function (done) {
  //     builds = new Builds(wrhs);

  //     builds.get({ pkg: 'some-pkg', env: 'prod', version: '1.2.3', meta: 'meta', locale: 'en-NZ' }, (error, data) => {
  //       assume(error).is.falsey();
  //       assume(data).equals(buildData);
  //       assume(sendStub).is.called(1);
  //       assume(sendStub).is.calledWithMatch('builds/some-pkg/prod/1.2.3/meta',
  //         { query: { locale: 'en-NZ' }});
  //       done();
  //     });
  //   });

  //   it('provides defaults', function (done) {
  //     builds = new Builds(wrhs);

  //     builds.get({ pkg: 'some-pkg' }, (error, data) => {
  //       assume(error).is.falsey();
  //       assume(data).equals(buildData);
  //       assume(sendStub).is.called(1);
  //       assume(sendStub).is.calledWithMatch('builds/some-pkg/dev',
  //         { query: { locale: 'en-US' }});
  //       done();
  //     });
  //   });

  //   it('supports scoped packages', function (done) {
  //     builds = new Builds(wrhs);

  //     builds.get({ pkg: '@some-scope/some-pkg' }, (error, data) => {
  //       assume(error).is.falsey();
  //       assume(data).equals(buildData);
  //       assume(sendStub).is.called(1);
  //       assume(sendStub).is.calledWithMatch('builds/%40some-scope%2Fsome-pkg/dev');
  //       done();
  //     });
  //   });

  //   it('passes through error from warehouse', function (done) {
  //     sendStub.restore();
  //     sendStub = sandbox.stub(wrhs, 'send')
  //       .callsArgWithAsync(2, new Error('This is an error.'))
  //       .returns(wrhs);
  //     builds = new Builds(wrhs);

  //     builds.get({ pkg: 'some-pkg' }, error => {
  //       assume(error).is.truthy();
  //       assume(error.message).contains('This is an error.');
  //       assume(sendStub).is.called(1);
  //       done();
  //     });
  //   });

  //   it('fetches data from warehouse each time when no cache', function (done) {
  //     builds = new Builds(wrhs);

  //     builds.get({ pkg: 'some-pkg' }, (error1, data1) => {
  //       assume(error1).is.falsey();
  //       assume(data1).equals(buildData);
  //       assume(sendStub).is.called(1);

  //       builds.get({ pkg: 'some-pkg' }, (error2, data2) => {
  //         assume(error2).is.falsey();
  //         assume(data2).equals(buildData);
  //         assume(sendStub).is.called(2);
  //         done();
  //       });
  //     });
  //   });

  //   it('fetches data from cache when enabled and parameters are the same', function (done) {
  //     builds = new Builds(wrhs, { buildCache: { enabled: true }});

  //     builds.get({ pkg: 'some-pkg' }, (error1, data1) => {
  //       assume(error1).is.falsey();
  //       assume(data1).equals(buildData);
  //       assume(sendStub).is.called(1);

  //       builds.get({ pkg: 'some-pkg' }, (error2, data2) => {
  //         assume(error2).is.falsey();
  //         assume(data2).equals(buildData);
  //         assume(sendStub).is.called(1);
  //         done();
  //       });
  //     });
  //   });

  //   it('fetches data from warehouse when cache is enabled and parameters are the different', function (done) {
  //     builds = new Builds(wrhs, { buildCache: { enabled: true }});

  //     builds.get({ pkg: 'some-pkg', locale: 'en-NZ' }, (error1, data1) => {
  //       assume(error1).is.falsey();
  //       assume(data1).equals(buildData);
  //       assume(sendStub).is.called(1);

  //       builds.get({ pkg: 'some-pkg', locale: 'en-CA' }, (error2, data2) => {
  //         assume(error2).is.falsey();
  //         assume(data2).equals(buildData);
  //         assume(sendStub).is.called(2);
  //         done();
  //       });
  //     });
  //   });

  //   it('fetches data from warehouse when cache is enabled, parameters are the same, but bypassCache specified', function (done) {
  //     builds = new Builds(wrhs, { buildCache: { enabled: true }});

  //     builds.get({ pkg: 'some-pkg' }, (error1, data1) => {
  //       assume(error1).is.falsey();
  //       assume(data1).equals(buildData);
  //       assume(sendStub).is.called(1);

  //       builds.get({ pkg: 'some-pkg', bypassCache: true }, (error2, data2) => {
  //         assume(error2).is.falsey();
  //         assume(data2).equals(buildData);
  //         assume(sendStub).is.called(2);
  //         done();
  //       });
  //     });
  //   });

  //   describe('build cache', function () {
  //     it('caches data on .get', function (done) {
  //       builds = new Builds(wrhs, { buildCache: { enabled: true }});
  //       assume(builds._cache).is.truthy();
  //       assume(builds._cache.size).equals(0);

  //       builds.get({ pkg: 'some-pkg' }, (error, data) => {
  //         assume(error).is.falsey();
  //         assume(data).equals(buildData);
  //         assume(sendStub).is.called(1);
  //         assume(builds._cache).is.truthy();
  //         assume(builds._cache.size).equals(1);
  //         done();
  //       });
  //     });

  //     it('refreshing the cache calls warehouse for each cache entry', function (done) {
  //       builds = new Builds(wrhs, { buildCache: { enabled: true }});

  //       /* eslint-disable no-undefined */
  //       const paramsA = {
  //         type: 'builds',
  //         env: 'dev',
  //         version: undefined,
  //         meta: undefined,
  //         locale: 'en-NZ',
  //         pkg: 'first-package'
  //       };
  //       const cacheKeyA = builds._getHashKey(paramsA);
  //       builds._cache.set(cacheKeyA, Object.assign({}, paramsA, { data: { foo: 1 }}));

  //       const paramsB = {
  //         type: 'builds',
  //         env: 'test',
  //         version: '3.2.1',
  //         meta: undefined,
  //         locale: 'fr-FR',
  //         pkg: 'second-package'
  //       };
  //       const cacheKeyB = builds._getHashKey(paramsB);
  //       builds._cache.set(cacheKeyB, Object.assign({}, paramsB, { data: { bar: 2 }}));
  //       assume(builds._cache.get(cacheKeyA).data).does.not.equals(buildData);
  //       assume(builds._cache.get(cacheKeyB).data).does.not.equals(buildData);
  //       /* eslint-enable no-undefined */

  //       builds._refreshCache();

  //       setTimeout(() => {
  //         assume(sendStub).is.called(2);
  //         assume(sendStub.firstCall).is.calledWithMatch(
  //           'builds/first-package/dev',
  //           { query: { locale: 'en-NZ' }});
  //         assume(sendStub.secondCall).is.calledWithMatch(
  //           'builds/second-package/test/3.2.1',
  //           { query: { locale: 'fr-FR' }});

  //         assume(builds._cache.get(cacheKeyA).data).equals(buildData);
  //         assume(builds._cache.get(cacheKeyB).data).equals(buildData);
  //         done();
  //       }, 1);
  //     });

  //     it('failing to refresh the cache leaves old cache in place', function (done) {
  //       builds = new Builds(wrhs, { buildCache: { enabled: true }});
  //       sendStub.restore();
  //       sendStub = sandbox.stub(wrhs, 'send')
  //         .callsArgWithAsync(2, new Error('This is an error.'))
  //         .returns(wrhs);

  //       /* eslint-disable no-undefined */
  //       const paramsA = {
  //         type: 'builds',
  //         env: 'dev',
  //         version: undefined,
  //         meta: undefined,
  //         locale: 'en-NZ',
  //         pkg: 'first-package'
  //       };
  //       const cacheKeyA = builds._getHashKey(paramsA);
  //       builds._cache.set(cacheKeyA, Object.assign({}, paramsA, { data: { foo: 1 }}));
  //       assume(builds._cache.get(cacheKeyA).data).does.not.equals(buildData);
  //       assume(builds._cache.get(cacheKeyA).data).deep.equals({ foo: 1 });
  //       /* eslint-enable no-undefined */

  //       builds._refreshCache();

  //       setTimeout(() => {
  //         assume(sendStub).is.called(1);
  //         assume(sendStub.firstCall).is.calledWithMatch(
  //           'builds/first-package/dev',
  //           { query: { locale: 'en-NZ' }});

  //         assume(builds._cache.get(cacheKeyA).data).does.not.equals(buildData);
  //         assume(builds._cache.get(cacheKeyA).data).deep.equals({ foo: 1 });
  //         done();
  //       }, 1);
  //     });

  //     it('prevents re-entrancy into refresh', function (done) {
  //       builds = new Builds(wrhs, { buildCache: { enabled: true }});

  //       builds._cache.set('a', { pkg: 'first-pkg', locale: 'en-NZ' });
  //       builds._cache.set('b', { pkg: 'second-pkg', locale: 'en-NZ' });

  //       builds._refreshCache();
  //       builds._refreshCache();

  //       setTimeout(() => {
  //         assume(sendStub).is.called(2);
  //         done();
  //       }, 1);
  //     });

  //     it('refreshing empty cache doesn\'t throw', function (done) {
  //       builds = new Builds(wrhs, { buildCache: { enabled: true }});

  //       builds._refreshCache();

  //       setTimeout(() => {
  //         assume(sendStub.called).is.false();
  //         done();
  //       }, 1);
  //     });

  //     it('refreshing when cache disabled doesn\'t throw', function () {
  //       builds = new Builds(wrhs, { buildCache: { enabled: false }});
  //       assume(builds._cache).does.not.exist();
  //       assume(() => builds._refreshCache()).does.not.throw();
  //     });

  //     it('the cache can be cleared', function () {
  //       builds = new Builds(wrhs, { buildCache: { enabled: true }});
  //       builds._cache.set('a', 'b');
  //       assume(builds._cache.size).equals(1);
  //       builds.clearCache();
  //       assume(builds._cache.size).equals(0);
  //     });

  //     it('clearing the cache when cache disabled doesn\'t throw', function () {
  //       builds = new Builds(wrhs, { buildCache: { enabled: false }});
  //       assume(builds._cache).does.not.exist();
  //       assume(() => builds.clearCache()).does.not.throw();
  //     });

  //     it('refreshInterval>0 results in cache refresh', function () {
  //       builds = new Builds(wrhs, { buildCache: { enabled: true, refreshInterval: 1 }});
  //       assume(builds._cacheRefreshIntervalId).is.not.null();
  //     });

  //     it('refreshInterval===0 results in no cache refresh', function () {
  //       builds = new Builds(wrhs, { buildCache: { enabled: true, refreshInterval: 0 }});
  //       assume(builds._cacheRefreshIntervalId).is.null();
  //     });

  //     it('refreshInterval<0 results in no cache refresh', function () {
  //       builds = new Builds(wrhs, { buildCache: { enabled: true, refreshInterval: -1 }});
  //       assume(builds._cacheRefreshIntervalId).is.null();
  //     });
  //   });
  // });

  // describe('.getFromCache', function () {
  //   it('yields an error if cache is not enabled', function (done) {
  //     builds = new Builds(wrhs, { buildCache: { enabled: false }});

  //     assume(builds._cache).does.not.exist();
  //     builds.getFromCache({ pkg: 'some-pkg' }, error => {
  //       assume(error).is.truthy();
  //       assume(error.message).contains('BuildCache must be enabled to use getFromCache');
  //       done();
  //     });
  //   });

  //   it('yields an error if no package specified', function (done) {
  //     builds = new Builds(wrhs, { buildCache: { enabled: true }});

  //     builds.getFromCache({ pkg: null }, error => {
  //       assume(error).is.truthy();
  //       assume(error.message).contains('invalid parameters supplied, missing `pkg`');
  //       done();
  //     });
  //   });

  //   it('yields falsey when build not in the cache', function (done) {
  //     builds = new Builds(wrhs, { buildCache: { enabled: true }});

  //     builds.getFromCache({ pkg: 'some-pkg' }, (error, data) => {
  //       assume(error).is.falsey();
  //       assume(data).is.falsey();
  //       done();
  //     });
  //   });

  //   it('yields the build when it is cached', function (done) {
  //     builds = new Builds(wrhs, { buildCache: { enabled: true }});

  //     /* eslint-disable no-undefined */
  //     const paramsA = {
  //       type: 'builds',
  //       env: 'dev',
  //       version: undefined,
  //       meta: null,
  //       locale: 'en-NZ',
  //       pkg: 'first-package'
  //     };
  //     const cacheKeyA = builds._getHashKey(paramsA);
  //     builds._cache.set(cacheKeyA, Object.assign({}, paramsA, { data: { foo: 1 }}));
  //     assume(builds._cache.get(cacheKeyA).data).does.not.equals(buildData);
  //     assume(builds._cache.get(cacheKeyA).data).deep.equals({ foo: 1 });
  //     /* eslint-enable no-undefined */

  //     builds.getFromCache({ env: 'dev', locale: 'en-NZ', pkg: 'first-package' }, (error, data) => {
  //       assume(error).is.falsey();
  //       assume(data).is.truthy();
  //       assume(data).deep.equals({ foo: 1 });

  //       done();
  //     });
  //   });

  // });

});
/* eslint-enable max-nested-callbacks */
