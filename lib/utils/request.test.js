const tap = require('tap');
const nock = require('nock');
const WarehouseRequest = require('./request');

const BASE_URL = 'https://warehouse.test';

tap.test('WarehouseRequest', async (t) => {
  t.afterEach(() => nock.cleanAll());

  t.test('generates correct basic auth header', async (t) => {
    const req = new WarehouseRequest({
      baseUrl: BASE_URL,
      username: 'usr',
      password: 'pwd'
    });
    const expected = `Basic ${Buffer.from('usr:pwd').toString('base64')}`;
    t.equal(req._auth, expected);
  });

  t.test('post sends JSON body and returns parsed response', async (t) => {
    nock(BASE_URL).post('/objects', { name: 'foo' }).reply(200, { ok: true });
    const req = new WarehouseRequest({
      baseUrl: BASE_URL,
      username: 'u',
      password: 'p'
    });
    const result = await req.post('/objects', { name: 'foo' });
    t.same(result, { ok: true });
  });

  t.test('put sends JSON body and returns parsed response', async (t) => {
    nock(BASE_URL)
      .put('/objects/foo/prod', { head: '1.0.0' })
      .reply(200, { updated: true });
    const req = new WarehouseRequest({
      baseUrl: BASE_URL,
      username: 'u',
      password: 'p'
    });
    const result = await req.put('/objects/foo/prod', { head: '1.0.0' });
    t.same(result, { updated: true });
  });

  t.test('get appends query params to url', async (t) => {
    nock(BASE_URL)
      .get('/objects/foo')
      .query({ env: 'prod' })
      .reply(200, { data: 1 });
    const req = new WarehouseRequest({
      baseUrl: BASE_URL,
      username: 'u',
      password: 'p'
    });
    const result = await req.get('/objects/foo', { env: 'prod' });
    t.same(result, { data: 1 });
  });

  t.test('get skips falsy query params', async (t) => {
    nock(BASE_URL).get('/objects/foo').reply(200, { data: 1 });
    const req = new WarehouseRequest({
      baseUrl: BASE_URL,
      username: 'u',
      password: 'p'
    });
    const result = await req.get('/objects/foo', {
      env: undefined,
      version: null
    });
    t.same(result, { data: 1 });
  });

  t.test('delete sends request and returns null on 204', async (t) => {
    nock(BASE_URL).delete('/objects/foo/hooks/123').reply(204);
    const req = new WarehouseRequest({
      baseUrl: BASE_URL,
      username: 'u',
      password: 'p'
    });
    const result = await req.delete('/objects/foo/hooks/123');
    t.equal(result, null);
  });

  t.test('throws on non-ok response with status code', async (t) => {
    nock(BASE_URL).get('/objects/missing').reply(404, 'Not Found');
    const req = new WarehouseRequest({
      baseUrl: BASE_URL,
      username: 'u',
      password: 'p'
    });
    await t.rejects(req.get('/objects/missing'), /404/);
  });

  t.test('returns null on 204 for post', async (t) => {
    nock(BASE_URL).post('/objects').reply(204);
    const req = new WarehouseRequest({
      baseUrl: BASE_URL,
      username: 'u',
      password: 'p'
    });
    const result = await req.post('/objects', {});
    t.equal(result, null);
  });
});
