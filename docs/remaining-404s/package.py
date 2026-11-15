"""Create a static-only, noindex preview archive with bounded extraction paths."""
from pathlib import Path
import zipfile,sys
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(Path(__file__).parent))
from build import INDUSTRIES
pages=['terms.html','pricing.html','marketplace.html','industries.html','index.html','features.html','hosting.html']+[str(p.relative_to(ROOT)) for p in sorted((ROOT/'industries').glob('*.html'))]
files=pages+['marketing.css','FaraiOS-logo.svg','favicon.svg']
prefix='_recovery-preview/'
rules=r'''Options -Indexes
<IfModule mod_headers.c>
Header always set X-Robots-Tag "noindex, nofollow"
</IfModule>
<IfModule mod_rewrite.c>
RewriteEngine On
RewriteRule ^(?:about|contact|privacy|waitlist)\.html$ https://www.faraios.com/$0 [R=302,L]
RewriteRule ^account/(.*)$ https://www.faraios.com/account/$1 [R=302,L]
RewriteRule ^b/(.*)$ https://www.faraios.com/b/$1 [R=302,L]
</IfModule>
'''+(ROOT/'.htaccess').read_text()
out=ROOT/'release/remaining-404s/preview.zip';out.parent.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
    for name,data in [('.htaccess',rules.encode())]+[(p,(ROOT/p).read_bytes()) for p in files]:
        info=zipfile.ZipInfo(prefix+name,(2026,11,15,0,0,0));info.create_system=3;info.external_attr=0o100644<<16;info.compress_type=zipfile.ZIP_DEFLATED;z.writestr(info,data)
with zipfile.ZipFile(out) as z:
    assert all(n.startswith(prefix) and '..' not in Path(n).parts for n in z.namelist())
    assert not any(Path(n).suffix in ('.php','.sql') for n in z.namelist())
print(out.relative_to(ROOT))
