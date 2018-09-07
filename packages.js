const debug = require('diagnostics')('warehouse:packages');

const defaultOptions = {
  cache: {}
};

class Packages {
  /**
   * @constructor
   * @param {Warehouse} warehouse Reference to the Warehouse instance.
   * @param {Object} [options] Packages options object
   * @param {Object} [options.cache] An options object for caching package information
   * @param {boolean} [options.cache.enabled] True if you want to use a cache of package information,
   * False if you want to hit the service every time
   * @param {number} [options.cache.interval] An interval in ms on which the cache should be refreshed. (Defaults to 5 minutes)
   * @public
   */
  constructor(warehouse, options) {
    this.warehouse = warehouse;

    options = Object.assign({}, defaultOptions, options);
    this.cache = new Map();
    this.cache.interval = options.cache.interval || 5 * 60 * 1000;
    this.cache.lastRefresh = 0;
    this.skipCache = !options.cache.enabled;
  }

  /**
   * Get package information for all package
   *
   * @param {boolean} bypassCache Should the cache be bypassed
   * @param {Function} fn Completion callback.
   * @returns {undefined}
   * @private
   */
  _getAllPackages(bypassCache, fn) {
    const cache = this.cache;

    if (this.skipCache || bypassCache || !cache.size || (cache.lastRefresh - Date.now() > cache.interval)) {
      return void this.warehouse.send('packages', function (err, result) {
        if (err) return fn(err);

        cache.lastRefresh = Date.now();
        result.forEach(pkg => {
          debug('Caching package data: pkg = %s', pkg.name);
          cache.set(pkg.name, { data: pkg, lastRefresh: cache.lastRefresh });
        });

        fn(null, result);
      });
    }

    debug('Returning cached package data for all packages');
    fn(null, [...cache.values()].map(item => item.data));
  }

  /**
   * Get package information for a single package
   *
   * @param {string} pkgName The package name
   * @param {boolean} bypassCache Should the cache be bypassed
   * @param {Function} fn Completion callback.
   * @returns {undefined}
   * @private
   */
  _getSinglePackage(pkgName, bypassCache, fn) {
    const cache = this.cache;

    if (this.skipCache || bypassCache || !cache.has(pkgName) || (cache.get(pkgName).lastRefresh - Date.now() > cache.interval)) {
      return void this.warehouse.send(`packages/${encodeURIComponent(pkgName)}`, function (err, pkg) {
        if (err) return fn(err);

        debug('Caching package data: pkg = %s', pkg.name);
        cache.set(pkg.name, { data: pkg, lastRefresh: Date.now() });

        fn(null, pkg);
      });
    }

    debug('Returning cached package data: pkg = %s', pkgName);
    fn(null, cache.get(pkgName).data);
  }

  /**
   * Get package information. Information may be read from the cache if configured.
   *
   * @param {Object} params Parameters that specify pkg
   * @param {Object} params.bypassCache Bypasses cache if enabled
   * @param {Function} fn Completion callback.
   * @returns {Warehouse} fluent interface.
   * @public
   */
  get(params, fn) {
    if (typeof params === 'function' && !fn) {
      fn = params;
      params = {};
    }
    params = params || {};
    const pkg = params.package || params.pkg;

    if (!pkg) {
      this._getAllPackages(params.bypassCache, fn);
    } else {
      this._getSinglePackage(pkg, params.bypassCache, fn);
    }

    return this.warehouse;
  }
}

//
// Expose the Packages API.
//
module.exports = Packages;
