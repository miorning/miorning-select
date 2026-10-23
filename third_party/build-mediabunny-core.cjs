// SPDX-License-Identifier: GPL-3.0-only
// Copyright (c) 2026 MIORNING and contributors
// The emitted upstream copyright/license banner retains its original terms.
'use strict';
const fs = require('node:fs');
const path = require('node:path');

// No downloads, lifecycle scripts or optional codec packages are invoked.
// Usage: node build-mediabunny-core.cjs <extracted-core-root> <esbuild-module-dir> <output-file>
const [sourceArg, esbuildArg, outputArg] = process.argv.slice(2);
if (!sourceArg || !esbuildArg || !outputArg) {
  throw new Error('Usage: node third_party/build-mediabunny-core.cjs <extracted-core-root> <esbuild-module-dir> <output-file>');
}
const source = path.resolve(sourceArg);
const pkg = JSON.parse(fs.readFileSync(path.join(source, 'package.json'), 'utf8'));
if (pkg.name !== 'mediabunny' || pkg.version !== '1.62.0') throw new Error('Expected Mediabunny 1.62.0 sources');
const esbuild = require(path.resolve(esbuildArg));
if (esbuild.version !== '0.25.1') throw new Error('Use esbuild 0.25.1, pinned by the upstream lockfile');
esbuild.build({
  absWorkingDir: source,
  entryPoints: ['src/index.ts'],
  bundle: true,
  target: 'es2021',
  format: 'iife',
  globalName: 'Mediabunny',
  minify: true,
  logLevel: 'info',
  logOverride: { 'import-is-undefined': 'silent' },
  legalComments: 'none',
  banner: { js: `/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */` },
  footer: { js: 'if (typeof module === "object" && typeof module.exports === "object") Object.assign(module.exports, Mediabunny)' },
  outfile: path.resolve(outputArg),
}).catch(error => { console.error(error.message); process.exitCode = 1; });
