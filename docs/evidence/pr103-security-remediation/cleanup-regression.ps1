$ErrorActionPreference='Stop'
$e=Join-Path $PSScriptRoot '.'
$image='postgres:17.11-bookworm@sha256:3645570cccdfa447589da9f57dd740faa29b30938e861289a5574b6ca6b03826'
$results=@()
foreach($mode in @('historical','corrected')) {
  $name='faraios-pr103-cleanup-'+$mode+'-'+[DateTime]::UtcNow.ToString('yyyyMMddHHmmssfff')
  $id=docker run --detach --rm --network none --cpus 1 --memory 128m --cap-drop ALL --security-opt no-new-privileges --name $name --entrypoint /bin/sh $image -c 'sleep 120'
  if($LASTEXITCODE){throw 'Fixture startup failed'}
  $v=docker inspect $id --format '{{json .}}' | ConvertFrom-Json
  $volumes=@($v.Mounts | Where-Object Type -eq volume | ForEach-Object Name)
  if($volumes.Count -ne 1){throw 'Expected one anonymous volume'}
  $record=[ordered]@{mode=$mode;containerId=$v.Id;containerName=$v.Name;image=$v.Image;volumes=$volumes;capturedBeforeRemoval=$true}
  $record | ConvertTo-Json | Set-Content (Join-Path $e ($mode+'-ownership.json'))
  if($mode -eq 'historical'){$null=docker rm --force $id}else{$null=docker rm --force --volumes $id}
  if($LASTEXITCODE){throw 'Container cleanup failed'}
  $present=@(docker volume ls --format '{{.Name}}')
  $left=@($volumes | Where-Object {$_ -in $present})
  $record['remainingAfterCommand']=$left.Count
  foreach($volume in $left) {
    if(@(docker ps -aq --filter "volume=$volume").Count){throw 'Still attached'}
    $null=docker volume rm $volume
    if($LASTEXITCODE){throw 'Supplemental cleanup failed'}
  }
  $record['finalAbsent']=@($volumes | Where-Object {$_ -in @(docker volume ls --format '{{.Name}}')}).Count -eq 0
  $results+=$record
}
$results | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $e 'cleanup-regression.json')
if(!$results[1].finalAbsent -or $results[1].remainingAfterCommand -ne 0){throw 'Corrected cleanup regression failed'}
Write-Output ('HISTORICAL_VOLUME_REMAINDER='+$results[0].remainingAfterCommand)
Write-Output 'CORRECTED_ANONYMOUS_VOLUME_CLEANUP=PASS'
Write-Output 'PRE_REMOVAL_OWNERSHIP_CAPTURE=PASS'
