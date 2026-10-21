# T11 — Private offline key handoff

This is the remaining owner-operated custody check for capture `6d6642b010653cc4a83adc3a56b40734`. **No offline copy is currently confirmed.** Do not post the key, hashes, screenshots or file contents. The agent cannot create or attest to a physical offline copy on your behalf.

## Prepare and copy privately

Use protected independent removable storage, with encryption/access protection and physical custody you control. Unlock it locally. A second folder on the same PC, a synced folder or an uploaded key is not this offline copy. Do not buy/activate a service or change disk-encryption settings merely by following this document; arrange suitable storage first if none is available.

In File Explorer, open `%USERPROFILE%\.faraios-recovery-keys`. Copy only `6d6642b010653cc4a83adc3a56b40734.key` to your protected removable storage. Keep the original private PC key intact and keep all key copies separate from the encrypted archive's shared/off-site location. The key is a 32-byte binary file; do not open or retype it in a text editor.

Safely eject the media, reconnect/unlock it, then verify the saved copy can be read. The following Windows PowerShell check is **read-only**: it asks you to select the existing copy, compares its bytes locally with the original, and prints fixed labels only. It does not copy, delete, upload, decrypt the archive or connect to a database.

```powershell
& {
  $ErrorActionPreference = 'Stop'
  $t11KeyDialog = $null
  try {
    $t11OriginalKey = Join-Path $env:USERPROFILE '.faraios-recovery-keys\6d6642b010653cc4a83adc3a56b40734.key'
    Add-Type -AssemblyName System.Windows.Forms
    $t11KeyDialog = New-Object System.Windows.Forms.OpenFileDialog
    $t11KeyDialog.Title = 'Select the existing recovery key COPY on protected removable storage'
    $t11KeyDialog.Filter = 'Recovery key (*.key)|*.key'
    $t11KeyDialog.CheckFileExists = $true
    if ($t11KeyDialog.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) {
      Write-Output '[KEY_COPY_NOT_SELECTED]'
      return
    }
    $t11SourceFile = Get-Item -LiteralPath $t11OriginalKey -Force
    $t11CopyFile = Get-Item -LiteralPath $t11KeyDialog.FileName -Force
    $t11Reparse = [IO.FileAttributes]::ReparsePoint
    if ($t11SourceFile.PSIsContainer -or $t11CopyFile.PSIsContainer -or
        $t11SourceFile.Length -ne 32 -or $t11CopyFile.Length -ne 32 -or
        ($t11SourceFile.Attributes -band $t11Reparse) -or
        ($t11CopyFile.Attributes -band $t11Reparse) -or
        $t11SourceFile.FullName -eq $t11CopyFile.FullName -or
        [IO.Path]::GetPathRoot($t11SourceFile.FullName) -eq [IO.Path]::GetPathRoot($t11CopyFile.FullName)) {
      Write-Output '[KEY_COPY_LOCATION_OR_FILE_INVALID]'
      return
    }
    $t11SourceHash = (Get-FileHash -LiteralPath $t11SourceFile.FullName -Algorithm SHA256).Hash
    $t11CopyHash = (Get-FileHash -LiteralPath $t11CopyFile.FullName -Algorithm SHA256).Hash
    if ($t11SourceHash -ne $t11CopyHash) {
      Write-Output '[KEY_COPY_MISMATCH]'
      return
    }
    Write-Output '[KEY_COPY_BYTES_MATCH]'
    Write-Output '[OFFLINE_CUSTODY_PENDING_PHYSICAL_CONFIRMATION]'
  } catch {
    Write-Output '[KEY_COPY_CHECK_FAILED]'
  } finally {
    if ($null -ne $t11KeyDialog) { $t11KeyDialog.Dispose() }
    Remove-Variable t11SourceHash,t11CopyHash -ErrorAction SilentlyContinue
  }
}
```

The path guard is deliberately conservative: use ordinary separate drive-letter storage. It rejects same-drive paths and individual reparse-point files, but does not prove physical independence, parent-directory safety, device encryption, persistence, malware absence or locked physical storage. Those remain the owner's checks. It is not an adversarial filesystem validator and is not an automated offline-custody attestation. If the check fails, return only its fixed label; never paste a raw exception or key.

## Complete custody

Only after `[KEY_COPY_BYTES_MATCH]`, safely eject/disconnect the verified medium and secure it under your control. Then report **`OFFLINE_KEY_VERIFIED_AND_SECURED`**. That reports byte/readability verification plus your physical custody confirmation; do not send the medium's key/path/hash or a screen capture.

If suitable storage is unavailable, report **`OFFLINE_STORAGE_UNAVAILABLE`**. T11 stays open for this mandatory gate; no risk acceptance or “Done” state is inferred from an instruction to finish. A materially different custody method must be reviewed before it replaces this check.

After custody passes, the final independent review/owner acceptance still applies to the [bounded recovery record](t11-recovery-record.md). This handoff does not authorize import, provider cleanup, paid resources, deletion, recurring backups or production activation.
