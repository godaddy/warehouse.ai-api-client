const tap = require('tap');
const path = require('path');
const os = require('os');
const { promises: fs } = require('fs');
const {
  expToTimestamp,
  getFileStats,
  getFilesAndDir,
  createTarball
} = require('./file');

tap.test('expToTimestamp', async (t) => {
  t.test('converts string duration to milliseconds', async (t) => {
    t.equal(expToTimestamp('2h'), 7200000);
    t.equal(expToTimestamp('1d'), 86400000);
  });

  t.test('returns number as-is', async (t) => {
    t.equal(expToTimestamp(5000), 5000);
    t.equal(expToTimestamp(0), 0);
  });
});

tap.test('getFileStats', async (t) => {
  t.test('throws File not found for non-existent path', async (t) => {
    await t.rejects(
      getFileStats('/nonexistent/wrhs-test-path'),
      /File not found/
    );
  });

  t.test('returns stats for existing file', async (t) => {
    const stats = await getFileStats(__filename);
    t.ok(stats.isFile());
  });
});

tap.test('getFilesAndDir', async (t) => {
  t.test('returns file name and directory for a file path', async (t) => {
    const { files, dir } = await getFilesAndDir(__filename);
    t.same(files, [path.basename(__filename)]);
    t.equal(dir, path.dirname(__filename));
  });

  t.test('returns file list and dir for a directory path', async (t) => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wrhs-test-'));
    await fs.writeFile(path.join(tmpDir, 'a.txt'), 'a');
    await fs.writeFile(path.join(tmpDir, 'b.txt'), 'b');
    await fs.mkdir(path.join(tmpDir, 'subdir'));

    const { files, dir } = await getFilesAndDir(tmpDir);
    t.same(files.sort(), ['a.txt', 'b.txt']);
    t.equal(dir, tmpDir);

    await fs.rm(tmpDir, { recursive: true });
  });

  t.test('throws for non-existent path', async (t) => {
    await t.rejects(
      getFilesAndDir('/nonexistent/wrhs-test-path'),
      /File not found/
    );
  });
});

tap.test('createTarball', async (t) => {
  t.test(
    'creates a tarball and returns path and cleanup function',
    async (t) => {
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wrhs-test-'));
      await fs.writeFile(path.join(tmpDir, 'test.txt'), 'hello');

      const { tarPath, deleteTarball } = await createTarball(tmpDir, [
        'test.txt'
      ]);
      const stats = await fs.stat(tarPath);
      t.ok(stats.isFile());
      t.ok(stats.size > 0);
      deleteTarball();

      await fs.rm(tmpDir, { recursive: true });
    }
  );
});
