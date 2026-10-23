// SPDX-License-Identifier: GPL-3.0-only
// Copyright (c) 2026 MIORNING and contributors
// The two wrapper strings below are separately made available under MPL-2.0.
'use strict';

// Offline reconstruction of the exact browser bundle shipped in the extension.
// This wraps the verified upstream npm artifact; it does not compile TypeScript.
// Upstream TypeScript and build instructions accompany the npm archive.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');

const root = path.resolve(__dirname, '..');
const metadata = JSON.parse(fs.readFileSync(path.join(root, 'third_party', 'mediabunny-1.62.0.provenance.json'), 'utf8'));
const mode = process.argv[2] || '--check';
if (!['--check', '--write'].includes(mode)) {
  throw new Error('Usage: node scripts/vendor-mediabunny.cjs [--check|--write]');
}
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

function checkedArchive(record) {
  if (path.basename(record.file) !== record.file) throw new Error('Invalid archive filename');
  const bytes = fs.readFileSync(path.join(root, 'third_party', record.file));
  if (sha256(bytes) !== record.sha256) throw new Error('SHA-256 mismatch: ' + record.file);
  if (record.integrity) {
    const actual = 'sha512-' + crypto.createHash('sha512').update(bytes).digest('base64');
    if (actual !== record.integrity) throw new Error('npm integrity mismatch: ' + record.file);
  }
  return bytes;
}

// Only read archive entries in memory. Do not execute package lifecycle scripts
// or extract archive-controlled paths to the filesystem.
function npmEntries(archive) {
  const tar = zlib.gunzipSync(archive);
  const entries = new Map();
  const text = (start, length) => tar.subarray(start, start + length).toString('utf8').replace(/\0.*$/s, '');
  for (let offset = 0; offset + 512 <= tar.length;) {
    const name = text(offset, 100);
    if (!name) break;
    const prefix = text(offset + 345, 155);
    const fullName = prefix ? prefix + '/' + name : name;
    const size = parseInt(text(offset + 124, 12).trim() || '0', 8);
    if (!Number.isSafeInteger(size) || size < 0 || offset + 512 + size > tar.length) {
      throw new Error('Malformed npm archive');
    }
    const type = tar[offset + 156];
    if (type === 0 || type === 48) entries.set(fullName, tar.subarray(offset + 512, offset + 512 + size));
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  return entries;
}

const entries = npmEntries(checkedArchive(metadata.npm));
checkedArchive(metadata.source);
const get = name => {
  const bytes = entries.get('package/' + name);
  if (!bytes) throw new Error('Missing npm entry: ' + name);
  return bytes;
};
const pkg = JSON.parse(get('package.json').toString('utf8'));
if (pkg.name !== 'mediabunny' || pkg.version !== '1.62.0') throw new Error('Unexpected package/version');

// SPDX-License-Identifier for the emitted wrapper glue: MPL-2.0
const prefix = '/* Mediabunny 1.62.0, MPL-2.0. Unmodified browser CJS bundle in a global wrapper. See accompanying LICENSE and NOTICE. */\n(function(){const exports={};const module={exports};\n';
const suffix = '\nglobalThis.MSMediaPackets=module.exports;})();\n';
const bundle = Buffer.concat([Buffer.from(prefix), get('dist/bundles/mediabunny.min.cjs'), Buffer.from(suffix)]);
if (sha256(bundle) !== metadata.integration.sha256) throw new Error('Wrapped bundle differs from verified release');
const outputs = [
  ['mediabunny-1.62.0.js', bundle],
  ['mediabunny-1.62.0.LICENSE.txt', get('LICENSE')],
];
const target = path.join(root, 'extension', 'vendor');
if (mode === '--write') fs.mkdirSync(target, { recursive: true });
for (const [name, bytes] of outputs) {
  const file = path.join(target, name);
  if (mode === '--write') fs.writeFileSync(file, bytes);
  if (!fs.existsSync(file) || !fs.readFileSync(file).equals(bytes)) throw new Error('Not reproducible: ' + name);
  console.log('Verified ' + name + ' (' + sha256(bytes) + ')');
}
console.log('Verified npm and build-source archives. No network access or third-party build scripts were used.');
