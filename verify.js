const debug = require('diagnostics')('warehouse.ai-api-client:verify');
const https = require('https');
const nodeFetch = require('node-fetch');
const fetch = require('fetch-retry')(nodeFetch, {
  retries: 3,
  retryDelay: 1000
});
const async = require('async');
const url = require('url');

class Verify {
  constructor(wrhs) {
    this.wrhs = wrhs;
    this.conc = wrhs.conc || 10;
    this.dry = wrhs.dry;
    const httpsAgentOptions = {};
    if (wrhs.strictSSL === false) httpsAgentOptions.rejectUnauthorized = false;
    this.httpsAgent = new https.Agent(httpsAgentOptions);
  }

  /**
   * @typedef {Object} VerificationFailure
   * @prop {string} [buildId] ID of build being verified
   * @prop {string} [uri] URI of file that failed
   * @prop {string} reason Reason for failure
   */
  /**
   * Fetches all files from one of the builds
   * @param {VerifyOptions} opts Options for the function
   * @param {BuildHead} head BuildHead returned from Warehouse.
   * @param {async.AsyncResultArrayCallback<VerificationFailure>} done Continuation to respond to when complete.
   */
  verifyOne(opts, head, done) {
    const buildId = head.buildId;
    const dry = opts.dry || this.dry;
    const numFiles = opts.numFiles;

    function normalizeUrl(file) {
      return url.resolve(head.cdnUrl, file);
    }
    const urls = head.recommended.length
      ? head.recommended.map(normalizeUrl)
      : head.artifacts.map(normalizeUrl);

    if (dry) {
      debug(`Dry: Skip verify assets for ${head.buildId}`);
      done(null, []);
      return;
    }

    if (numFiles) {
      let reason = `Expect number of files in head ${urls.length} to equal ${numFiles}\nFound the following files:\n`;
      reason += urls.join('\n');
      debug(reason);
      if (numFiles > urls.length) {
        done(null, [{ reason }]);
        return;
      }
    }

    debug(`${buildId} | Verify assets`);
    async.map(urls, (uri, next) => {
      debug(`${buildId} | Fetch ${uri}`);
      this.fetch(uri, opts)
        .then(res => {
          if (res.status !== 200) {
            debug(`${buildId} | Fail ${uri}: ${res.status}`);
            return next(null, { buildId, uri, reason: `Received HTTP status ${res.status}` });
          }

          debug(`${buildId} | Fetch ok ${uri}`);
          next();
        })
        .catch(err => {
          debug(`${buildId} | Fail ${uri}: ${err}`);
          return next(null, { buildId, uri, reason: err && err.toString() || 'unknown' });
        });
    }, done);
  }

  /**
   * Fetch a URL
   *
   * @param {string} uri URI to verify
   * @param {VerifyOptions} opts Options for the verification
   * @returns {Promise<Response>} promise for a response
   * @private
   */
  fetch(uri, opts) {
    const { retries, retryDelay } = opts || {};
    return fetch(uri, { agent: this.httpsAgent, retries, retryDelay });
  }

  /**
   * Verifies all files in the given set of builds.
   * @param {VerifyOptions} opts Options for verify
   * @param {BuildHead[]} heads Array of BuildHead returned from Warehouse.
   * @param {Function} done Continuation when completed
   */
  verifyBuilds(opts, heads, done) {
    const conc = opts.conc || this.conc;
    async.mapLimit(heads, conc, this.verifyOne.bind(this, opts), function (err, sets) {
      if (err) { return done(err); }

      const checks = sets.reduce((acc, set) => {
        return acc.concat(set);
      }, []).filter(Boolean);

      done(null, checks);
    });
  }

  /**
   * @callback delayFn
   * @param {number} attempt 0-based index of attempt number
   * @param {Error} error Error that triggered the retry
   * @param {Response} response Fetch respons object
   * @returns {number} Delay, in ms
   */
  /**
   * @typedef {Object} VerifyOptions
   * @prop {string} pkg Package to verify
   * @prop {string} env Environment to verify in
   * @prop {number} [numFiles] Number of files expected for this package
   * @prop {number} [conc] Number of concurrent requests to run
   * @prop {boolean} [dry=false] Whether this is a dry run
   * @prop {number} [retries=3] Number of retry attempts on file loads
   * @prop {number|delayFn} [retryDelay=1000] Delay, in ms, between retry attempts; or a function to determine that
   */
  /**
   * Fetch all builds from Warehouse and then verify them.
   * @param {VerifyOptions} opts Options
   * @param {Function} done Continuation when complete
   */
  execute(opts, done) {
    debug(`List all builds for: pkg=${opts.pkg} env=${opts.env}`);
    this.wrhs.builds.heads(opts, (err, heads) => {
      if (err) return done(err);

      this.verifyBuilds(opts, heads, done);
    });
  }
}

module.exports = Verify;
