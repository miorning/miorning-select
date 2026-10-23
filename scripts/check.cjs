// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 MIORNING
'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..');
const all=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?all(path.join(dir,e.name)):[path.join(dir,e.name)]);
const files=all(path.join(root,'extension'));
for(const f of files.filter(f=>f.endsWith('.js')))cp.execFileSync(process.execPath,['--check',f],{stdio:'pipe'});
const m=JSON.parse(fs.readFileSync(path.join(root,'extension','manifest.json'),'utf8'));
if(m.manifest_version!==3||m.version!=='0.6.0')throw Error('Unexpected manifest');
if(JSON.stringify([...m.permissions].sort())!==JSON.stringify(['activeTab','scripting','storage','unlimitedStorage'].sort()))throw Error('Unexpected permissions');
for(const cs of m.content_scripts||[])for(const file of [...(cs.js||[]),...(cs.css||[])])if(!fs.existsSync(path.join(root,'extension',file)))throw Error('Missing content script: '+file);
if(!fs.existsSync(path.join(root,'extension',m.background.service_worker)))throw Error('Missing service worker');
for(const f of ['LICENSE','THIRD_PARTY_NOTICES.md','README.md','README.en.md','docs/PRIVACY.md'])if(!fs.existsSync(path.join(root,f)))throw Error('Missing release document: '+f);
console.log('Extension syntax, manifest references, permissions and release documents: passed.');
