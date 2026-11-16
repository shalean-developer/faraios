"""Generate crawlable marketing headers from one template; --check detects drift."""
from pathlib import Path
import argparse,re

ROOT=Path(__file__).resolve().parents[2]
def render(path,template):
    source=path.read_text()
    if not re.search(r'<body[^>]*class="[^"]*\b(?:ui-home|ui-content)\b',source):
        return source
    base='../'*len(path.relative_to(ROOT).parts[:-1])
    source=re.sub(r'<header\b.*?</header>',lambda _:template.replace('{{base}}',base).replace('{{home}}',base or './').strip(),source,count=1,flags=re.S)
    if f'href="{base}ui/homepage-header.css?v=shared-20261116"' in source and f'src="{base}ui/site-menu.js?v=shared-20261116"' in source:
        return source
    source=re.sub(r'<link\b[^>]*href="[^"]*ui/homepage-header\.css[^"]*"[^>]*>\s*','',source)
    source=re.sub(r'<script\b[^>]*src="[^"]*ui/site-menu\.js[^"]*"[^>]*></script>\s*','',source)
    source=re.sub(r'<script>const menu=document\.querySelector\(\x27\.menu\x27\).*?</script>','',source,flags=re.S)
    assets=f'<link rel="stylesheet" href="{base}ui/homepage-header.css?v=shared-20261116">\n<script src="{base}ui/site-menu.js?v=shared-20261116" defer></script>\n'
    return source.replace('</head>',assets+'</head>',1)

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
    template=(ROOT/'ui/marketing-header.html').read_text();changed=[];count=0
    for path in sorted(list(ROOT.glob('*.html'))+list((ROOT/'industries').glob('*.html'))+list((ROOT/'guides').glob('*.html'))):
        before=path.read_text();after=render(path,template)
        if 'homepage-header' in after:count+=1
        if after!=before:
            changed.append(str(path.relative_to(ROOT)))
            if not args.check:path.write_text(after)
    if args.check and changed:raise SystemExit('Marketing header drift: '+', '.join(changed))
    print(f'{count} marketing headers '+('verified' if args.check else 'generated'))

if __name__=='__main__':main()
