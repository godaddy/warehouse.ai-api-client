const Cache = require('out-of-band-cache');

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

const defaultOptions = {
  cache: {}
};

/**
 * Build interface for the Warehouse API.
 *
 * @class Builds
 */
class Builds {
  /**
   * @constructor
   * @param {Warehouse} warehouse Reference to the Warehouse instance.
   * @param {Object} [options] Builds options object
   * @param {Object} [options.cache] An options object for caching build information
   * @param {boolean} [options.cache.enabled] True if you want to use a cache of build information,
   * False if you want to hit the service every time
   * @param {Object} [options.cache.refresh] Options object for storing information about how to refresh the cache
   * @param {number} [options.cache.refresh.limit] The number of cache entries that can be refreshed simultaneously.
   * @param {number} [options.cache.refresh.interval] An interval in ms on which the cache should be refreshed.
   * If the refresh takes longer than the interval, intervals will be skipped. A non-positive number results in the
   * cache _never_ being refreshed
   * @public
   */
  constructor(warehouse, options) {
    this.warehouse = warehouse;

    options = Object.assign({}, defaultOptions, options);
    this.cache = new Cache({});
    this.skipCache = options.cache.enabled;
  }

  /**
   * Parses the parameters for get calls, normalizing into known names and applying the proper defaults & encodings
   *
   * @param {Object} params Parameters that specify pkg, env, version and/or locale.
   * @returns {Object} The params parsed into `{ env, version, meta, locale, pkg }` with default values applied
   * and `pkg` uri encoded
   * @private
   */
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
      return fn(new Error('invalid parameters supplied, missing `pkg`'));
    }

    const cacheKey = {
      type: 'builds',
      env,
      version,
      meta,
      locale,
      pkg
    };

    this.cache.get(JSON.stringify(cacheKey), { skipCache: this.skipCache && params.bypassCache }, key => {
      return new Promise((resolve, reject) => {
        this._get(JSON.parse(key), (err, data) => {
          if (err) {
            reject(err);
            return;
          }

          debug('Caching build data: pkg = %s, env = %s, version = %s', pkg, env, version);
          resolve(data);
        });
      });
    })
    .then(data => {
      debug('Returning cached build data: pkg = %s, env = %s, version = %s', pkg, env, version);
      fn(null, data.value);
    })
    .catch(fn);
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
      fn
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

    if (!name) {
      return fn(
        new Error('Invalid parameters supplied, missing `pkg`')
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
}

Builds.Cache = Cache;

//
// Expose the Build API.
//
module.exports = Builds;
