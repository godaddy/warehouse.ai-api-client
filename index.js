const debug = require('diagnostics')('warehouse.ai-api-client');
const qs = require('querystringify');
const destroy = require('demolish');
const request = require('request');
const retry = require('retryme');
const Builds = require('./builds');
const Verify = require('./verify');
const Assets = require('./assets');
const Packages = require('./packages');

/**
 * Node.JS API to interact the Warehouse.
 *
 * Options:
 *
 * - uri: URL of the API
 * - timeout: Timeout in ms
 *
 * @constructor
 * @param {Object} options Object with options.
 * @public
 */
function Warehouse(options) {
  debug('Creating instance of API');
  let uri;
  if (typeof options === 'string') {
    uri = options;
    options = {};
    options.uri = uri;
  }

  if (!options.uri) throw new Error('options.uri required');

  options = options || {};
  this.retry = options.retry || {};
  this.uri = options.uri;
  this.auth = options.auth ? 'Bearer ' + options.auth : null;
  this.timeout = options.timeout || 3e4;

  //
  // Defaults to false for now, should default to true as soon as the CA on the
  // warehouse server are fixed.
  //
  this.strictSSL = options.strictSSL || false;

  // Options for verify
  this.conc = options.concurrency || options.conc || 10;
  this.dry = options.dry || false;

  //
  // Special subscriber API to manage subscription lists.
  //
  this.builds = new Warehouse.Builds(this, options.builds);
  this.verifier = new Warehouse.Verify(this);
  this.assets = new Warehouse.Assets(this, options.assets);
  this.packages = new Warehouse.Packages(this, options.packages);
}

/**
 * Publish a package to warehouse
 *
 * @param {Object} params - Options for publish
 * @param {Function} fn - Continutation function to call
 * @returns {Warehouse} instance of Warehouse
 * @public
 */
Warehouse.prototype.publish = function publish(params, fn) {
  const name = params.name || params.pkg;
  const body = params.data;
  const method = 'PUT';

  return this.send(
    [encodeURIComponent(name)],
    { body, method },
    fn
  );
};

/**
 * Verify a given pkg, env combination
 * @param {Object} opts - Options for verify { pkg, env, dry, conc, numFiles }
 * @param {Function} fn - Continuation to call when complete
 * @returns {Warehouse} instance of Warehouse
 * @public
 */
Warehouse.prototype.verify = function v(opts, fn) {
  this.verifier.execute(opts, fn);
  return this;
};

/**
 * Proxy method to send requests to the Warehouse.
 *
 * Options:
 *
 * - timeout: Request timeout
 * - method: HTTP method.
 * - query: Query (string) Object.
 * - headers: HTTP headers.
 *
 * @param {String} pathname Request pathname.
 * @param {Object} options Request configuration.
 * @param {Function} next Completion callback.
 * @returns {Warehouse} fluent interface
 * @public
 */
Warehouse.prototype.send = function send(pathname, options, next) {
  if (typeof options === 'function') {
    next = options;
    options = {};
  }

  options = Object.assign({
    timeout: this.timeout,
    strictSSL: this.strictSSL,
    method: 'GET',
    json: true,
    query: {},
    headers: {}
  }, options);

  if (this.auth
    && !options.headers.authorization
    && !options.headers.Authorization) {
    options.headers.authorization = this.auth;
  }
  options.url = [this.uri].concat(pathname).join('/') + qs.stringify(options.query, true);
  debug('Sending %s request to %s with timeout %d', options.method, options.url, this.timeout);

  //
  // Ignore 404 and 400's when it comes to retries
  //
  const operation = retry.op(this.retry, (err) => {
    return err.message.includes('404')
      || err.message.includes('400');
  });

  operation.attempt(fn => {
    request(options, function replied(error, response, body) {
      if (error) return fn(error);

      if (response.statusCode === 404) return fn(new Error(`404 Not Found ${JSON.stringify(body)}`));
      if (response.statusCode === 400) return fn(new Error(`400 Bad Request ${JSON.stringify(body)}`));

      if (response.statusCode < 200 || response.statusCode > 299) return fn(new Error(`Invalid status code ${response.statusCode} ${body ? JSON.stringify(body) : ''}`));

      fn(null, body);
    });
  }, next);


  return this;
};

/**
 * Destroy the warehouse instance.
 *
 * @returns {Boolean}
 * @public
 */
Warehouse.prototype.destroy = destroy('send, builds', 'publish', 'verify');

//
// Expose the extra classes on the Warehouse class.
//
Warehouse.Builds = Builds;
Warehouse.Verify = Verify;
Warehouse.Assets = Assets;
Warehouse.Packages = Packages;

//
// Expose the API.
//
module.exports = Warehouse;
