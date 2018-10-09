const debug = require('diagnostics')('warehouse:packages');

class Packages {
  /**
   * @constructor
   * @param {Warehouse} warehouse Reference to the Warehouse instance.
   * @public
   */
  constructor(warehouse) {
    this.warehouse = warehouse;
  }

  /**
   * Get package information. Information may be read from the cache if configured.
   *
   * @param {Object} params Parameters that specify pkg
   * @param {string} params.pkg A specific package name to get information about
   * @param {string} params.package A specific package name to get information about
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

    debug('Returning package data for %s', pkg || 'all packages');
    this.warehouse.send(
      ['packages', pkg && encodeURIComponent(pkg)].filter(Boolean).join('/'),
      fn
    );

    return this.warehouse;
  }
}

//
// Expose the Packages API.
//
module.exports = Packages;
