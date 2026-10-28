# T19 Gate 2 LOCAL disposable acceptance. Requires a NEW, separate exact-run approval.
# Runs ONLY on the operator's Docker host. Never connects to hosted resources.
[CmdletBinding()]
param([switch]$ApproveDisposableRun,[string]$EvidenceDirectory = ".\t19-gate2-evidence")
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if (-not $ApproveDisposableRun) { throw 'EXECUTION_NO_GO: exact-run approval required. No Docker operation performed.' }
$image = 'sha256:d6844e71062a3c8e2f8021d644802850760ef970a45ac163ec8c9f0171075bda'
$name = 'faraios-t19-managed-qa'
$nonce = [guid]::NewGuid().ToString('N')
$containerId = $null
$receiptPath = $null
$created = $false
$cleaned = $false
$passed = $false
$errors = [System.Collections.Generic.List[string]]::new()
function DockerRead([string[]]$arguments) {
  $out = & docker @arguments 2>&1
  if ($LASTEXITCODE -ne 0) { throw "Docker command failed: $($arguments -join ' ') :: $out" }
  return ($out | Out-String).Trim()
}
function Inspect([string]$id) {
  $json = DockerRead @('container','inspect',$id)
  $value = @(ConvertFrom-Json -InputObject $json)
  if ($value.Count -ne 1) { throw 'INSPECT_COUNT_MISMATCH' }
  return $value[0]
}
function Owned([object]$obj,[string]$id,[string]$runNonce) {
  return ($obj.Id -ceq $id -and $obj.Name -ceq "/$name" -and
    $obj.Config.Image -ceq $image -and
    $obj.Config.Labels.'faraios.t19.run-nonce' -ceq $runNonce)
}
function Readback([object]$obj) {
  $h=$obj.HostConfig
  $limits = ($h.NetworkMode -eq 'none' -and $h.ReadonlyRootfs -eq $true -and
    [int64]$h.Memory -eq 536870912 -and [int64]$h.MemorySwap -eq 536870912 -and
    [int64]$h.NanoCpus -eq 1000000000 -and [int64]$h.PidsLimit -eq 64 -and
    $h.Privileged -eq $false -and $h.PublishAllPorts -eq $false -and
    @($h.Binds).Where({$_}).Count -eq 0 -and
    @($h.PortBindings.PSObject.Properties).Count -eq 0)
  $mounts = @($obj.Mounts).Where({$_.Type -ne 'tmpfs'})
  return ($limits -and $mounts.Count -eq 0 -and $obj.Config.User -eq '100:101')
}
try {
  $existing = DockerRead @('container','ls','--all','--no-trunc','--filter',"name=^/$name$",'--format','{{.ID}}')
  if ($existing) { throw 'NAME_COLLISION: existing container is untouched' }
  $localImage = DockerRead @('image','inspect',$image,'--format','{{.Id}}')
  if ($localImage -ne $image) { throw 'PINNED_IMAGE_MISMATCH' }
  $folder=[IO.Path]::GetFullPath($EvidenceDirectory)
  [IO.Directory]::CreateDirectory($folder) | Out-Null
  $receiptPath=[IO.Path]::Combine($folder,"$nonce.json")
  $args = @('create','--name',$name,'--pull','never','--network','none',
    '--read-only','--cpus','1','--memory','512m','--memory-swap','512m','--pids-limit','64',
    '--cap-drop','ALL','--security-opt','no-new-privileges:true',
    '--user','100:101','--label',"faraios.t19.run-nonce=$nonce",
    '--tmpfs','/var/lib/postgresql/data:rw,nosuid,uid=100,gid=101,mode=0700,size=384m',
    '--tmpfs','/var/run/postgresql:rw,nosuid,uid=100,gid=101,mode=0775,size=32m',
    '--tmpfs','/tmp:rw,nosuid,uid=100,gid=101,mode=1777,size=32m',
    '-e','POSTGRES_HOST_AUTH_METHOD=trust', $image)
  $containerId = DockerRead $args
  if ($containerId -notmatch '^[a-f0-9]{64}$') { throw 'INVALID_CREATE_RESULT: manual review required' }
  $created = $true
  $record = @{version=1; id=$containerId;nonce=$nonce;name=$name;image=$image;state='CREATED';createdUtc=[DateTime]::UtcNow.ToString('o')}
  $stream = [IO.File]::Open($receiptPath,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
  try { $bytes=[Text.Encoding]::UTF8.GetBytes(($record|ConvertTo-Json -Compress));$stream.Write($bytes,0,$bytes.Length);$stream.Flush($true) }
  finally { $stream.Dispose() }
  $before=Inspect $containerId
  if (-not (Owned $before $containerId $nonce)) { throw 'OWNERSHIP_MISMATCH_PRE_START' }
  if (-not (Readback $before)) { throw 'RESOURCE_READBACK_MISMATCH' }
  [void](DockerRead @('container','start',$containerId))
  $ready=$false
  for ($i=0; $i -lt 20; $i++) {
    Start-Sleep -Seconds 1
    $state=Inspect $containerId
    if (-not (Owned $state $containerId $nonce)) { throw 'OWNERSHIP_MISMATCH_DURING_RUN' }
    if (-not $state.State.Running) { break }
    & docker exec $containerId pg_isready -U supabase_admin -h /var/run/postgresql *> $null
    if ($LASTEXITCODE -eq 0) { $ready=$true; break }
  }
  $logfile=[IO.Path]::Combine($folder,"$nonce.log")
  (DockerRead @('container','logs',$containerId)) | Set-Content -Path $logfile
  if (-not $ready) { throw 'STARTUP_NOT_READY_WITHIN_20_SECONDS: retain logs' }
  $verify=Inspect $containerId
  if (-not (Owned $verify $containerId $nonce) -or -not (Readback $verify)) { throw 'POST_START_READBACK_MISMATCH' }
  $passed=$true
} catch { $errors.Add($_.Exception.Message) }
finally {
  if ($created -and $containerId) {
    try {
      $c=Inspect $containerId
      if (-not (Owned $c $containerId $nonce)) { throw 'QUARANTINE: ownership mismatch; no deletion' }
      if ($c.State.Running) {
        [void](DockerRead @('container','stop','--time','10',$containerId))
        $c=Inspect $containerId
      }
      if ($c.State.Running -or -not (Owned $c $containerId $nonce)) { throw 'QUARANTINE: unsafe stopped state' }
      if (-not $receiptPath -or -not [IO.File]::Exists($receiptPath)) { throw 'QUARANTINE: missing durable receipt' }
      $receipt=Get-Content -Raw $receiptPath | ConvertFrom-Json
      if ($receipt.id -cne $containerId -or $receipt.nonce -cne $nonce) { throw 'QUARANTINE: receipt mismatch' }
      [void](DockerRead @('container','rm',$containerId))
      $stillThere = DockerRead @('container','ls','--all','--no-trunc','--filter',"id=$containerId",'--format','{{.ID}}')
      if ($stillThere) { throw 'CONTAINER_REMAINS_AFTER_CLEANUP' }
      $cleaned=$true
    } catch { $errors.Add($_.Exception.Message) }
  }
  $status = if ($passed -and $cleaned) {'PASS'} elseif (-not $cleaned -and $created) {'QUARANTINE'} else {'FAIL'}
  Write-Output ("T19_GATE2_STARTUP_{0}; container={1}; nonce={2}; evidence={3}" -f $status,$containerId,$nonce,$receiptPath)
  foreach ($e in $errors) { Write-Output "T19_GATE2_ERROR: $e" }
  if ($status -ne 'PASS') { $global:LASTEXITCODE=1 } else { $global:LASTEXITCODE=0 }
}
