const sinon = require('sinon');
const assume = require('assume');
const ReleaseLine = require('../release-line');
const Wrhs = require('..');

assume.use(require('assume-sinon'));

describe('ReleaseLine', function () {
  const wrhs = new Wrhs('https://my-warehouse-api');
  let releaseLines;
  let sendStub;

  beforeEach(function () {
    releaseLines = null;
  });

  afterEach(function () {
    sinon.restore();
    sendStub = null;
  });

  it('should have a get function', function () {
    releaseLines = new ReleaseLine();
    assume(releaseLines.get).is.a('function');
  });

  describe('.get', function () {
    const mockData = {
      pkg: 'some-pkg',
      version: '1.1.1',
      previousVersion: '1.1.0',
      dependents: {
        'some-sub-pkg': '2.3.4'
      }
    };

    beforeEach(function () {
      sendStub = sinon.stub(wrhs, 'send')
        .yields(null, mockData)
        .returns(wrhs);
    });

    it('fetches data about a single package', function (done) {
      releaseLines = new ReleaseLine(wrhs);

      releaseLines.get({ pkg: 'some-pkg' }, (error, data) => {
        assume(error).is.falsey();
        assume(data).equals(mockData);
        assume(sendStub).is.called(1);
        assume(sendStub).is.calledWithMatch('release-line/some-pkg');
        done();
      });
    });

    it('supports scoped packages', function (done) {
      releaseLines = new ReleaseLine(wrhs);

      releaseLines.get({ pkg: '@some-scope/some-pkg' }, (error, data) => {
        assume(error).is.falsey();
        assume(data).equals(mockData);
        assume(sendStub).is.called(1);
        assume(sendStub).is.calledWithMatch('release-line/%40some-scope%2Fsome-pkg');
        done();
      });
    });

    it('passes through error from warehouse', function (done) {
      sendStub.yields(new Error('This is an error.')).returns(wrhs);
      releaseLines = new ReleaseLine(wrhs);

      releaseLines.get({ pkg: 'some-pkg' }, error => {
        assume(error).is.truthy();
        assume(error.message).contains('This is an error.');
        assume(sendStub).is.called(1);
        done();
      });
    });

    it('fetches data about a single package with a version number', function (done) {
      releaseLines = new ReleaseLine(wrhs);

      releaseLines.get({ pkg: 'some-pkg', version: '1.1.1' }, (error, data) => {
        assume(error).is.falsey();
        assume(data).equals(mockData);
        assume(sendStub).is.called(1);
        assume(sendStub).is.calledWithMatch('release-line/some-pkg/1.1.1');
        done();
      });
    });
  });
});
