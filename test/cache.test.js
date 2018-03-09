const sinon = require('sinon');
const assume = require('assume');
const Cache = require('../cache');

assume.use(require('assume-sinon'));

describe('Cache', function () {
  let sandbox;
  let cache;
  let refreshCount = 0;

  beforeEach(function () {
    cache = null;
    refreshCount = 0;
    sandbox = sinon.sandbox.create();
    cache = new Cache(refreshData);
  });

  afterEach(function () {
    sandbox.restore();
    if (cache) {
      cache.stopRefresh();
    }
  });

  function instantRefresh(params, fn) {
    fn(null, refreshCount++);
  }

  function refreshData(params, fn) {
    setImmediate(() => {
      fn(null, refreshCount++);
    });
  }

  function refreshFailure(params, fn) {
    setImmediate(() => {
      refreshCount++;
      fn(new Error('oops'));
    });
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
    it('returns undefined for non-cached content', function () {
      const result = cache.get({ i: 'don\'t', exist: false });
      assume(result).is.a('undefined');
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
    it('doesn\'t error when empty', function (done) {
      cache._refreshCache(() => {
        done();
      });
    });

    it('refreshes an item', function (done) {
      const item1 = { a: 1 };
      cache.set(item1, -1);
      assume(cache.get(item1)).equals(-1);

      cache._refreshCache(() => {
        assume(refreshCount).equals(1);
        assume(cache.get(item1)).equals(0);
        done();
      });
    });

    it('refreshes multiple items', function (done) {
      const item1 = { a: 1 };
      const item2 = { b: 2 };
      cache.set(item1, -1);
      cache.set(item2, -2);
      assume(cache.get(item1)).equals(-1);
      assume(cache.get(item2)).equals(-2);

      cache._refreshCache(() => {
        assume(refreshCount).equals(2);
        assume(cache.get(item1)).equals(0);
        assume(cache.get(item2)).equals(1);
        done();
      });
    });

    it('prevents reentrancy', function (done) {
      const item1 = { a: 1 };
      cache.set(item1, -1);
      assume(cache.get(item1)).equals(-1);
      let wasCalled = false;

      cache._refreshCache(() => {
        assume(refreshCount).equals(1);
        assume(cache.get(item1)).equals(0);
        assume(wasCalled).is.true();
        done();
      });
      cache._refreshCache(() => {
        wasCalled = true;
        assume(cache.get(item1)).equals(-1);
      });
    });

    it('leaves cache alone when refreshing an item fails', function (done) {
      cache.stopRefresh();
      cache = new Cache(refreshFailure);
      const item1 = { a: 1 };
      cache.set(item1, -1);
      assume(cache.get(item1)).equals(-1);

      cache._refreshCache(() => {
        assume(refreshCount).equals(1);
        assume(cache.get(item1)).equals(-1);
        done();
      });
    });

    it('can be called with no callback', function () {
      cache.stopRefresh();
      cache = new Cache(instantRefresh);
      const item1 = { a: 1 };
      cache.set(item1, -1);
      assume(cache.get(item1)).equals(-1);

      cache._refreshCache();

      assume(refreshCount).equals(1);
      assume(cache.get(item1)).equals(0);
    });
  });
});
