$ErrorActionPreference = 'Stop'
$stage = 'input'
try {
  $request = [Console]::In.ReadToEnd() | ConvertFrom-Json
  $bytes = [Convert]::FromBase64String($request.data)
  Add-Type -AssemblyName System.Security
  Import-Module (Join-Path $PSHOME 'Modules\Microsoft.PowerShell.Security\Microsoft.PowerShell.Security.psd1') -ErrorAction Stop
  $stage = 'operation'
  switch ($request.operation) {
    'protect' { $result = [Security.Cryptography.ProtectedData]::Protect($bytes, $null, [Security.Cryptography.DataProtectionScope]::CurrentUser) }
    'unprotect' { $result = [Security.Cryptography.ProtectedData]::Unprotect($bytes, $null, [Security.Cryptography.DataProtectionScope]::CurrentUser) }
    'secure-directory' {
      $path = [Text.Encoding]::UTF8.GetString($bytes)
      $stage = 'directory-read'
      $item = Get-Item -LiteralPath $path -Force
      for ($parent = $item; $null -ne $parent; $parent = $parent.Parent) {
        if (($parent.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'Invalid path' }
      }
      $stage = 'acl-write'
      $sid = [Security.Principal.WindowsIdentity]::GetCurrent().User
      $aclTool = Join-Path $env:SystemRoot 'System32\icacls.exe'
      $targets = @($item)
      foreach ($child in Get-ChildItem -LiteralPath $path -Force) {
        if ($child.Name -eq 'vault.dpapi' -or $child.Name -eq 'vault.lock' -or $child.Name -match '^vault-[0-9a-f-]+\.tmp$') {
          if (($child.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0 -or $child.PSIsContainer) { throw 'Invalid entry' }
          $targets += $child
        }
      }
      foreach ($target in $targets) {
        $grant = '*' + $sid.Value + ':'
        if ($target.PSIsContainer) { $grant += '(OI)(CI)F' } else { $grant += 'F' }
        & $aclTool $target.FullName '/grant:r' $grant '/inheritance:r' | Out-Null
        if ($LASTEXITCODE -ne 0) { throw 'ACL failed' }
        $acl = Get-Acl -LiteralPath $target.FullName
        foreach ($entry in $acl.Access) {
          $entrySid = $entry.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value
          if ($entrySid -ne $sid.Value) {
            & $aclTool $target.FullName '/remove' ('*' + $entrySid) | Out-Null
          } elseif ($entry.AccessControlType -eq 'Deny') {
            & $aclTool $target.FullName '/remove:d' ('*' + $entrySid) | Out-Null
          } else { continue }
          if ($LASTEXITCODE -ne 0) { throw 'ACL failed' }
        }
        $stage = 'acl-verify'
        $check = Get-Acl -LiteralPath $target.FullName
        if (-not $check.AreAccessRulesProtected -or $check.Access.Count -eq 0) { throw 'ACL failed' }
        foreach ($entry in $check.Access) {
          if ($entry.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value -ne $sid.Value -or $entry.AccessControlType -ne 'Allow') { throw 'ACL failed' }
        }
      }
      $result = [Text.Encoding]::UTF8.GetBytes('secured')
    }
    default { throw 'Invalid operation' }
  }
  [Console]::Out.Write([Convert]::ToBase64String($result))
  if ($bytes) { [Array]::Clear($bytes, 0, $bytes.Length) }
  if ($result) { [Array]::Clear($result, 0, $result.Length) }
} catch {
  [Console]::Error.Write('TEST credential protection unavailable')
  exit 1
}
