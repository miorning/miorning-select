# SPDX-License-Identifier: GPL-3.0-only
# Copyright (C) 2026 MIORNING
from pathlib import Path
import hashlib, json, zipfile
root = Path(__file__).resolve().parent.parent
version = json.loads((root/'extension/manifest.json').read_text(encoding='utf-8'))['version']
out = root/'dist'
out.mkdir(exist_ok=True)
files = []
for directory in ['extension','third_party','scripts','tests','docs']:
    files.extend(p for p in (root/directory).rglob('*') if p.is_file() and '__pycache__' not in p.parts)
for name in ['README.md','README.en.md','LICENSE','NOTICE.md','THIRD_PARTY_NOTICES.md','SOURCE.md','CHANGELOG.md','RELEASE-NOTES.md','package.json']:
    files.append(root/name)
assert len({p.relative_to(root).as_posix() for p in files}) == len(files)
for p in files: assert p.is_file(), p
archive = out/('MiorningSelect-v'+version+'.zip')
entries = []
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    for p in sorted(files):
        name = p.relative_to(root).as_posix()
        data = p.read_bytes()
        info = zipfile.ZipInfo(name,date_time=(2026,10,23,0,0,0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        z.writestr(info,data,compresslevel=9)
        entries.append({'file':name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    for p in files: assert z.read(p.relative_to(root).as_posix()) == p.read_bytes()
digest = hashlib.sha256(archive.read_bytes()).hexdigest()
(out/'SHA256SUMS.txt').write_text(digest+'  '+archive.name+'\n',encoding='utf-8')
report = {'version':version,'zip':archive.name,'bytes':archive.stat().st_size,'sha256':digest,'files':entries,'verified':True}
(out/'package-manifest.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k!='files'},ensure_ascii=True))
