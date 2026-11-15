from pathlib import Path
import zipfile
ROOT=Path(__file__).resolve().parents[2]
files=['index.html','about.html','pricing.html','guides/enquiry-to-invoice.html','walkthrough.css','marketing.css','FaraiOS-logo.svg','favicon.svg']
rules='''Options -Indexes
<IfModule mod_headers.c>
Header always set X-Robots-Tag "noindex, nofollow"
</IfModule>
<IfModule mod_rewrite.c>
RewriteEngine On
RewriteRule ^(?:contact|privacy|waitlist)\\.html$ https://www.faraios.com/$0 [R=302,L]
RewriteRule ^(?:features|hosting|industries|marketplace|terms)/?$ https://www.faraios.com/$0 [R=302,L]
RewriteRule ^account/(.*)$ https://www.faraios.com/account/$1 [R=302,L]
RewriteRule ^b/(.*)$ https://www.faraios.com/b/$1 [R=302,L]
</IfModule>
'''+(ROOT/'.htaccess').read_text()
out=ROOT/'release/walkthrough/walkthrough-preview.zip';out.parent.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
 for name,data in [('.htaccess',rules.encode())]+[(p,(ROOT/p).read_bytes()) for p in files]:
  i=zipfile.ZipInfo('_walkthrough-preview/'+name,(2026,11,15,0,0,0));i.create_system=3;i.external_attr=0o100644<<16;i.compress_type=zipfile.ZIP_DEFLATED;z.writestr(i,data)
with zipfile.ZipFile(out) as z:
 assert all(n.startswith('_walkthrough-preview/') and '..' not in Path(n).parts and Path(n).suffix not in ['.php','.sql'] for n in z.namelist())
print(out.relative_to(ROOT))
