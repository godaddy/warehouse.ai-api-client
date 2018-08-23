const assume = require('assume');
const sinon = require('sinon');
const Wrhs = require('..');
const mocks = require('./mocks');
const request = require('request');

describe('Verify', function () {
  this.timeout(5E4);
  const wrhs = new Wrhs('https://my-warehouse-api');

  afterEach(function () {
    sinon.restore();
  });

  function mockRequest(opts) {
    const statusCode = opts.statusCode;
    let counter = 0;
    opts.heads.forEach(head => {
      head.recommended.forEach(u => {
        opts.stub.onCall(counter).yieldsAsync(null, { statusCode }, u);
        counter++;
      });
    });
    return counter;
  }

  it('makes appropriate api requests', function (done) {
    sinon.stub(wrhs.builds, 'heads').yieldsAsync(null, mocks.heads);
    const requestStub = sinon.stub(request, 'get');
    mockRequest({ stub: requestStub, heads: mocks.heads, statusCode: 200 });
    wrhs.verify({ pkg: 'whatever-package', env: 'prod' }, function (err, checks) {
      assume(err).is.falsey();
      assume(checks).is.empty();
      done();
    });
  });

  it('responds with a list of failed checks', function (done) {
    sinon.stub(wrhs.builds, 'heads').yieldsAsync(null, mocks.heads);
    const requestStub = sinon.stub(request, 'get');
    const calls = mockRequest({ stub: requestStub, heads: mocks.heads, statusCode: 404 });
    wrhs.verify({ pkg: 'whatever-package', env: 'prod' }, function (err, checks) {
      assume(err).is.falsey();
      assume(checks).has.length(calls);
      done();
    });
  });

  it('detects missing files when given numFiles', function (done) {
    sinon.stub(wrhs.builds, 'heads').yieldsAsync(null, mocks.missingFiles);
    const requestStub = sinon.stub(request, 'get');
    mockRequest({ stub: requestStub, heads: mocks.missingFiles, statusCode: 200 });
    wrhs.verify({ pkg: 'whatever-package', env: 'prod', numFiles: 3 }, function (err, checks) {
      assume(err).is.falsey();
      assume(checks).has.length(mocks.missingFiles.length);
      done();
    });
  });

  it('skips execution with dry: true', function (done) {
    sinon.stub(wrhs.builds, 'heads').yieldsAsync(null, mocks.heads);
    const requestStub = sinon.stub(request, 'get');
    mockRequest({ stub: requestStub, heads: mocks.heads, statusCode: 200 });
    wrhs.verify({ pkg: 'whatever-package', env: 'prod', dry: true }, function (err, checks) {
      assume(err).is.falsey();
      assume(checks).is.empty();
      assume(requestStub.called).is.falsey();
      done();
    });
  });
});
