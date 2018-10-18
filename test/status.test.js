const sinon = require('sinon');
const assume = require('assume');
const Status = require('../status');
const Wrhs = require('..');

assume.use(require('assume-sinon'));

/* eslint-disable max-nested-callbacks */
describe('Status', function () {
  const statusUri = 'https://my-warehouse-status-api';
  const wrhs = new Wrhs({
    uri: 'https://my-warehouse-api',
    statusUri
  });
  let status;
  let sendStub;

  beforeEach(function () {
    status = new Status(wrhs);
  });

  afterEach(function () {
    sinon.restore();
    sendStub = null;
  });

  it('should have a get function', function () {
    assume(status.get).is.a('function');
  });

  it('should have a getEvents function', function () {
    assume(status.getEvents).is.a('function');
  });

  it('should have a getProgress function', function () {
    assume(status.getProgress).is.a('function');
  });

  describe('.get', function () {
    const mockData = { name: 'some-pkg' };

    beforeEach(function () {
      sendStub = sinon.stub(wrhs, 'makeRequest')
        .yields(null, mockData)
        .returns(wrhs);
    });

    it('gets status information', function (done) {
      status.get({ pkg: 'some-pkg', env: 'dev' }, (error, data) => {
        assume(error).is.falsey();
        assume(data).equals(mockData);
        assume(sendStub).is.called(1);
        assume(sendStub).is.calledWithMatch(statusUri, 'status/some-pkg/dev');
        done();
      });
    });

    it('supports scoped packages', function (done) {
      status.get({ pkg: '@some-scope/some-pkg', env: 'dev' }, (error, data) => {
        assume(error).is.falsey();
        assume(data).equals(mockData);
        assume(sendStub).is.called(1);
        assume(sendStub).is.calledWithMatch(statusUri, 'status/%40some-scope%2Fsome-pkg/dev');
        done();
      });
    });

    it('passes through error from warehouse', function (done) {
      sendStub.yields(new Error('This is an error.')).returns(wrhs);

      status.get({ pkg: 'some-pkg', env: 'dev' }, error => {
        assume(error).is.truthy();
        assume(error.message).contains('This is an error.');
        assume(sendStub).is.called(1);
        done();
      });
    });

    it('returns an error when no package specified', function (done) {
      status.get({ pkg: null, env: 'prod' }, error => {
        assume(error).is.truthy();
        assume(error.message).contains('Invalid parameters supplied, missing `pkg`');
        done();
      });
    });

    it('returns an error when no env specified', function (done) {
      status.get({ pkg: 'something', env: null }, error => {
        assume(error).is.truthy();
        assume(error.message).contains('Invalid parameters supplied, missing `env`');
        done();
      });
    });
  });

  describe('.getEvents', function () {
    const mockData = [{ name: 'some-pkg' }];

    beforeEach(function () {
      sendStub = sinon.stub(wrhs, 'makeRequest')
        .yields(null, mockData)
        .returns(wrhs);
    });

    it('gets status events', function (done) {
      status.getEvents({ pkg: '@some-scope/some-pkg', env: 'dev' }, (error, data) => {
        assume(error).is.falsey();
        assume(data).equals(mockData);
        assume(sendStub).is.called(1);
        assume(sendStub).is.calledWithMatch(statusUri, 'status-events/%40some-scope%2Fsome-pkg/dev');
        done();
      });
    });

    it('passes through error from warehouse', function (done) {
      sendStub.yields(new Error('This is an error.')).returns(wrhs);

      status.getEvents({ pkg: 'some-pkg', env: 'dev' }, error => {
        assume(error).is.truthy();
        assume(error.message).contains('This is an error.');
        assume(sendStub).is.called(1);
        done();
      });
    });

    it('returns an error when no package specified', function (done) {
      status.getEvents({ pkg: null, env: 'prod' }, error => {
        assume(error).is.truthy();
        assume(error.message).contains('Invalid parameters supplied, missing `pkg`');
        done();
      });
    });

    it('returns an error when no env specified', function (done) {
      status.getEvents({ pkg: 'something', env: null }, error => {
        assume(error).is.truthy();
        assume(error.message).contains('Invalid parameters supplied, missing `env`');
        done();
      });
    });
  });

  describe('.getProgress', function () {
    const mockData = { progress: 'some-pkg' };

    beforeEach(function () {
      sendStub = sinon.stub(wrhs, 'makeRequest')
        .yields(null, mockData)
        .returns(wrhs);
    });

    it('gets status events', function (done) {
      status.getProgress({ pkg: '@some-scope/some-pkg', env: 'dev' }, (error, data) => {
        assume(error).is.falsey();
        assume(data).equals(mockData);
        assume(sendStub).is.called(1);
        assume(sendStub).is.calledWithMatch(statusUri, 'progress/%40some-scope%2Fsome-pkg/dev');
        done();
      });
    });

    it('passes through error from warehouse', function (done) {
      sendStub.yields(new Error('This is an error.')).returns(wrhs);

      status.getProgress({ pkg: 'some-pkg', env: 'dev' }, error => {
        assume(error).is.truthy();
        assume(error.message).contains('This is an error.');
        assume(sendStub).is.called(1);
        done();
      });
    });

    it('returns an error when no package specified', function (done) {
      status.getProgress({ pkg: null, env: 'prod' }, error => {
        assume(error).is.truthy();
        assume(error.message).contains('Invalid parameters supplied, missing `pkg`');
        done();
      });
    });

    it('returns an error when no env specified', function (done) {
      status.getProgress({ pkg: 'something', env: null }, error => {
        assume(error).is.truthy();
        assume(error.message).contains('Invalid parameters supplied, missing `env`');
        done();
      });
    });
  });
});
/* eslint-enable max-nested-callbacks */
