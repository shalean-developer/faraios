# T19 managed-bootstrap harness guard ONLY; no execution of services, SQL or restore.
param([string]$ContainerName = 'faraios-t19-managed-qa')
$ErrorActionPreference='Stop'
if ($ContainerName -ne 'faraios-t19-managed-qa') { throw 'Refusing non-disposable container name' }
$expected = @(
 @{ Name='postgres'; Id='sha256:d6844e71062a3c8e2f8021d644802850760ef970a45ac163ec8c9f0171075bda' },
 @{ Name='auth'; Id='sha256:839f529492d116b4e8b7777c953a27c381d34c15a744b1bcefde5eefaa1f9f9f' },
 @{ Name='storage'; Id='sha256:b8f956b64ea3aee1dfc2cd9f0c9ce8d74335405992a90281bb5a979d1d552c22' }
)
foreach ($item in $expected) {
 $raw = & docker image inspect $item.Id --format '{{json .}}'
 if ($LASTEXITCODE -ne 0 -or -not $raw) { throw "Missing image: $($item.Name)" }
 $img = $raw | ConvertFrom-Json
 if ($img.Id -ne $item.Id -or $img.Architecture -ne 'amd64' -or $img.Os -ne 'linux') { throw "Image mismatch: $($item.Name)" }
 Write-Output "$($item.Name): VERIFIED_LOCAL_IMAGE"
}
$names = @(& docker container ls --all --format '{{.Names}}')
if ($LASTEXITCODE -ne 0) { throw 'Docker container inventory failed; refusing to proceed' }
if ($names -contains $ContainerName) { throw 'Disposable container name already exists; refusing collision' }
Write-Output 'DISPOSABLE_NAME_FREE'
@(
 'VAULT_EXTENSION_NO_GO: disposable Vault extension/version and isolated availability not verified',
 'BOOTSTRAP_ACTOR_NO_GO: restricted bootstrap identity, privileges and provenance not verified',
 'MIGRATION_DIGESTS_NO_GO: complete ordered migration manifest and SHA-256 digests not verified',
 'IMAGE_CATALOG_NO_GO: only three local images checked; full pinned managed catalog and provenance not verified',
 'RESOURCE_CONTROLS_NO_GO: CPU, memory, storage, network and cleanup isolation not verified',
 'EXECUTION_NO_GO: five managed-harness prerequisites remain unverified'
) | ForEach-Object { Write-Output $_ }
