const debug = require('diagnostics')('warehouse:status');
const optOpts = require('optional-options')('params', 'fn');

class Status {
  /**
   * @constructor
   * @param {Warehouse} warehouse Reference to the Warehouse instance.
   * @public
   */
  constructor(warehouse) {
    this.warehouse = warehouse;
  }

  getFromStatusApi(path = 'status', params, fn) {
    ({ params = {}, fn } = optOpts(params, fn));

    const pkg = params.package || params.pkg;
    const { env, version } = params;

    if (!pkg) {
      return fn(new Error('Invalid parameters supplied, missing `pkg`'));
    }
    if (!env) {
      return fn(new Error('Invalid parameters supplied, missing `env`'));
    }

    debug('Returning %s data for %s %s %s', path, pkg, env, version);
    this.warehouse.sendStatus(
      [path, pkg && encodeURIComponent(pkg), env, version].filter(Boolean).join('/'),
      fn
    );

    return this.warehouse;
  }

  /**
   * Get build status information.
   *
   * @param {Object} params Parameters that specify the package to get status information about
   * @param {string} params.pkg A specific package name to get information about
   * @param {string} params.package A specific package name to get information about
   * @param {string} params.env The enviornment to get information about
   * @param {string} [params.version] A specific version to get information about
   * @param {Function} fn Completion callback.
   * @returns {Warehouse} fluent interface.
   * @public
   */
  get(params, fn) {
    return this.getFromStatusApi('status', params, fn);
  }

  /**
   * Get status events
   *
   * @param {Object} params Parameters that specify the package to get status events for
   * @param {string} params.pkg A specific package name to get events for
   * @param {string} params.package A specific package name to get events for
   * @param {string} params.env The enviornment to get events for
   * @param {string} [params.version] A specific version to get events for
   * @param {Function} fn Completion callback.
   * @returns {Warehouse} fluent interface.
   * @public
   */
  events(params, fn) {
    return this.getFromStatusApi('status-events', params, fn);
  }

  /**
   * Gets the build progress
   *
   * @param {Object} params Parameters that specify the package to get status events for
   * @param {string} params.pkg A specific package name to get events for
   * @param {string} params.package A specific package name to get events for
   * @param {string} params.env The enviornment to get events for
   * @param {string} [params.version] A specific version to get events for
   * @param {Function} fn Completion callback.
   * @returns {Warehouse} fluent interface.
   * @public
   */
  progress(params, fn) {
    return this.getFromStatusApi('progress', params, fn);
  }
}

//
// Expose the Status API.
//
module.exports = Status;
