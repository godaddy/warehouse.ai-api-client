const WarehouseRequest = require('./utils/request');
const ObjectAPI = require('./object.js');
const EnvAPI = require('./env.js');
const HookAPI = require('./hook.js');

/**
 * @typedef {import('./utils/request').WarehouseConfig} WarehouseConfig
 */

class WarehouseSDK {
  /**
   * Create an instance of the Warehouse SDK
   * @param {WarehouseConfig} config Warehouse configuration
   */
  constructor({ baseUrl, username, password }) {
    this._baseUrl = baseUrl;
    this._request = new WarehouseSDK.Request({ baseUrl, username, password });
  }

  /**
   * Return the ObjectAPI instance
   * @returns {ObjectAPI}
   */
  object() {
    if (this._object) return;
    this._object = new WarehouseSDK.ObjectAPI({ request: this._request });
    return this._object;
  }

  /**
   * Return the EnvAPI instance
   * @returns {EnvAPI}
   */
  env() {
    if (this._env) return;
    this._env = new WarehouseSDK.EnvAPI({ request: this._request });
    return this._env;
  }

  /**
   * Return the HookAPI instance
   * @returns {HookAPI}
   */
  hook() {
    if (this._hook) return;
    this._hook = new WarehouseSDK.HookAPI({ request: this._request });
    return this._hook;
  }
}

WarehouseSDK.Request = WarehouseRequest;
WarehouseSDK.ObjectAPI = ObjectAPI;
WarehouseSDK.EnvAPI = EnvAPI;
WarehouseSDK.HookAPI = HookAPI;

module.exports = {
  WarehouseSDK,
  WarehouseRequest,
  ObjectAPI,
  EnvAPI,
  HookAPI
};
