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
   * @param {Function} refreshOne Function that accepts the params from a cache entry and a callback that
   * will return a refreshed entry for the cache. This will end up being called when a cache entry is
   * refreshed
   * @param {Object} [options] Options object for the cache
   * @param {Object} [options.refresh] Options object for information about refreshing the cache
   * @param {Number} [options.refresh.interval] How long in ms between cache refreshes
   * @param {Number} [options.refresh.limit] How many items in the cache should be refreshed simultaneously
   * @public
   */
  constructor(refreshOne, options) {
    this._refreshOne = refreshOne;
    options = Object.assign({}, defaultOptions, options);
    this._refresh = Object.assign({}, defaultRefreshOptions, options.refresh);
    this._refreshCache = this._refreshCache.bind(this);

    /**
     * @member {Map} cache The raw cache
     * @private
     */
    this._cache = new Map();
    this.resumeRefresh();
  }

  /**
   * Clears the build cache if one exists
   *
   * @public
   */
  clear() {
    this._cache.clear();
  }

  /**
   * Generate md5 hash to be used as caching key.
   *
   * @param {Object} options Properties to generate key from.
   * @returns {string} Unique identifier.
   * @private
   */
  _getHashKey(options) {
    return crypto
      .createHash('md5')
      .update(JSON.stringify(options))
      .digest('hex');
  }

  /**
   * Gets a cache entry
   *
   * @param {Object} params The parameters for the cache entry that should be retrieved
   * @returns {*} The data that was stored for the cache entry, if no entry, this will return undefined
   * @public
   */
  get(params) {
    const cacheKey = this._getHashKey(params);
    const raw = this._cache.get(cacheKey);
    return raw && raw.data;
  }

  /**
   * Sets a cache entry
   *
   * @param {Object} params The parameters for the cache entry that should be stored.  This should
   * be enough data for a cache entry to be refreshed.
   * @param {*} data The data for the cache entry
   * @public
   */
  set(params, data) {
    const cacheKey = this._getHashKey(params);
    this._cache.set(cacheKey, { params: params, data: data });
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
   * @param {Function} [fn] An optional callback when refreshing is complete
   * @private
   */
  _refreshCache(fn = () => {}) {
    if (this._refreshing) {
      debug('Skipping a build cache refresh interval, previous interval took too long.');
      fn();
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
      fn();
    });
  }
}

//
// Expose the Cache API.
//
module.exports = Cache;
