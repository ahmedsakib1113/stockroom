"""Create the portable source download, excluding credentials and runtime state."""
from pathlib import Path
import zipfile,json
root=Path(__file__).resolve().parent.parent
with zipfile.ZipFile(root/'public'/'stockroom-source.zip','w',zipfile.ZIP_DEFLATED) as z:
 for folder in ['app','lib','db','drizzle','analytics','tests','docs','scripts','worker','public']:
  for p in (root/folder).rglob('*'):
   if p.is_file() and p.suffix not in ['.zip','.pyc'] and '__pycache__' not in p.parts:
    z.write(p,Path('stockroom')/p.relative_to(root))
 for name in ['README.md','package.json','pnpm-lock.yaml','tsconfig.json','vite.config.ts','drizzle.config.ts','cloudflare-env.d.ts','postcss.config.mjs','.gitignore']:
  p=root/name
  if p.exists():z.write(p,Path('stockroom')/name)
 z.writestr('stockroom/.openai/hosting.json',json.dumps({'d1':'DB','r2':None},indent=2))
print('Portable source packaged:',(root/'public'/'stockroom-source.zip').stat().st_size,'bytes')
