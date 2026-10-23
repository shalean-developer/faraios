#!/usr/bin/python3
"""WSL Linux process -> existing local Windows Docker CLI; bind paths only.

No Docker commands, names, endpoints, SQL, environment values or security options
are changed. No argument logging (the fixtures use synthetic passwords).
"""
import csv
import io
import os
import subprocess
import sys

args = sys.argv[1:]
for i, arg in enumerate(args):
    if i and args[i - 1] == '--mount':
        parts = next(csv.reader([arg]))
        for j, part in enumerate(parts):
            if part.startswith(('src=/mnt/c/', 'source=/mnt/c/')):
                key, path = part.split('=', 1)
                path = subprocess.check_output(['/usr/bin/wslpath', '-w', path], text=True).strip()
                parts[j] = key + '=' + path
        result = io.StringIO()
        csv.writer(result, lineterminator='').writerow(parts)
        args[i] = result.getvalue()
binary = '/mnt/c/Program Files/Docker/Docker/resources/bin/docker.exe'
# Docker --env NAME reads the Windows client's environment. Explicitly forward
# PG and explicitly requested --env NAME variables; preserve values.
forward = {args[i + 1] for i, value in enumerate(args[:-1]) if value == '--env' and '=' not in args[i + 1] and args[i + 1] in os.environ}
forward.update(key for key in os.environ if key.startswith('PG'))
os.environ['WSLENV'] = ':'.join(sorted(forward))
os.execv(binary, [binary, '--context', 'desktop-linux', *args])
