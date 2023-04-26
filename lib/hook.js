/**
 * @typedef {import('./utils/request')} WarehouseRequest
 */

class HookAPI {
  /**
   * Create an instance of HookAPI
   * @param {Object} opts Constructor options
   * @param {WarehouseRequest} opts.request Instance of a WarehouseRequest
   */
  constructor({ request }) {
    this._request = request;
  }

  create({ name, env }) {
    return this._request.post(`/objects/${encodeURIComponent(name)}/envs`, {
      env
    });
  }

  list({ name }) {
    return this._request.get(`/objects/${encodeURIComponent(name)}/envs`);
  }

  get({ name, env }) {
    return this._request.get(
      `/objects/${encodeURIComponent(name)}/envs/${encodeURIComponent(env)}`
    );
  }
}

module.exports = HookAPI;
