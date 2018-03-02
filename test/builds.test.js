const sinon = require('sinon');
const assume = require('assume');
const Builds = require('../builds');
const Wrhs = require('..');

/* eslint-disable max-nested-callbacks */
describe('Builds', function () {
  let sandbox;
  const wrhs = new Wrhs('https://my-warehouse-api');
  let builds;

  beforeEach(function () {
    builds = null;
    sandbox = sinon.sandbox.create();
  });

  afterEach(function () {
    sandbox.restore();
    if (builds) {
      builds.stopCacheRefresh();
    }
  });

  describe('.get', function () {
    it('returns error when no pkg specified', function (done) {
      builds = new Builds();
      builds.get({ pkg: null }, error => {
        assume(error).is.truthy();
        assume(error.message).contains('invalid parameters supplied, missing `pkg` or `env`');
        done();
      });
    });

    it('fetches data from warehouse', function (done) {
      const buildData = {};
      const sendStub = sandbox.stub(wrhs, 'send')
        .callsArgWithAsync(2, null, buildData)
        .returns(wrhs);
      builds = new Builds(wrhs);

      builds.get({ pkg: 'some-pkg' }, (error, data) => {
        assume(error).is.falsey();
        assume(data).equals(buildData);
        assume(sendStub.calledOnce).is.true();
        done();
      });
    });

    it('passes through error from warehouse', function (done) {
      const sendStub = sandbox.stub(wrhs, 'send')
        .callsArgWithAsync(2, new Error('This is an error.'))
        .returns(wrhs);
      builds = new Builds(wrhs);

      builds.get({ pkg: 'some-pkg' }, error => {
        assume(error).is.truthy();
        assume(error.message).contains('This is an error.');
        assume(sendStub.calledOnce).is.true();
        done();
      });
    });

    it('fetches data from warehouse each time when no cache', function (done) {
      const buildData = {};
      const sendStub = sandbox.stub(wrhs, 'send')
        .callsArgWithAsync(2, null, buildData)
        .returns(wrhs);
      builds = new Builds(wrhs);

      builds.get({ pkg: 'some-pkg' }, (error1, data1) => {
        assume(error1).is.falsey();
        assume(data1).equals(buildData);
        assume(sendStub.calledOnce).is.true();

        builds.get({ pkg: 'some-pkg' }, (error2, data2) => {
          assume(error2).is.falsey();
          assume(data2).equals(buildData);
          assume(sendStub.callCount).equals(2);
          done();
        });
      });
    });

    it('fetches data from cache when enabled and parameters are the same', function (done) {
      const buildData = {};
      const sendStub = sandbox.stub(wrhs, 'send')
        .callsArgWithAsync(2, null, buildData)
        .returns(wrhs);
      builds = new Builds(wrhs, { buildCache: { enabled: true }});

      builds.get({ pkg: 'some-pkg' }, (error1, data1) => {
        assume(error1).is.falsey();
        assume(data1).equals(buildData);
        assume(sendStub.calledOnce).is.true();

        builds.get({ pkg: 'some-pkg' }, (error2, data2) => {
          assume(error2).is.falsey();
          assume(data2).equals(buildData);
          assume(sendStub.callCount).equals(1);
          done();
        });
      });
    });

    it('fetches data from warehouse when cache is enabled and parameters are the different', function (done) {
      const buildData = {};
      const sendStub = sandbox.stub(wrhs, 'send')
        .callsArgWithAsync(2, null, buildData)
        .returns(wrhs);
      builds = new Builds(wrhs, { buildCache: { enabled: true }});

      builds.get({ pkg: 'some-pkg', locale: 'en-NZ' }, (error1, data1) => {
        assume(error1).is.falsey();
        assume(data1).equals(buildData);
        assume(sendStub.calledOnce).is.true();

        builds.get({ pkg: 'some-pkg', locale: 'en-CA' }, (error2, data2) => {
          assume(error2).is.falsey();
          assume(data2).equals(buildData);
          assume(sendStub.callCount).equals(2);
          done();
        });
      });
    });

  });
});
/* eslint-enable max-nested-callbacks */
