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

  create({ name, url }) {
    return this._request.post(`/objects/${encodeURIComponent(name)}/hooks`, {
      url
    });
  }

  list({ name }) {
    return this._request.get(`/objects/${encodeURIComponent(name)}/hooks`);
  }

  get({ name, id }) {
    return this._request.get(
      `/objects/${encodeURIComponent(name)}/hooks/${encodeURIComponent(id)}`
    );
  }

  delete({ name, id }) {
    return this._request.delete(
      `/objects/${encodeURIComponent(name)}/hooks/${encodeURIComponent(id)}`
    );
  }
}

module.exports = HookAPI;
