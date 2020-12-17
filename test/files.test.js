const { describe, it, beforeEach } = require('mocha');
const assume = require('assume');
const path = require('path');

const Files = require('../files');

describe('Files', function () {
  let files;

  beforeEach(function () {
    files = new Files();
  });

  it('should have a getAttachments function', function () {
    assume(files.getAttachments).is.a('asyncfunction');
  });

  it('should have a read function', function () {
    assume(files.read).is.a('asyncfunction');
  });

  describe('.read', function () {
    function testFiles(filesArray, content = "clone(require('./heads.json'));") {
      return async function assertResult() {
        const result = await files.read(filesArray);

        assume(result).to.be.an('array');
        assume(result).to.have.length(1);
        assume(result[0]).to.be.an('object');
        assume(result[0].data).to.be.instanceof(Buffer);
        assume(result[0].file).to.include(filesArray[0]);
        assume(result[0].data.toString('utf-8')).to.include(content);
      };
    }

    it('will read set of files from current working directory', testFiles(['test/mocks/index.js']));
    it('will use absolute path', testFiles([path.join(__dirname, '/mocks/index.js')]));
    it('will read set of files from configured root', function () {
      files = new Files(null, { root: path.join(__dirname, 'mocks') });

      return testFiles(['heads.json'], '"name": "whatever-package"')();
    });
  });

  describe('.getAttachments', function () {
    it('will generate attachment definition per file', async function () {
      const result = await files.getAttachments(['test/mocks/index.js', 'test/mocks/heads.json']);

      assume(result).to.have.property('index.js');
      assume(result).to.have.property('heads.json');

      assume(result['index.js']).to.have.property('length', 208);
      assume(result['index.js']).to.have.property('data');
      assume(result['index.js']).to.have.property('content_type', 'application/javascript');
      assume(result['index.js']).to.have.property('digest', 'sha256-69Fdv+ROScMs4a0eQDgffanmuDip24s/WNg7JPY4Z5M=');

      assume(result['heads.json']).to.have.property('length', 7954);
      assume(result['heads.json']).to.have.property('data');
      assume(result['heads.json']).to.have.property('content_type', 'application/json');
      assume(result['heads.json']).to.have.property('digest', 'sha256-XX3DcyG9Qaof+fEDUyrdS9SP40yGkM/FOYipi8I0lCI=');
    });
  });
});
