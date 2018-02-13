const clone = require('clone');

exports.heads = clone(require('./heads.json'));

exports.missingFiles = clone(exports.heads).map(head => {
  head.recommended = head.recommended.slice(1);
  return head;
});

