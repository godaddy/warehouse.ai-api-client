const tap = require('tap');
const sinon = require('sinon');
const HookAPI = require('./hook');

function makeRequest() {
  return {
    post: sinon.stub().resolves({}),
    get: sinon.stub().resolves({}),
    delete: sinon.stub().resolves(null)
  };
}

tap.test('HookAPI', async (t) => {
  t.test('create posts to correct path with url body', async (t) => {
    const request = makeRequest();
    const api = new HookAPI({ request });
    await api.create({ name: 'my pkg', url: 'https://example.com/hook' });
    t.ok(request.post.calledOnce);
    t.equal(request.post.firstCall.args[0], '/objects/my%20pkg/hooks');
    t.same(request.post.firstCall.args[1], { url: 'https://example.com/hook' });
  });

  t.test('list gets correct path', async (t) => {
    const request = makeRequest();
    const api = new HookAPI({ request });
    await api.list({ name: 'my pkg' });
    t.ok(request.get.calledOnce);
    t.equal(request.get.firstCall.args[0], '/objects/my%20pkg/hooks');
  });

  t.test('get fetches hook by encoded id', async (t) => {
    const request = makeRequest();
    const api = new HookAPI({ request });
    await api.get({ name: 'my pkg', id: 'hook 123' });
    t.ok(request.get.calledOnce);
    t.equal(
      request.get.firstCall.args[0],
      '/objects/my%20pkg/hooks/hook%20123'
    );
  });

  t.test('delete removes hook by encoded id', async (t) => {
    const request = makeRequest();
    const api = new HookAPI({ request });
    await api.delete({ name: 'my pkg', id: 'hook 123' });
    t.ok(request.delete.calledOnce);
    t.equal(
      request.delete.firstCall.args[0],
      '/objects/my%20pkg/hooks/hook%20123'
    );
  });
});
