$ErrorActionPreference='Stop'
$taskRoot=Join-Path $PWD '.t19-ci-hardening-build/windows'
New-Item -ItemType Directory -Force $taskRoot | Out-Null
tar -xf .t19-ci-hardening-build/candidate.tar -C $taskRoot
if($LASTEXITCODE -ne 0){throw 'Archive extraction failed'}
$env:PATH='C:\Users\info\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;'+$env:PATH
Get-ChildItem Env: | Where-Object Name -Match '^(PG|DATABASE_URL$|FARAIOS_|SUPABASE_|T16_|T19_|NODE_OPTIONS$|NODE_AUTH_TOKEN$|NPM_TOKEN$|NPM_CONFIG_)' | ForEach-Object {Remove-Item ('Env:'+ $_.Name)}
$emptyUser=Join-Path $PWD '.t19-ci-hardening-build/npm-user-empty'
$emptyGlobal=Join-Path $PWD '.t19-ci-hardening-build/npm-global-empty'
[IO.File]::WriteAllText($emptyUser,'')
[IO.File]::WriteAllText($emptyGlobal,'')
$env:NPM_CONFIG_USERCONFIG=$emptyUser
$env:NPM_CONFIG_GLOBALCONFIG=$emptyGlobal
Set-Location $taskRoot
Write-Output 'CANDIDATE=90dbc74933357b9e9ca257c08c9616b1b3ade96e'
[DateTime]::UtcNow.ToString('o')
node --version
npm --version
npm ci --ignore-scripts
if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}
foreach($file in @('setup-zoho-staging.mjs','verify-staging-access.mjs','backup-staging.mjs','restore-diagnostic.mjs','restore-constraint.mjs','clear-restore-staff-sessions.mjs')){
 node --check "scripts/$file"
 if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}
}
Write-Output 'SIX_SYNTAX_CHECKS_PASS'
node --test test/zoho-setup.test.js test/staging-access-verifier.test.js test/staging-backup.test.js test/isolated-restore.test.js test/restore-diagnostic.test.js test/restore-constraint.test.js test/restore-session-recovery.test.js
$result=$LASTEXITCODE
[DateTime]::UtcNow.ToString('o')
exit $result
