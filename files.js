'use strict';

const debug = require('diagnostics')('warehouse:files');
const mime = require('mime-types');
const fs = require('fs').promises;
const crypto = require('crypto');
const path = require('path');

/**
 * @const {string} HASH_ALGORITHM Hashing algorithm used for digest.
 */
const HASH_ALGORITHM = 'sha256';

/**
 * Generate digest for file.
 *
 * @param {Buffer} content File content to hash
 * @returns {string} digest
 * @private
 */
function digest(content) {
  const hash = crypto.createHash(HASH_ALGORITHM);
  hash.update(content);

  return `${ HASH_ALGORITHM }-${ hash.digest('base64') }`;
}

/**
 * @typedef {import('./index.js')} Warehouse
 */
/**
 * @typedef {Object} File
 * @property {string} file Full filename of read content
 * @property {Buffer} data File content as Buffer
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
   * @returns {Promise<File[]>} File content and metadata.
   * @public
   */
  async read(files = []) {
    const content = await Promise.all(files.map(async file => {
      try {
        const data = await fs.readFile(file);
        return {
          file,
          data
        };
      } catch (error) {
        debug(`Unable to read ${file}: ${ error.message }, resolving from ${ this.root }`);
      }

      file = path.join(this.root, file);
      const data = await fs.readFile(file);

      return {
        file,
        data
      };
    }));

    return content;
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

    return content.reduce(function reduce(attachments, { file, data }) {
      const basename = path.basename(file);

      attachments[basename] = {
        length: data.length,
        data: data.toString('utf-8'),
        content_type: mime.lookup(file),
        digest: digest(data)
      };

      return attachments;
    }, {});
  }
}

//
// Expose the Files API.
//
module.exports = Files;
