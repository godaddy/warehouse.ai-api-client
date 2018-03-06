const { clearInterval, setInterval } = require('timers');
const crypto = require('crypto');
const async = require('async');

const debug = require('diagnostics')('warehouse:builds');
const environments = new Map([
  ['development', 'dev'],
  ['dev', 'dev'],
  ['staging', 'test'],
  ['testing', 'test'],
  ['test', 'test'],
  ['production', 'prod'],
  ['dist', 'prod'],
  ['prod', 'prod']
]);
const defaultCacheRefreshInterval = 20 * 60 * 60 * 1000;
const defaultCacheRefreshLimit = 10;

/**
 * Build interface for the Warehouse API.
 *
 * @class Builds
 */
class Builds {
  /**
   * @constructor
   * @param {Warehouse} warehouse Reference to the Warehouse instance.
   * @param {Object} [options] Warehouse options object
   * @param {Object} [options.buildCache] An options object for caching build information
   * @param {boolean} [options.buildCache.enabled] True if you want to use a cache of build information,
   * False if you want to hit the service every time
   * @param {number} [options.buildCache.refreshLimit] How many cache entries can be refreshed at once
   * @param {number} [options.buildCache.refreshInterval] An interval in ms on which the cache should be refreshed.
   * If the refresh takes longer than the interval, intervals will be skipped. A non-positive number results in the
   * cache _never_ being refreshed
   * @public
   */
  constructor(warehouse, options) {
    this.warehouse = warehouse;
    this._cacheRefreshIntervalId = null;

    options = options || {};
    if (options.buildCache && options.buildCache.enabled) {
      this._refreshCache = this._refreshCache.bind(this);

      /**
       * @member {Map} cache The build cache
       * @private
       */
      this._cache = new Map();

      /**
       * @member {number} _cacheRefreshLimit The number of cache entries that can be simultaneously refreshed
       * @private
       */
      this._cacheRefreshLimit = options.buildCache.refreshLimit || defaultCacheRefreshLimit;

      /**
       * @member {number} _cacheRefreshInterval The interval in ms on which the cache is refreshed refreshed
       * @private
       */
      this._cacheRefreshInterval = (options.buildCache.refreshInterval || options.buildCache.refreshInterval === 0) ?
        options.buildCache.refreshInterval :
        defaultCacheRefreshInterval;
      this.resumeCacheRefresh();
    }
  }

  /**
   * Clears the build cache if one exists
   *
   * @public
   */
  clearCache() {
    if (this._cache) {
      this._cache.clear();
    }
  }

  /**
   * Allows you to resume the process of refreshing the build cache
   *
   * @public
   */
  resumeCacheRefresh() {
    if (this._cacheRefreshIntervalId === null && this._cacheRefreshInterval > 0) {
      this._cacheRefreshIntervalId = setInterval(
        this._refreshCache,
        this._cacheRefreshInterval);
    }
  }



  /**
   * Allows you to stop the process of refreshing the build cache
   *
   * @public
   */
  stopCacheRefresh() {
    if (this._cacheRefreshIntervalId !== null) {
      clearInterval(this._cacheRefreshIntervalId);
      this._cacheRefreshIntervalId = null;
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

    if (this._cacheRefreshing) {
      debug('Skipping a build cache refresh interval, previous interval took too long.');
      return;
    }

    this._cacheRefreshing = true;

    // TODO: leave the cache alone, go fetch new data and replace.
    async.eachLimit(this._cache.values(), this._cacheRefreshLimit, (build, next) => {
      this._get(build, error => {
        if (error) {
          const { pkg, env, version } = build;
          debug('Error refreshing cache for: pkg = %s, env = %s, version = %s', pkg, env, version);
          // Swallow cache refresh error, continue serving up the stale data as its better than nothing
        }
        next(null);
      });
    }, error => {
      this._cacheRefreshing = false;
      debug('Error refreshing cache: %s', error);
    });
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

  _readParams(params) {
    const env = environments.get(params.environment || params.env) || 'dev';
    const version = params.v || params.version;
    const meta = params.meta ? 'meta' : null;
    const locale = params.locale || 'en-US';
    let pkg = params.package || params.pkg;
    if (pkg) {
      //
      // Handle scoped packages
      //
      pkg = encodeURIComponent(pkg);
    }
    return { env, version, meta, locale, pkg };
  }

  getFromCache(params, fn) {
    if (!this._cache) {
      return fn(
        new Error('BuildCache must be enabled to use getFromCache')
      );
    }

    const { env, version, meta, locale, pkg } = this._readParams(params);

    if (!pkg) {
      return fn(
        new Error('invalid parameters supplied, missing `pkg`')
      );
    }

    const cacheKey = this._getHashKey({
      type: 'builds',
      env,
      version,
      meta,
      locale,
      pkg
    });

    const build = this._cache.get(cacheKey);
    fn(null, build && build.data || null);
    return this.warehouse;
  }

  /**
   * Get build information. Build information may be read from the cache if configured.
   *
   * @param {Object} params Parameters that specify pkg, env, version and/or locale.
   * @param {Function} fn Completion callback.
   * @returns {Warehouse} fluent interface.
   * @public
   */
  get(params, fn) {
    const { env, version, meta, locale, pkg } = this._readParams(params);

    if (!pkg) {
      return fn(
        new Error('invalid parameters supplied, missing `pkg`')
      );
    }

    if (this._cache && !params.bypassCache) {
      const cacheKey = this._getHashKey({
        type: 'builds',
        env,
        version,
        meta,
        locale,
        pkg
      });

      const build = this._cache.get(cacheKey);
      if (build) {
        debug('Returning cached build data: pkg = %s, env = %s, version = %s', pkg, env, version);
        fn(null, build.data);
        return this.warehouse;
      }
    }

    return this._get({ pkg, env, version, meta, locale }, fn);
  }

  /**
   * Get build information. The cache is never used. This method assumes all the parameters have already been validated.
   *
   * @param {Object} options Options object describing the build to get
   * @param {string} options.pkg The package name
   * @param {string} options.env The environment
   * @param {string} options.version The version
   * @param {string} options.meta 'meta' or null
   * @param {string} options.locale The locale
   * @param {Function} fn Completion callback.
   * @returns {Warehouse} fluent interface.
   * @private
   */
  _get({ pkg, env, version, meta, locale }, fn) {
    debug('Build metadata: pkg = %s, env = %s, version = %s', pkg, env, version);
    return this.warehouse.send(
      ['builds'].concat(pkg, env, version, meta).filter(Boolean).join('/'),
      { query: { locale }},
      (err, data) => {
        if (err) {
          fn(err, data);
          return;
        }

        if (this._cache) {
          debug('Caching build data: pkg = %s, env = %s, version = %s', pkg, env, version);
          const cacheKey = this._getHashKey({
            type: 'builds',
            env,
            version,
            meta,
            locale,
            pkg
          });
          this._cache.set(cacheKey, {
            pkg,
            env,
            version,
            meta,
            locale,
            data
          });
        }

        fn(err, data);
      }
    );
  }

  /**
   * Get the set of build heads for the given parameters
   *
   * @param {Object} params Parameters that specify, env and pkg
   * @param {Function} fn Completion callback
   * @returns {Warehouse} fluent interface
   * @public
   */
  heads(params, fn) {
    const env = environments.get(params.environment || params.env) || 'dev';
    const name = params.package || params.pkg;

    if (!name || !env) {
      return fn(
        new Error('Invalid parameters supplied, missing `pkg` or `env`')
      );
    }

    const query = { env, name };

    debug('Build metadata: pkg = %s, env = %s', name, env);
    return this.warehouse.send(
      ['builds', '-', 'head'].join('/'),
      { query },
      fn
    );
  }

  /**
   * Get build information from the meta route.
   *
   * @param {Object} params Parameters that specify pkg, env, version and/or locale.
   * @param {Function} fn Completion callback.
   * @returns {Warehouse} fluent interface.
   * @public
   */
  meta(params, fn) {
    params.meta = !!params.meta || false;
    return this.get(params, fn);
  }

  /**
   * Cancel specified build.
   *
   * @param {Object} params Parameters that specify pkg, env,  and/or version
   * @param {Function} fn Completion callback.
   * @returns {Warehouse} fluent interface.
   * @public
   */
  cancel(params, fn) {
    const env = params.environment || params.env || 'dev';
    const version = params.v || params.version;
    const pkg = params.package || params.pkg;

    debug('Cancelling builds for: pkg = %s, env = %s, version = %s', pkg, env, version);
    return this.warehouse.send(
      ['builds', 'cancel'].concat(pkg, version, env).filter(Boolean).join('/'),
      fn
    );
  }

}


//
// Expose the Build API.
//
module.exports = Builds;
