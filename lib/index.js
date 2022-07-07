const WarehouseRequest = require('./utils/request');
const ObjectAPI = require('./object.js');

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
   * Return the ObjectAPI onstance
   * @returns {ObjectAPI}
   */
  object() {
    if (this._object) return;
    this._object = new WarehouseSDK.ObjectAPI({ request: this._request });
    return this._object;
  }
}

WarehouseSDK.Request = WarehouseRequest;
WarehouseSDK.ObjectAPI = ObjectAPI;

module.exports = {
  WarehouseSDK,
  WarehouseRequest,
  ObjectAPI
};
