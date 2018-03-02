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
 * Generate md5 hash to be used as caching key.
 *
 * @param {Object} options Properties to generate key from.
 * @returns {string} Unique identifier.
 * @private
 */
function hash(options) {
  return crypto
    .createHash('md5')
    .update(JSON.stringify(options))
    .digest('hex');
}

/**
 * Refreshes the build cache.
 *
 * @param {number} asyncLimit How many cache entries can be refreshed at the same time
 * @private
 */
function _refreshCache(asyncLimit) {
  if (!this.cache || this.cacheRefreshing) {
    return;
  }

  this.cacheRefreshing = true;

  // TODO: leave the cache alone, go fetch new data and replace.
  async.eachLimit(this.cache.values, asyncLimit, (build, next) => {
    this._get(this, build, error => {
      if (error) {
        const { pkg, env, version } = build;
        debug('Error refreshing cache for: pkg = %s, env = %s, version = %s', pkg, env, version);
        // Swallow cache refresh error, continue serving up the stale data as its better than nothing
      }
      next(null);
    });
  }, error => {
    this.cacheRefreshing = false;
    debug('Error refreshing cache: %s', error);
  });
}

/**
 * Build interface for the Warehouse API.
 *
 * @constructor
 * @param {Warehouse} warehouse Reference to the Warehouse instance.
 * @param {Object} [options] Warehouse options object
 * @param {Object} [options.buildCache] An options object for caching build information
 * @param {boolean} [options.buildCache.enabled] True if you want to use a cache of build information,
 * False if you want to hit the service every time
 * @param {number} [options.buildCache.refreshInterval] An interval in ms on which the cache should be refreshed
 * @param {number} [options.buildCache.refreshLimit] How many cache entries can be refreshed at once
 * @public
 */
function Builds(warehouse, options) {
  this.warehouse = warehouse;
  this.refreshInterval = null;

  options = options || {};
  if (options.buildCache && options.buildCache.enabled) {
    this.cache = new Map();
    this.cacheRefreshLimit = options.buildCache.refreshLimit || defaultCacheRefreshLimit;
    this.cacheRefreshInterval = options.buildCache.refreshInterval || defaultCacheRefreshInterval;
    this.resumeCacheRefresh();
  }
}

/**
 * Clears the build cache if one exists
 */
Builds.prototype.clearCache = function clearCache() {
  if (this.cache) {
    this.cache.clear();
  }
};

/**
 * Allows you to resume the process of refreshing the build cache
 */
Builds.prototype.resumeCacheRefresh = function resumeCacheRefresh() {
  if (this.refreshInterval !== null) {
    this.refreshInterval = setInterval(
      _refreshCache.bind(this, this.cacheRefreshLimit),
      this.cacheRefreshInterval);
  }
};

/**
 * Allows you to stop the process of refreshing the build cache
 */
Builds.prototype.stopCacheRefresh = function stopCacheRefresh() {
  if (this.refreshInterval !== null) {
    clearInterval(this.refreshInterval);
    this.refreshInterval = null;
  }
};

/**
 * Get build information. Build information may be read from the cache if configured.
 *
 * @param {Object} params Parameters that specify pkg, env, version and/or locale.
 * @param {Function} fn Completion callback.
 * @returns {Warehouse} fluent interface.
 * @public
 */
Builds.prototype.get = function get(params, fn) {
  const env = environments.get(params.environment || params.env) || 'dev';
  const version = params.v || params.version;
  const meta = params.meta ? 'meta' : null;
  const locale = params.locale || 'en-US';
  let pkg = params.package || params.pkg;

  if (!pkg || !env) {
    return fn(
      new Error('invalid parameters supplied, missing `pkg` or `env`')
    );
  }

  //
  // Handle scoped packages
  //
  pkg = encodeURIComponent(pkg);

  if (this.cache && !params.bypassCache) {
    const cacheKey = hash({
      type: 'builds',
      env,
      version,
      meta,
      locale,
      pkg
    });

    const build = this.cache.get(cacheKey);
    if (build) {
      debug('Returning cached build data: pkg = %s, env = %s, version = %s', pkg, env, version);
      fn(null, build.data);
      return this.warehouse;
    }
  }

  return _get(this, { pkg, env, version, meta, locale }, fn);
};

/**
 * Get build information. The cache is never used. This method assumes all the parameters have already been validated.
 *
 * @param {Builds} that The Builds object this call is being made for
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
function _get(that, { pkg, env, version, meta, locale }, fn) {
  debug('Build metadata: pkg = %s, env = %s, version = %s', pkg, env, version);
  return that.warehouse.send(
    ['builds'].concat(pkg, env, version, meta).filter(Boolean).join('/'),
    { query: { locale }},
    (err, data) => {
      if (err) {
        fn(err, data);
        return;
      }

      if (that.cache) {
        debug('Caching build data: pkg = %s, env = %s, version = %s', pkg, env, version);
        const cacheKey = hash({
          type: 'builds',
          env,
          version,
          meta,
          locale,
          pkg
        });
        that.cache.set(cacheKey, {
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
Builds.prototype.heads = function heads(params, fn) {
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
};

/**
 * Get build information from the meta route.
 *
 * @param {Object} params Parameters that specify pkg, env, version and/or locale.
 * @param {Function} fn Completion callback.
 * @returns {Warehouse} fluent interface.
 * @public
 */
Builds.prototype.meta = function (params, fn) {
  params.meta = !!params.meta || false;
  return this.get(params, fn);
};

/**
 * Cancel specified build.
 *
 * @param {Object} params Parameters that specify pkg, env, version and/or locale.
 * @param {Function} fn Completion callback.
 * @returns {Warehouse} fluent interface.
 * @public
 */
Builds.prototype.cancel = function cancel(params, fn) {
  const env = params.environment || params.env || 'dev';
  const version = params.v || params.version;
  const pkg = params.package || version.pkg;

  debug('Cancelling builds for: pkg = %s, env = %s, version = %s', pkg, env, version);
  return this.warehouse.send(
    ['builds', 'cancel'].concat(pkg, version, env).filter(Boolean).join('/'),
    fn
  );
};

//
// Expose the Build API.
//
module.exports = Builds;
