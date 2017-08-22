const debug = require('diagnostics')('warehouse');
const qs = require('querystringify');
const destroy = require('demolish');
const request = require('request');
const Builds = require('./builds');
const retry = require('retryme');

/**
 * Node.JS API to interact the Warehouse.
 *
 * Options:
 *
 * - apiUrl: URL of the API
 * - timeout: Timeout in ms
 *
 * @constructor
 * @param {Object} options Object with options.
 * @api public
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

  //
  // Special subscriber API to manage subscription lists.
  //
  this.builds = new Builds(this);
}

/**
 * Publish a package to warehouse
 *
 * @param {Object} params - Options for publish
 * @param {Function} fn - Continutation function to call
 * @returns {Warehouse} instance of Warehouse
 * @api public
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
 * @api public
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
 * @api public
 */
Warehouse.prototype.destroy = destroy('send, builds');

//
// Expose the extra classes on the Warehouse class.
//
Warehouse.Builds = Builds;

//
// Expose the API.
//
module.exports = Warehouse;
