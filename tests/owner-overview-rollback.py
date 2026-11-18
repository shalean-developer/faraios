import importlib.util,pathlib,tempfile,subprocess
root=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('rollback',root/'docs/owner-07/rollback.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
with tempfile.TemporaryDirectory() as tmp:
    d=pathlib.Path(tmp);live=d/'live';backup=d/'backup';live.mkdir();backup.mkdir()
    for n in m.MANIFEST['after']:(live/n).write_bytes((root/'account'/n).read_bytes())
    for n in m.MANIFEST['before']:(backup/n).write_bytes(subprocess.check_output(['git','show','1ea2b3f:account/'+n],cwd=root))
    assert m.restore(live,backup)['status']=='READY'
    p=live/'platform-navigation.php';original=p.read_bytes();p.write_bytes(original+b'changed')
    try:m.restore(live,backup,True)
    except RuntimeError:pass
    else:raise AssertionError('Installed drift must refuse all writes')
    assert (live/'platform-overview-page.php').exists()
    p.write_bytes(original);b=backup/'platform-navigation.php';old=b.read_bytes();b.write_bytes(old+b'changed')
    try:m.restore(live,backup,True)
    except RuntimeError:pass
    else:raise AssertionError('Backup drift must refuse all writes')
    b.write_bytes(old);assert m.restore(live,backup,True)['status']=='RESTORED'
    assert all(m.digest(live/n)==h for n,h in m.MANIFEST['before'].items())
    assert all(not (live/n).exists() for n in m.MANIFEST['after'] if n not in m.MANIFEST['before'])
print({'status':'PASS','checks':7,'live_writes':0})
