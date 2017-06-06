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

/**
 * Build interface for the Warehouse API.
 *
 * @constructor
 * @param {Warehouse} warehouse Reference to the Warehouse instance.
 * @api public
 */
function Builds(warehouse) {
  this.warehouse = warehouse;
}

/**
 * Get build information.
 *
 * @param {Object} params Parameters that specify pkg, env, version and/or locale.
 * @param {Function} fn Completion callback.
 * @returns {Warehouse} fluent interface.
 * @api public
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

  debug('Build metadata: pkg = %s, env = %s, version = %s', pkg, env, version);
  return this.warehouse.send(
    ['builds'].concat(pkg, env, version, meta).filter(Boolean).join('/'),
    { query: { locale }},
    fn
  );
};

/**
 * Get the set of build heads for the given parameters
 *
 * @param {Object} params Parameters that specify, env and pkg
 * @param {Function} fn Completion callback
 * @returns {Warehouse} fluent interface
 * @api public
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
 * @api public
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
 * @api public
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
