"""Prepare a guarded, non-served preview payload; never upload or execute SQL."""
from pathlib import Path
import hashlib,json,subprocess,sys
BASE=Path(__file__).resolve().parent;ROOT=BASE.parents[1]
def digest(data):return hashlib.sha256(data).hexdigest()
def build(destination):
 destination=Path(destination)
 if destination.exists():raise ValueError('Destination must be new')
 packet=json.loads((ROOT/'docs/v1-017/manifest.json').read_text());recorded={r['path']:r for r in packet['files']}
 # V1-005 installed later than V1-017; its recorded preview hashes supersede only these two paths.
 later={'account/core.php':'1db5adbdde7e11a97e596e048ce7903b7718d9f2f8a0699f995d0d988c290403','account/bookings.php':'0e43565ea592e26e05f139c57e340d85bbe3b16f5d39c076f6b22de866e4ed7e'}
 aliases="if(in_array($path,['/rest/v1/rpc/business_delegate_command',"
 adapted="if(in_array($path,['/rest/v1/rpc/business_delegate_command_preview_d0106','/rest/v1/rpc/business_delegate_page_preview_d0106','/rest/v1/rpc/business_delegate_command',"
 entries=[]
 for p in sorted((BASE/'runtime').rglob('*')):
  if not p.is_file():continue
  rel=str(p.relative_to(BASE/'runtime'));data=p.read_bytes();old=None
  if rel in later:
   old=(ROOT/'docs/v1-005/runtime'/rel).read_text()
   if rel=='account/core.php':
    if old.count(aliases)!=1:raise ValueError('Preview alias source drift')
    old=old.replace(aliases,adapted)
    data=data.decode().replace(aliases,adapted).encode()
   else:old=old.replace('../ui/design-system.css','../../ui/design-system.css');data=data.decode().replace('../ui/design-system.css','../../ui/design-system.css').encode()
   old=old.encode()
   if digest(old)!=later[rel]:raise ValueError('V1-005 recorded preview drift: '+rel)
  elif rel in ['account/enquiries.php','account/quotes.php','account/invoices.php']:
   record=recorded['_accounts-preview/'+rel];frozen={r['path']:r for r in json.loads((BASE/'preview-preimages.json').read_text())};old=frozen['_accounts-preview/'+rel]['content'].encode()
   if digest(old)!=record['sha256']:raise ValueError('V1-017 preview preimage drift')
   text=old.decode();position=text.index('</h1>')+len('</h1>');text=text[:position]+'<p><a href="communications.php">Review messages</a></p>'+text[position:]
   if rel=='account/enquiries.php':text=text.replace("</li><?php endforeach;?></ul><small>Provider acceptance", "<?php if(!empty($mail['error'])):?> · <?=esc($mail['error'])?>. Check delivery with support before any manual recovery; do not resend uncertain messages.<?php endif;?></li><?php endforeach;?></ul><small>Provider acceptance")
   data=text.encode()
  elif rel=='account/communications.php':data=data.decode().replace('../ui/design-system.css','../../ui/design-system.css').encode()
  out=destination/rel;out.parent.mkdir(parents=True,exist_ok=True);out.write_bytes(data)
  entries.append(dict(path='_accounts-preview/'+rel,previous_sha256=digest(old)if old else None,candidate_sha256=digest(data)))
 result=dict(task='V1-010',scope='synthetic A/preview only; no outbound authorization',files=entries,sql_sha256=digest((BASE/'install.sql').read_bytes()),immediate_hosted_drift_check_required=True,hosted_installation=False)
 (destination/'preview-manifest.json').write_text(json.dumps(result,indent=2)+'\n')
 return result
if __name__=='__main__':print(json.dumps(build(sys.argv[1]),indent=2))
