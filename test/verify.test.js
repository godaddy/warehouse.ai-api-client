const assume = require('assume');
const sinon = require('sinon');
const Wrhs = require('..');
const mocks = require('./mocks');

describe('Verify', function () {
  this.timeout(5E4);
  const wrhs = new Wrhs('https://my-warehouse-api');

  afterEach(function () {
    sinon.restore();
  });

  function mockRequest(opts) {
    const status = opts.statusCode;
    let counter = 0;
    opts.heads.forEach(head => {
      head.recommended.forEach(() => {
        opts.stub.onCall(counter).resolves({ status });
        counter++;
      });
    });
    return counter;
  }

  it('makes appropriate api requests', function (done) {
    sinon.stub(wrhs.builds, 'heads').yieldsAsync(null, mocks.heads);
    const requestStub = sinon.stub(wrhs.verifier, 'fetch');
    mockRequest({ stub: requestStub, heads: mocks.heads, statusCode: 200 });
    wrhs.verify({ pkg: 'whatever-package', env: 'prod' }, function (err, checks) {
      assume(err).is.falsey();
      assume(checks).is.empty();
      done();
    });
  });

  it('responds with a list of failed checks', function (done) {
    sinon.stub(wrhs.builds, 'heads').yieldsAsync(null, mocks.heads);
    const requestStub = sinon.stub(wrhs.verifier, 'fetch');
    const calls = mockRequest({ stub: requestStub, heads: mocks.heads, statusCode: 404 });
    wrhs.verify({ pkg: 'whatever-package', env: 'prod' }, function (err, checks) {
      assume(err).is.falsey();
      assume(checks).has.length(calls);
      checks.forEach(chk => {
        assume(chk).hasOwn('buildId');
        assume(chk.buildId).contains('whatever-package!prod!');
        assume(chk).hasOwn('uri');
        assume(chk.uri).is.a('string');
        assume(chk).hasOwn('reason', 'status 404');
      });
      done();
    });
  });

  it('detects missing files when given numFiles', function (done) {
    sinon.stub(wrhs.builds, 'heads').yieldsAsync(null, mocks.missingFiles);
    const requestStub = sinon.stub(wrhs.verifier, 'fetch');
    mockRequest({ stub: requestStub, heads: mocks.missingFiles, statusCode: 200 });
    wrhs.verify({ pkg: 'whatever-package', env: 'prod', numFiles: 3 }, function (err, checks) {
      assume(err).is.falsey();
      assume(checks).has.length(mocks.missingFiles.length);
      checks.forEach(chk => {
        assume(chk).hasOwn('reason', 'Expect number of files in head 2 to equal 3');
      });
      done();
    });
  });

  it('skips execution with dry: true', function (done) {
    sinon.stub(wrhs.builds, 'heads').yieldsAsync(null, mocks.heads);
    const requestStub = sinon.stub(wrhs.verifier, 'fetch');
    mockRequest({ stub: requestStub, heads: mocks.heads, statusCode: 200 });
    wrhs.verify({ pkg: 'whatever-package', env: 'prod', dry: true }, function (err, checks) {
      assume(err).is.falsey();
      assume(checks).is.empty();
      assume(requestStub.called).is.falsey();
      done();
    });
  });
});
