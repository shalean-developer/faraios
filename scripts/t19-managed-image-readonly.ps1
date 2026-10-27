# T19 managed image inventory ONLY. No container starts, SQL, network or backup access.
$ErrorActionPreference = 'Stop'
$expected = @(
  @{ Name='postgres'; Id='sha256:d6844e71062a3c8e2f8021d644802850760ef970a45ac163ec8c9f0171075bda' },
  @{ Name='auth'; Id='sha256:839f529492d116b4e8b7777c953a27c381d34c15a744b1bcefde5eefaa1f9f9f' },
  @{ Name='storage'; Id='sha256:b8f956b64ea3aee1dfc2cd9f0c9ce8d74335405992a90281bb5a979d1d552c22' }
)
$fail = $false
foreach ($spec in $expected) {
  $json = & docker image inspect $spec.Id --format '{{json .}}' 2>$null
  if ($LASTEXITCODE -ne 0 -or -not $json) {
    Write-Output "$($spec.Name): MISSING"
    $fail = $true
    continue
  }
  $img = $json | ConvertFrom-Json
  if ($img.Id -ne $spec.Id -or $img.Os -ne 'linux' -or $img.Architecture -ne 'amd64') {
    Write-Output "$($spec.Name): MISMATCH"
    $fail = $true
    continue
  }
  if ($spec.Name -eq 'storage') {
    $version = @($img.Config.Env | Where-Object { $_ -eq 'VERSION=1.84.23' })
    if ($version.Count -ne 1) { Write-Output "storage: VERSION_UNVERIFIED"; $fail = $true; continue }
  }
  Write-Output "$($spec.Name): LOCAL_IMAGE_ID_AND_PLATFORM_PASS"
}
if ($fail) { exit 1 }
Write-Output 'Local inventory PASS. Source/manifest provenance, Vault, Auth worker, Storage ACL, full managed catalog and restore remain NOT VERIFIED.'
