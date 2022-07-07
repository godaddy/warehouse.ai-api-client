/**
 * @typedef {import('./utils/request')} WarehouseRequest
 */

class ObjectAPI {
  /**
   * Create an instance of ObjectAPI
   * @param {Object} opts Constructor options
   * @param {WarehouseRequest} opts.request Instance of a WarehouseRequest
   */
  constructor({ request }) {
    this._request = request;
  }

  create({ name, env, expiration, variant, version, data }) {
    return this._request.post('/objects', {
      name,
      env,
      expiration,
      variant,
      version,
      data
    });
  }

  get({ name, env, version, acceptedVariants }) {
    return this._request.get(`/objects/${encodeURIComponent(name)}`, {
      accepted_variants: Array.isArray(acceptedVariants)
        ? acceptedVariants.concat(',')
        : acceptedVariants,
      env,
      version
    });
  }

  setHead({ name, env, version }) {
    return this._request.put(
      `/objects/${encodeURIComponent(name)}/${encodeURIComponent(env)}`,
      {
        head: version
      }
    );
  }
}

module.exports = ObjectAPI;
