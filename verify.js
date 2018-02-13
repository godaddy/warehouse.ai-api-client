const debug = require('diagnostics')('warehouse.ai-api-client:verify');
const request = require('request');
const async = require('async');
const url = require('url');

class Verify {
  constructor(wrhs) {
    this.wrhs = wrhs;
    this.conc = wrhs.conc || 10;
    this.dry = wrhs.dry;
  }

  /**
   * Fetches all files from one of the builds
   * @param {Object} opts Options for the function
   * @param {BuildHead} head BuildHead returned from Warehouse.
   * @param {Function}  done Continuation to respond to when complete.
   * @returns {undefined}
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
      return done(null, []);
    }

    if (numFiles) {
      debug(`Expect number of files in head ${urls.length} to equal ${numFiles}`);
      if (numFiles > urls.length) return done(null, [`https://${buildId}/missingfile`]);
    }

    debug(`${buildId} | Verify assets`);
    async.map(urls, function getOne(uri, next) {
      debug(`${buildId} | Fetch ${uri}`);
      request.get(uri, (err, res) => {
        if (err || res.statusCode !== 200) {
          debug(`${buildId} | Fail ${uri}: ${err || res.statusCode}`);
          return next(null, url);
        }

        debug(`${buildId} | Fetch ok ${uri}`);
        next();
      });
    }, done);
  }

  /**
   * Verifies all files in the given set of builds.
   * @param {Object} opts Options for verify
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
   * Fetch all builds from Warehouse and then verify them.
   * @param {Object} opts { pkg, env, dry }
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
