const tap = require('tap');
const sinon = require('sinon');
const ObjectAPI = require('./object');

function makeRequest() {
  return {
    post: sinon.stub().resolves({}),
    get: sinon.stub().resolves({}),
    put: sinon.stub().resolves({})
  };
}

tap.test('ObjectAPI', async (t) => {
  t.test('create posts to /objects with full body', async (t) => {
    const request = makeRequest();
    const api = new ObjectAPI({ request });
    await api.create({
      name: 'foo',
      env: 'prod',
      expiration: 3600,
      variant: 'v1',
      version: '1.0',
      data: {}
    });
    t.ok(request.post.calledOnce);
    t.equal(request.post.firstCall.args[0], '/objects');
    t.same(request.post.firstCall.args[1], {
      name: 'foo',
      env: 'prod',
      expiration: 3600,
      variant: 'v1',
      version: '1.0',
      data: {}
    });
  });

  t.test('get fetches encoded path with query params', async (t) => {
    const request = makeRequest();
    const api = new ObjectAPI({ request });
    await api.get({
      name: 'my pkg',
      env: 'prod',
      version: '1.0',
      acceptedVariants: 'v1'
    });
    t.ok(request.get.calledOnce);
    t.equal(request.get.firstCall.args[0], '/objects/my%20pkg');
    const query = request.get.firstCall.args[1];
    t.equal(query.accepted_variants, 'v1');
    t.equal(query.env, 'prod');
    t.equal(query.version, '1.0');
  });

  t.test('get passes acceptedVariants array through concat', async (t) => {
    const request = makeRequest();
    const api = new ObjectAPI({ request });
    await api.get({ name: 'foo', acceptedVariants: ['v1', 'v2'] });
    const query = request.get.firstCall.args[1];
    t.ok(Array.isArray(query.accepted_variants));
  });

  t.test('getHead fetches /head/:name/:env', async (t) => {
    const request = makeRequest();
    const api = new ObjectAPI({ request });
    await api.getHead({ name: 'my pkg', env: 'prod env' });
    t.ok(request.get.calledOnce);
    t.equal(request.get.firstCall.args[0], '/head/my%20pkg/prod%20env');
  });

  t.test('setHead with version sends head property', async (t) => {
    const request = makeRequest();
    const api = new ObjectAPI({ request });
    await api.setHead({ name: 'my pkg', env: 'prod', version: '1.0.0' });
    t.ok(request.put.calledOnce);
    t.equal(request.put.firstCall.args[0], '/objects/my%20pkg/prod');
    t.same(request.put.firstCall.args[1], { head: '1.0.0' });
  });

  t.test('setHead without version sends fromEnv', async (t) => {
    const request = makeRequest();
    const api = new ObjectAPI({ request });
    await api.setHead({ name: 'my pkg', env: 'prod', fromEnv: 'staging' });
    t.ok(request.put.calledOnce);
    t.same(request.put.firstCall.args[1], { fromEnv: 'staging' });
  });

  t.test('listVersions gets correct path', async (t) => {
    const request = makeRequest();
    const api = new ObjectAPI({ request });
    await api.listVersions({ name: 'my pkg' });
    t.ok(request.get.calledOnce);
    t.equal(request.get.firstCall.args[0], '/objects/my%20pkg/versions');
  });

  t.test('logs gets correct path', async (t) => {
    const request = makeRequest();
    const api = new ObjectAPI({ request });
    await api.logs({ name: 'my pkg', env: 'prod env' });
    t.ok(request.get.calledOnce);
    t.equal(request.get.firstCall.args[0], '/logs/my%20pkg/prod%20env');
  });
});
