import importlib.util,pathlib,tempfile,subprocess
root=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('rollback',root/'docs/owner-05/rollback.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
with tempfile.TemporaryDirectory() as tmp:
    d=pathlib.Path(tmp);live=d/'live';backup=d/'backup';live.mkdir();backup.mkdir()
    for n in m.MANIFEST['after']:(live/n).write_bytes((root/'account'/n).read_bytes())
    for n in m.MANIFEST['before']:(backup/n).write_bytes(subprocess.check_output(['git','show','5c95e49:account/'+n],cwd=root))
    assert m.restore(live,backup)['status']=='READY'
    p=live/'platform-directory.css';original=p.read_bytes();p.write_bytes(original+b'/* subsequent change */')
    try:m.restore(live,backup,True)
    except RuntimeError:pass
    else:raise AssertionError('Drift must refuse all writes')
    p.write_bytes(original);assert m.restore(live,backup,True)['status']=='RESTORED'
    assert all(m.digest(live/n)==h for n,h in m.MANIFEST['before'].items()) and not (live/'platform-directory.js').exists()
print({'status':'PASS','checks':4,'live_writes':0})
