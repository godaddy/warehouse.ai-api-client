const { promises: fs } = require('fs');
const path = require('path');
const os = require('os');
const ms = require('ms');
const tar = require('tar');
const tmp = require('tmp');

/**
 * @typedef {import('fs').Stats} FSStats
 */
/**
 * @typedef {Object} CreateTarballResult
 * @property {string} tarPath Absolue path to the tarball file
 * @property {function} deleteTarball Callback method for cleaning up file
 */
/**
 * @typedef {Object} GetFilesAndDirResult
 * @property {string[]} files Array of file names
 * @property {string} dir Directory path
 */

/**
 * Resolves ~ in file path
 * @private
 * @param {string} filepath Path to the file or folder
 * @returns {string} Resolved
 */
function _resolveHome(filepath) {
  if (filepath[0] === '~') {
    return path.join(os.homedir(), filepath.slice(1));
  }
  return filepath;
}

/**
 * Get file stats using fs.stats
 * @param {string} filepath Path to the file or folder
 * @returns {Promise<FSStats>} Promise representing the file stats
 */
async function getFileStats(filepath) {
  let stats;
  try {
    stats = await fs.stat(filepath);
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(`File not found: ${filepath}`);
    }
    throw err;
  }

  return stats;
}

/**
 * Get files and directory for file path
 * @param {string} filepath Path to the file or folder
 * @returns {Promise<GetFilesAndDirResult>} Promise rappresenting the file stats
 */
async function getFilesAndDir(filepath) {
  let safePath = _resolveHome(filepath);
  if (!path.isAbsolute(safePath)) {
    safePath = path.join(process.cwd(), safePath);
  }
  const stats = await getFileStats(safePath);
  let files;
  let dir;
  if (stats.isDirectory()) {
    const dirents = await fs.readdir(safePath, { withFileTypes: true });
    // Ignore subfolders
    files = dirents
      .filter((dirent) => dirent.isFile())
      .map((dirent) => dirent.name);
    dir = safePath;
  } else {
    files = [path.basename(safePath)];
    dir = path.dirname(safePath);
  }
  return { files, dir };
}

/**
 * Create a tarball and return the path to the file
 * @param {string} dir Directory path
 * @param {string[]} files Array of file names
 * @returns {Promise<CreateTarballResult>} Promise rappresenting the absolute path to the tarball and a clean up callback
 */
async function createTarball(dir, files) {
  const { tarDir, deleteTarDir } = await new Promise((resolve, reject) => {
    tmp.dir({ unsafeCleanup: true }, (err, tmpDir, cleanupCb) => {
      if (err) return reject(err);
      resolve({ tarDir: tmpDir, deleteTarDir: cleanupCb });
    });
  });

  const tarPath = path.join(tarDir, 'tarball.tgz');

  try {
    await tar.c(
      {
        file: tarPath,
        follow: false,
        cwd: dir
      },
      files
    );
  } catch (err) {
    deleteTarDir();
    throw err;
  }

  return { tarPath, deleteTarball: deleteTarDir };
}

/**
 * Safely convert expiration to timestamp in milliseconds.
 * @param {string|number} exp Expiration in ms or human readable format
 * @returns {number} Expiration timestamp in milliseconds
 */
function expToTimestamp(exp) {
  if (typeof exp === 'string') {
    return ms(exp);
  }
  return exp;
}

module.exports = {
  createTarball,
  expToTimestamp,
  getFilesAndDir,
  getFileStats
};
