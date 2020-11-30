'use strict';

const debug = require('diagnostics')('warehouse:files');
const mime = require('mime-types');
const fs = require('fs').promises;
const path = require('path');

/**
 * @typedef {import('./index.js')} Warehouse
 */
/**
 * @constructor
 * @param {Warehouse} warehouse Reference to the Warehouse instance.
 * @param {Object} config configuration
 * @param {string} [config.root=process.cwd()] Root directory to resolve files from.
 * @public
 */
class Files {
  constructor(warehouse, { root = process.cwd() } = {}) {
    this.warehouse = warehouse;
    this.root = root;
  }

  /**
   * Read the content of the files.
   *
   * @param {string[]} [files=[]] Files to read.
   * @returns {Promise<Buffer[]>} File content as Buffer.
   * @public
   */
  async read(files = []) {
    const root = this.root;
    const content = await Promise.all(files.map(file => {
      try {
        return fs.readFile(file);
      } catch (error) {
        debug(`Unable to read ${file}: ${ error.message }, resolving from ${ root }`);
      }

      try {
        file = path.resolve(this.root, file);
        return fs.readFile(file);
      } catch (err) {
        return err;
      }
    }));

    return content.filter(Boolean);
  }

  /**
   * Create attachments configuration.
   *
   * @param {String[]} [files=[]] files to read.
   * @returns {Promise<Object>} Attachments
   * @public
   */
  async getAttachments(files = []) {
    const content = await this.read(files);

    return files.reduce(function reduce(attachments, file, i) {
      const basename = path.basename(file);
      const data = content[i];

      attachments[basename] = {
        length: data.length,
        data: data.toString('utf-8'),
        content_type: mime.lookup(file)
      }

      return attachments;
    }, {});
  }
}
