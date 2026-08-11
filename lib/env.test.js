const tap = require('tap');
const sinon = require('sinon');
const EnvAPI = require('./env');

function makeRequest() {
  return {
    post: sinon.stub().resolves({}),
    get: sinon.stub().resolves({})
  };
}

tap.test('EnvAPI', async (t) => {
  t.test('create posts to correct path with env body', async (t) => {
    const request = makeRequest();
    const api = new EnvAPI({ request });
    await api.create({ name: 'my pkg', env: 'production' });
    t.ok(request.post.calledOnce);
    t.equal(request.post.firstCall.args[0], '/objects/my%20pkg/envs');
    t.same(request.post.firstCall.args[1], { env: 'production' });
  });

  t.test('list gets correct path', async (t) => {
    const request = makeRequest();
    const api = new EnvAPI({ request });
    await api.list({ name: 'my pkg' });
    t.ok(request.get.calledOnce);
    t.equal(request.get.firstCall.args[0], '/objects/my%20pkg/envs');
  });

  t.test('get fetches correct path with encoded env', async (t) => {
    const request = makeRequest();
    const api = new EnvAPI({ request });
    await api.get({ name: 'my pkg', env: 'prod env' });
    t.ok(request.get.calledOnce);
    t.equal(request.get.firstCall.args[0], '/objects/my%20pkg/envs/prod%20env');
  });
});
