const sinon = require('sinon');
const assume = require('assume');
const Builds = require('../builds');
const Wrhs = require('..');

assume.use(require('assume-sinon'));

/* eslint-disable max-nested-callbacks */
describe('Builds', function () {
  const wrhs = new Wrhs('https://my-warehouse-api');
  let builds;
  const buildData = {};
  let sendStub;

  beforeEach(function () {
    builds = null;
  });

  afterEach(function () {
    sinon.restore();
    sendStub = null;
  });

  it('should have a get function', function () {
    builds = new Builds();
    assume(builds.get).is.a('function');
  });

  it('should have a heads function', function () {
    builds = new Builds();
    assume(builds.heads).is.a('function');
  });

  it('should have a meta function', function () {
    builds = new Builds();
    assume(builds.meta).is.a('function');
  });

  it('should have a promote function', function () {
    builds = new Builds();
    assume(builds.promote).is.a('function');
  });

  it('should have a trigger function', function () {
    builds = new Builds();
    assume(builds.trigger).is.a('function');
  });

  describe('.get', function () {
    beforeEach(function () {
      sendStub = sinon.stub(wrhs, 'send')
        .yields(null, buildData)
        .returns(wrhs);
    });

    it('returns error when no pkg specified', function (done) {
      builds = new Builds();
      builds.get({ pkg: null }, error => {
        assume(error).is.truthy();
        assume(error.message).contains('Invalid parameters supplied, missing `pkg`');
        done();
      });
    });

    it('fetches data from warehouse', function (done) {
      builds = new Builds(wrhs);

      const fluentResult = builds.get({ pkg: 'some-pkg', env: 'prod', version: '1.2.3', meta: 'meta', locale: 'en-NZ' }, (error, data) => {
        assume(error).is.falsey();
        assume(data).equals(buildData);
        assume(sendStub).is.called(1);
        assume(sendStub).is.calledWithMatch('builds/some-pkg/prod/1.2.3/meta',
          { query: { locale: 'en-NZ' } });
        done();
      });

      assume(fluentResult).to.equal(wrhs);
    });

    it('provides defaults', function (done) {
      builds = new Builds(wrhs);

      builds.get({ pkg: 'some-pkg' }, (error, data) => {
        assume(error).is.falsey();
        assume(data).equals(buildData);
        assume(sendStub).is.called(1);
        assume(sendStub).is.calledWithMatch('builds/some-pkg/dev',
          { query: { locale: 'en-US' } });
        done();
      });
    });

    it('supports scoped packages', function (done) {
      builds = new Builds(wrhs);

      builds.get({ pkg: '@some-scope/some-pkg' }, (error, data) => {
        assume(error).is.falsey();
        assume(data).equals(buildData);
        assume(sendStub).is.called(1);
        assume(sendStub).is.calledWithMatch('builds/%40some-scope%2Fsome-pkg/dev');
        done();
      });
    });

    it('passes through error from warehouse', function (done) {
      sendStub.yields(new Error('This is an error.')).returns(wrhs);

      builds = new Builds(wrhs);

      builds.get({ pkg: 'some-pkg' }, error => {
        assume(error).is.truthy();
        assume(error.message).contains('This is an error.');
        assume(sendStub).is.called(1);
        done();
      });
    });

    it('fetches data from warehouse each time when no cache', function (done) {
      builds = new Builds(wrhs);

      builds.get({ pkg: 'some-pkg' }, (error1, data1) => {
        assume(error1).is.falsey();
        assume(JSON.stringify(data1)).equals(JSON.stringify(buildData));
        assume(sendStub).is.called(1);

        builds.get({ pkg: 'some-pkg' }, (error2, data2) => {
          assume(error2).is.falsey();
          assume(data2).equals(buildData);
          assume(sendStub).is.called(2);
          done();
        });
      });
    });

    it('fetches data from cache when enabled and parameters are the same', function (done) {
      builds = new Builds(wrhs, { cache: { enabled: true } });

      builds.get({ pkg: 'some-pkg' }, (error1, data1) => {
        assume(error1).is.falsey();
        assume(JSON.stringify(data1)).equals(JSON.stringify(buildData));
        assume(sendStub).is.called(1);

        builds.get({ pkg: 'some-pkg' }, (error2, data2) => {
          assume(error2).is.falsey();
          assume(data2).equals(buildData);
          assume(sendStub).is.called(1);
          done();
        });
      });
    });

    it('fetches data from warehouse when cache is enabled and parameters are the different', function (done) {
      builds = new Builds(wrhs, { cache: { enabled: true } });

      builds.get({ pkg: 'some-pkg', locale: 'en-NZ' }, (error1, data1) => {
        assume(error1).is.falsey();
        assume(JSON.stringify(data1)).equals(JSON.stringify(buildData));
        assume(sendStub).is.called(1);

        builds.get({ pkg: 'some-pkg', locale: 'en-CA' }, (error2, data2) => {
          assume(error2).is.falsey();
          assume(data2).equals(buildData);
          assume(sendStub).is.called(2);
          done();
        });
      });
    });

    it('fetches data from warehouse when cache is enabled, parameters are the same, but bypassCache specified', function (done) {
      builds = new Builds(wrhs, { cache: { enabled: true } });

      builds.get({ pkg: 'some-pkg' }, (error1, data1) => {
        assume(error1).is.falsey();
        assume(JSON.stringify(data1)).equals(JSON.stringify(buildData));
        assume(sendStub).is.called(1);

        builds.get({ pkg: 'some-pkg', bypassCache: true }, (error2, data2) => {
          assume(error2).is.falsey();
          assume(data2).equals(buildData);
          assume(sendStub).is.called(2);
          done();
        });
      });
    });

    it('caches data', function (done) {
      builds = new Builds(wrhs, { cache: { enabled: true } });
      assume(builds.cache).is.truthy();
      assume(builds.cache._caches[0]._items).is.truthy();
      assume(Object.keys(builds.cache._caches[0]._items).length).equals(0);

      builds.get({ pkg: 'some-pkg' }, (error, data) => {
        assume(error).is.falsey();
        assume(data).equals(buildData);
        assume(sendStub).is.called(1);
        assume(builds.cache._caches[0]._items).is.truthy();
        assume(Object.keys(builds.cache._caches[0]._items).length).equals(1);
        done();
      });
    });
  });

  describe('.put', function () {
    beforeEach(function () {
      sendStub = sinon.stub(wrhs, 'send')
        .yields(null)
        .returns(wrhs);
    });

    it('returns error when no files are specified', function (done) {
      builds = new Builds();
      builds.put([], { pkg: 'some-pkg' }, error => {
        assume(error).is.truthy();
        assume(error.message).contains('Invalid parameters supplied');
        done();
      });
    });

    it('returns error when params are missing', function (done) {
      builds = new Builds();
      builds.put([], { pkg: 'some-pkg', version: null, env: 'dev' }, error => {
        assume(error).is.truthy();
        assume(error.message).contains('Invalid parameters supplied');
        done();
      });
    });

    it('supports scoped packages', function (done) {
      builds = new Builds(wrhs);

      builds.put([__filename], { pkg: '@some-scope/some-pkg', env: 'dev', version: '1.2.3' }, (error) => {
        assume(error).is.falsey();
        assume(sendStub).is.called(1);
        assume(sendStub).is.calledWithMatch(['builds', '%40some-scope%2Fsome-pkg', 'dev']);

        const args = sendStub.getCall(0).args[1];
        assume(args.body).to.include('"name":"@some-scope/some-pkg"');

        done();
      });
    });

    it('puts supplies files as attachments and npm-like package', function (done) {
      builds = new Builds(wrhs);

      builds.put([__filename], { pkg: 'some-pkg', env: 'prod', version: '1.2.3' }, (error) => {
        assume(error).is.falsey();
        assume(sendStub).is.called(1);

        const args = sendStub.getCall(0).args[1];
        assume(args.headers).to.have.property('Content-Type', 'application/json');
        assume(args.method).to.equal('PUT');
        assume(args.body).to.include('"name":"some-pkg"');
        assume(args.body).to.include('"dist-tags":{"latest":"1.2.3"}');
        assume(args.body).to.include('"_attachments":{"builds.test.js":{');

        done();
      });
    });

    it('passes through error from warehouse', function (done) {
      sendStub.yields(new Error('This is an error.')).returns(wrhs);

      builds = new Builds(wrhs);

      builds.put([__filename], { pkg: 'some-pkg', version: '1.0.0', env: 'dev' }, error => {
        assume(error).is.truthy();
        assume(error.message).contains('This is an error.');
        assume(sendStub).is.called(1);
        done();
      });
    });
  });

  describe('.heads', function () {
    beforeEach(function () {
      builds = new Builds(wrhs);
      sendStub = sinon.stub(wrhs, 'send')
        .yields(null, buildData)
        .returns(wrhs);
    });

    it('returns an error when no package specified', function (done) {
      builds.heads({ pkg: null, env: 'prod' }, error => {
        assume(error).is.truthy();
        assume(error.message).contains('Invalid parameters supplied, missing `pkg`');
        done();
      });
    });

    it('sends request for package and environment', function (done) {
      builds.heads({ pkg: 'some-pkg', env: 'prod' }, (error, data) => {
        assume(error).is.falsey();
        assume(data).equals(buildData);
        assume(sendStub).is.called(1);
        assume(sendStub).is.calledWithMatch('builds/-/head',
          { query: { env: 'prod', name: 'some-pkg' } });
        done();
      });
    });

    it('provided default environment', function (done) {
      builds.heads({ pkg: 'another-pkg' }, (error, data) => {
        assume(error).is.falsey();
        assume(data).equals(buildData);
        assume(sendStub).is.called(1);
        assume(sendStub).is.calledWithMatch('builds/-/head',
          { query: { env: 'dev', name: 'another-pkg' } });
        done();
      });
    });
  });

  describe('.meta', function () {
    let buildStub;

    beforeEach(function () {
      builds = new Builds(wrhs);
      buildStub = sinon.stub(builds, 'get')
        .yields(null, buildData)
        .returns(wrhs);
    });

    it('calls through setting meta', function (done) {
      builds.meta({ pkg: 'some-pig' }, error => {
        assume(error).is.falsey();
        assume(buildStub).is.called(1);
        assume(buildStub).is.calledWithMatch({ pkg: 'some-pig', meta: false });
        done();
      });
    });

    it('allows for meta: true', function (done) {
      builds.meta({ pkg: 'some-pig', meta: true }, error => {
        assume(error).is.falsey();
        assume(buildStub).is.called(1);
        assume(buildStub).is.calledWithMatch({ pkg: 'some-pig', meta: true });
        done();
      });
    });
  });

  describe('.trigger', function () {
    beforeEach(function () {
      builds = new Builds(wrhs);
      sendStub = sinon.stub(wrhs, 'send')
        .yields(null, buildData)
        .returns(wrhs);
    });

    it('returns error when there is no env specified', function (done) {
      builds.trigger({ pkg: 'what', version: '2.0.0' }, function (err) {
        assume(err).exists();
        assume(err.message).contains('Valid');
        done();
      });
    });

    it('is called with correct parameters, default promote; false', function (done) {
      builds.trigger({ pkg: 'what', env: 'dev', version: '1.0.0' }, function (err) {
        assume(err).does.not.exist();
        assume(sendStub).is.called(1);
        assume(sendStub).is.calledWithMatch('builds/what/dev/1.0.0',
          { method: 'PATCH', query: { promote: false } });
        done();
      });
    });

    it('is called with correct parameters, with promote: true', function (done) {
      builds.trigger({ pkg: 'what', env: 'dev', version: '1.0.0', promote: true }, function (err) {
        assume(err).does.not.exist();
        assume(sendStub).is.called(1);
        assume(sendStub).is.calledWithMatch('builds/what/dev/1.0.0',
          { method: 'PATCH', query: { promote: true } });
        done();
      });
    });

  });
  describe('.promote', function () {
    beforeEach(function () {
      builds = new Builds(wrhs);
      sendStub = sinon.stub(wrhs, 'send')
        .yields(null, buildData)
        .returns(wrhs);
    });

    it('returns error when there is no env specified', function (done) {
      builds.promote({ pkg: 'what', version: '2.0.0' }, function (err) {
        assume(err).exists();
        assume(err.message).contains('Valid');
        done();
      });
    });

    it('is called with correct parameters, default build; false', function (done) {
      builds.promote({ pkg: 'what', env: 'dev', version: '1.0.0' }, function (err) {
        assume(err).does.not.exist();
        assume(sendStub).is.called(1);
        assume(sendStub).is.calledWithMatch('promote/what/dev/1.0.0',
          { method: 'PATCH', query: { build: false } });
        done();
      });
    });

    it('is called with correct parameters, with build: true', function (done) {
      builds.promote({ pkg: 'what', env: 'dev', version: '1.0.0', build: true }, function (err) {
        assume(err).does.not.exist();
        assume(sendStub).is.called(1);
        assume(sendStub).is.calledWithMatch('promote/what/dev/1.0.0',
          { method: 'PATCH', query: { build: true } });
        done();
      });
    });

  });
});
/* eslint-enable max-nested-callbacks */
