const debug = require('diagnostics')('warehouse:release-line');

class ReleaseLine {
  /**
   * @constructor
   * @param {Warehouse} warehouse Reference to the Warehouse instance.
   * @public
   */
  constructor(warehouse) {
    this.warehouse = warehouse;
  }

  /**
   * Get release-line information. Information may be read from the cache if configured.
   *
   * @param {Object} params Parameters that specify pkg
   * @param {string} params.pkg A specific package name to get the release line for
   * @param {string} [params.version] A specific version to get the release line for, latest if not specified
   * @param {Function} fn Completion callback.
   * @returns {Warehouse} fluent interface.
   * @public
   */
  get({ pkg, version }, fn) {
    debug('Returning release-line data for %s@%s', pkg, version || 'latest');
    this.warehouse.send(
      [
        'release-line',
        encodeURIComponent(pkg),
        version && encodeURIComponent(version)
      ].filter(Boolean).join('/'),
      fn
    );

    return this.warehouse;
  }
}

//
// Expose the Packages API.
//
module.exports = ReleaseLine;
