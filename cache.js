const crypto = require('crypto');
const async = require('async');

const debug = require('diagnostics')('warehouse:cache');
const defaultOptions = { refresh: {}};
const defaultRefreshOptions = {
  interval: 20 * 60 * 60 * 1000,
  intervalId: null,
  limit: 10
};

/**
 * Cache API for warehouse, used for `Builds.get`
 *
 * @class Cache
 */
class Cache {
  /**
   * Constructor for the cache object
   *
   * @constructor
   * @param {Function} getData Function that accepts the params from a cache entry and a callback that
   * will return a refreshed entry for the cache.
   * This will end up being called when a cache entry is refreshed
   * @param {Object} [options] Options object for the cache
   * @param {Object} [options.refresh] Options object for information about refreshing the cache
   * @param {Number} [options.refresh.interval] How long in ms between cache refreshes
   * @param {Number} [options.refresh.limit] How many items in the cache should be refreshed simultaneously
   * @public
   */
  constructor(getData, options) {
    this._getData = getData;
    options = Object.assign({}, defaultOptions, options);
    this._refresh = Object.assign({}, defaultRefreshOptions, options.refresh);
    this._refreshCache = this._refreshCache.bind(this);

    /**
     * @member {Map} cache The raw cache
     * @private
     */
    this._cache = new Map();
    this.resumeCacheRefresh();
  }

  /**
   * Clears the build cache if one exists
   *
   * @public
   */
  clear() {
    if (this._cache) {
      this._cache.clear();
    }
  }

  /**
   * Allows you to resume the process of refreshing the cache
   *
   * @public
   */
  resumeRefresh() {
    if (this._refresh.intervalId === null && this._refresh.interval > 0) {
      this._refresh.intervalId = setInterval(
        this._refreshCache,
        this._refresh.interval);
    }
  }

  /**
   * Allows you to stop the process of refreshing the cache
   *
   * @public
   */
  stopRefresh() {
    if (this._refresh.intervalId !== null) {
      clearInterval(this._refresh.intervalId);
      this._refresh.intervalId = null;
    }
  }

  /**
   * Refreshes the build cache.
   *
   * @private
   */
  _refreshCache() {
    if (!this._cache) {
      return;
    }

    if (this._refreshing) {
      debug('Skipping a build cache refresh interval, previous interval took too long.');
      return;
    }

    this._refreshing = true;

    async.eachLimit(this._cache.values(), this._refresh.limit, (build, next) => {
      this._refreshOne(build.params, (error, data) => {
        if (error) {
          debug('Error refreshing cache for: %s', build.params);
          // Swallow cache refresh error, continue serving up the stale data as its better than nothing
          next();
          return;
        }

        this.set(build.params, data);
        next();
      });
    }, () => {
      this._refreshing = false;
    });
  }

  /**
   * Generate md5 hash to be used as caching key.
   *
   * @param {Object} options Properties to generate key from.
   * @returns {string} Unique identifier.
   * @public
   */
  getHashKey(options) {
    return crypto
      .createHash('md5')
      .update(JSON.stringify(options))
      .digest('hex');
  }

  get(params) {
    const cacheKey = this.getHashKey(params);
    const build = this._cache.get(cacheKey);
    return build && build.data || null;
  }

  set(params, data) {
    const cacheKey = this.getHashKey(params);
    this._cache.set(cacheKey, { params: params, data: data });
  }
}

//
// Expose the Cache API.
//
module.exports = Cache;
