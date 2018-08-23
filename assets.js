const Cache = require('out-of-band-cache');

const debug = require('diagnostics')('warehouse:assets');
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

class Assets {
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
    this.cache = new Cache(options.cache);
    this.skipCache = !options.cache.enabled;
  }

  /**
   * Parses the parameters for get calls, normalizing into known names and applying the proper defaults & encodings
   *
   * @param {Object} params Parameters that specify pkg, env, version and/or locale.
   * @returns {Object} The params parsed into `{ env, version, locale, pkg, filter }` with default values applied
   * and `pkg` uri encoded
   * @private
   */
  _readParams(params) {
    const env = environments.get(params.environment || params.env) || 'dev';
    const version = params.v || params.version;
    const locale = params.locale || 'en-US';

    let pkg = params.package || params.pkg;
    if (pkg) {
      //
      // Handle scoped packages
      //
      pkg = encodeURIComponent(pkg);
    }

    let filter = params.filter;
    if (filter) {
      filter = encodeURIComponent(filter);
    }
    return { env, version, locale, pkg, filter };
  }

  /**
   * Get asset information. Build information may be read from the cache if configured.
   *
   * @param {Object} params Parameters that specify pkg, env, version and/or locale.
   * @param {Function} fn Completion callback.
   * @returns {Warehouse} fluent interface.
   * @public
   */
  get(params, fn) {
    const { env, version, locale, pkg, filter } = this._readParams(params);

    if (!pkg) {
      return fn(new Error('invalid parameters supplied, missing `pkg`'));
    }

    const cacheKey = {
      type: 'assets',
      env,
      version,
      locale,
      pkg,
      filter
    };

    this.cache.get(JSON.stringify(cacheKey), { skipCache: this.skipCache || params.bypassCache }, key => {
      return new Promise((resolve, reject) => {
        this._get(JSON.parse(key), (err, data) => {
          if (err) {
            reject(err);
            return;
          }

          debug('Caching asset data: pkg = %s, env = %s, version = %s', pkg, env, version);
          resolve(data);
        });
      });
    })
      .then(data => {
        debug('Returning cached asset data: pkg = %s, env = %s, version = %s', pkg, env, version);
        fn(null, data.value);
      })
      .catch(fn);

    return this.warehouse;
  }

  /**
   * Get asset information. The cache is never used. This method assumes all the parameters have already been validated.
   *
   * @param {Object} options Options object describing the build to get
   * @param {string} options.pkg The package name
   * @param {string} options.env The environment
   * @param {string} options.version The version
   * @param {string} options.locale The locale
   * @param {Function} fn Completion callback.
   * @returns {Warehouse} fluent interface.
   * @private
   */
  _get({ pkg, env, version, locale, filter }, fn) {
    debug('Build metadata: pkg = %s, env = %s, version = %s', pkg, env, version, filter);
    return this.warehouse.send(
      ['assets', 'files'].concat(pkg, env, version).filter(Boolean).join('/'),
      { query: { locale, filter }},
      fn
    );
  }
}

Assets.Cache = Cache;

//
// Expose the Build API.
//
module.exports = Assets;
