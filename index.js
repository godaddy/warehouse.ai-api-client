const debug = require('diagnostics')('warehouse.ai-api-client');
const qs = require('querystringify');
const destroy = require('demolish');
const https = require('https');
const fetch = require('node-fetch');
const retry = require('retryme');
const optOpts = require('optional-options')('options', 'next');
const Builds = require('./builds');
const Verify = require('./verify');
const Assets = require('./assets');
const Packages = require('./packages');
const Status = require('./status');
const ReleaseLine = require('./release-line');

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
  this.statusUri = options.statusUri;
  this.auth = this._normalizeAuth(options.auth);
  this.timeout = options.timeout || 3e4;

  //
  // Defaults to false for now, should default to true as soon as the CA on the
  // warehouse server are fixed.
  //
  this.strictSSL = options.strictSSL || false;
  const httpsAgentOptions = {};
  if (this.strictSSL === false) httpsAgentOptions.rejectUnauthorized = false;
  this.httpsAgent = new https.Agent(httpsAgentOptions);

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
  this.status = new Warehouse.Status(this, options.status);
  this.releaseLine = new Warehouse.ReleaseLine(this, options.releaseLine);
}

/**
 * Normalize possible auth arguments
 * @function _normalizeAuth
 * @param {Object|String} opts - Auth options from constructor
 * @returns {String} to be used for authorization header
 */
Warehouse.prototype._normalizeAuth = function _normalizeAuth(opts) {
  if (!opts) return;
  // Legacy support is if opts is a string, we send it as a bearer token
  if (typeof opts === 'string') return 'Bearer ' + opts;

  if (!opts.type || !opts.token) throw new Error('auth type and token required');

  const type = opts.type.toLowerCase();

  switch (type) {
    case 'basic':
      return `Basic ${opts.encoded ? opts.token : Buffer.from(opts.token, 'utf8').toString('base64')}`;
    case 'bearer':
      return `Bearer ${opts.token}`;
    default:
      throw new Error(`Auth ${opts.type} not supported, options: basic, bearer`);
  }
};

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
 * Proxy method to send requests to the API.
 *
 * Options:
 *
 * - timeout: Request timeout
 * - method: HTTP method.
 * - query: Query (string) Object.
 * - headers: HTTP headers.
 *
 * @param {String} uri The base URI to make the request to.
 * @param {String} pathname Request pathname.
 * @param {Object} options Request configuration.
 * @param {Function} next Completion callback.
 * @returns {Warehouse} fluent interface
 * @public
 */
Warehouse.prototype.makeRequest = function makeRequest(uri, pathname, options, next) {
  ({ options, next } = optOpts(options, next));

  options = Object.assign({
    timeout: this.timeout,
    agent: this.httpsAgent,
    method: 'GET',
    query: {},
    headers: {}
  }, options);

  if (this.auth
    && !options.headers.authorization
    && !options.headers.Authorization) {
    options.headers.authorization = this.auth;
  }
  options.url = [uri].concat(pathname).join('/') + qs.stringify(options.query, true);
  debug('Sending %s request to %s with timeout %d', options.method, options.url, this.timeout);

  //
  // Ignore 404 and 400's when it comes to retries
  //
  const operation = retry.op(this.retry, (err) => {
    return err.message.includes('404')
      || err.message.includes('400');
  });

  operation.attempt(async fn => {
    try {
      const res = await fetch(options.url, options);
      const body = await res.json();

      if (res.statusCode === 404) return fn(new Error(`404 Not Found ${JSON.stringify(body)}`));
      if (res.statusCode === 400) return fn(new Error(`400 Bad Request ${JSON.stringify(body)}`));

      if (res.statusCode < 200 || res.statusCode > 299) return fn(new Error(`Invalid status code ${res.statusCode} ${body ? JSON.stringify(body) : ''}`));

      fn(null, body);
    } catch (err) {
      fn(err);
      return;
    }
  }, next);

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
  return this.makeRequest(this.uri, pathname, options, next);
};

/**
 * Proxy method to send requests to the Warehouse Status API.
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
Warehouse.prototype.sendStatus = function sendStatus(pathname, options, next) {
  return this.makeRequest(this.statusUri, pathname, options, next);
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
Warehouse.Status = Status;
Warehouse.ReleaseLine = ReleaseLine;

//
// Expose the API.
//
module.exports = Warehouse;
