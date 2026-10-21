# T11 — Private offline key handoff

This is the owner-operated custody procedure for capture `6d6642b010653cc4a83adc3a56b40734`. **On 21 October 2026 the owner reported method B recovery comparison passed and confirmed `OFFLINE_KEY_VERIFIED_AND_SECURED`.** The agent did not observe physical storage or execute the private Windows check. Final T11 QA/owner acceptance is recorded separately. Do not post the key, hashes, passwords, screenshots or file contents. The agent cannot create or attest to a physical offline copy on your behalf.

Use method A only for an already encrypted/access-protected drive. An ordinary USB on Windows Home can use method B instead; this protects the key file, not the USB's other files. Do not copy the raw key onto an unencrypted USB.

## A — Already encrypted removable drive

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

## B — Windows Home: encrypted 7z file on an ordinary USB

This reviewed alternative uses file-level encryption rather than whole-drive BitLocker. It leaves existing USB files intact and preserves the original private PC key. Current operator environment: Windows 11 Home Single Language; USB `PATSO 8 (D:)`, 3.76 GB, reported fully decrypted; owner screenshot shows 7-Zip 26.04 x64 installed. These observations do not establish a completed key copy. Installers and format guidance come from the [official 7-Zip download page](https://www.7-zip.org/download.html) and [7z format documentation](https://www.7-zip.org/7z.html). CISA also distinguishes [file encryption and safe recovery-key storage](https://www.cisa.gov/resources-tools/training/how-protect-data-stored-your-devices) and recommends [offline encrypted backups with recovery testing](https://www.cisa.gov/stopransomware/ransomware-guide).

### Create the encrypted file

1. Confirm the physical USB is still `PATSO 8 (D:)`. If its letter changes, stop and report the new letter before using these fixed paths. Check that `D:\FaraiOS-recovery-key-6d6642b010653cc4a83adc3a56b40734.7z` does not already exist. Do not overwrite or append to an existing archive.
2. Open 7-Zip File Manager. Navigate to `C:\Users\info\.faraios-recovery-keys\`. Select **only** `6d6642b010653cc4a83adc3a56b40734.key` (32 bytes), without opening or editing it, then select **Add**.
3. In the Add to Archive dialog set the following. The destination is the encrypted archive itself, directly on the USB; never copy a raw `.key` file onto this unencrypted drive first.

| Setting | Value |
| --- | --- |
| Archive | `D:\FaraiOS-recovery-key-6d6642b010653cc4a83adc3a56b40734.7z` |
| Archive format | `7z` |
| Encryption method | `AES-256` |
| Encrypt file names | Checked |
| Password / Reenter password | The same long, unique, randomly chosen password/passphrase, entered privately |
| Show password | Unchecked |
| Delete files after compression | Unchecked |
| Create SFX archive | Unchecked |

4. Privately record the archive password so it is recoverable if this PC is unavailable, and keep that record separate from the USB. Suitable examples are a protected paper record stored separately, or an existing password manager accessible independently of this PC. Memorization alone or a PC-only password record does not establish independent recoverability. Do not put the password beside the archive, send it to the agent, or buy a new service for this step.
5. Select **OK**. Keep the original PC key intact. After password entry, share fixed status labels only; do not send screenshots of the dialog or secret values. Creation alone is not offline recovery verification.

### Reconnect, recover and compare privately

1. Close all 7-Zip windows completely. Safely eject and physically disconnect the USB, then reconnect it. Confirm the same physical device and drive letter. Launch a fresh 7-Zip File Manager and open the exact `.7z` file from the reconnected USB. It must require the privately retained password; recover that password from its independent record for this check. If access does not require a password in this fresh session, stop for review rather than declaring encryption verified.
2. Select **Test** and require a successful archive test. CRC/test success alone does not prove that the correct recovery key was saved.
3. Create a **new, private, non-synced** PC folder `C:\Users\info\.faraios-recovery-keys\usb-check-6d6642b010653cc4a83adc3a56b40734\`. If it already exists or is redirected/synced, stop and report `USB_CHECK_FOLDER_NOT_NEW`; do not overwrite a previous check. Using 7-Zip's **Extract** button, extract exactly the one key into that new folder. Do not double-click/open the binary key, extract onto the unencrypted USB, or extract into the original key's folder.
4. Run this read-only comparison in Windows PowerShell. It reads only the fixed original, freshly recovered private PC copy and exact USB archive, with no password entry, network/database action, key/hash/path output, deletion or overwrite. Do not use method A's same-drive-rejecting check for this method.

```powershell
& {
  $ErrorActionPreference = 'Stop'
  try {
    $t11Original = Join-Path $env:USERPROFILE '.faraios-recovery-keys\6d6642b010653cc4a83adc3a56b40734.key'
    $t11Recovered = Join-Path $env:USERPROFILE '.faraios-recovery-keys\usb-check-6d6642b010653cc4a83adc3a56b40734\6d6642b010653cc4a83adc3a56b40734.key'
    $t11Archive = 'D:\FaraiOS-recovery-key-6d6642b010653cc4a83adc3a56b40734.7z'
    $t11OriginalFile = Get-Item -LiteralPath $t11Original -Force
    $t11RecoveredFile = Get-Item -LiteralPath $t11Recovered -Force
    $t11ArchiveFile = Get-Item -LiteralPath $t11Archive -Force
    $t11Reparse = [IO.FileAttributes]::ReparsePoint
    if ($t11OriginalFile.PSIsContainer -or $t11RecoveredFile.PSIsContainer -or
        $t11ArchiveFile.PSIsContainer -or $t11OriginalFile.Length -ne 32 -or
        $t11RecoveredFile.Length -ne 32 -or $t11ArchiveFile.Length -le 0 -or
        ($t11OriginalFile.Attributes -band $t11Reparse) -or
        ($t11RecoveredFile.Attributes -band $t11Reparse) -or
        ($t11ArchiveFile.Attributes -band $t11Reparse) -or
        $t11OriginalFile.FullName -eq $t11RecoveredFile.FullName) {
      Write-Output '[USB_KEY_RECOVERY_LOCATION_OR_FILE_INVALID]'
      return
    }
    $t11OriginalHash = (Get-FileHash -LiteralPath $t11OriginalFile.FullName -Algorithm SHA256).Hash
    $t11RecoveredHash = (Get-FileHash -LiteralPath $t11RecoveredFile.FullName -Algorithm SHA256).Hash
    if ($t11OriginalHash -ne $t11RecoveredHash) {
      Write-Output '[USB_KEY_RECOVERY_MISMATCH]'
      return
    }
    Write-Output '[USB_KEY_RECOVERY_BYTES_MATCH]'
    Write-Output '[OFFLINE_CUSTODY_PENDING_PHYSICAL_CONFIRMATION]'
  } catch {
    Write-Output '[USB_KEY_RECOVERY_CHECK_FAILED]'
  } finally {
    Remove-Variable t11OriginalHash,t11RecoveredHash -ErrorAction SilentlyContinue
  }
}
```

This comparison checks only current file presence, key size and byte equality. It cannot prove how the extracted file was produced, fresh password prompting, archive encryption, physical independence, parent-directory safety, cloud-sync exclusion, secure custody or password recoverability. Those require the owner's actual execution and attestation above. The owner-reported run and limitations are recorded below. The verification copy remains private on the PC; this procedure does not delete it or imply secure erasure. The original remains required under the retention hold.

### Actual operator checkpoint — 21 October 2026

The owner reported `USB_KEY_ARCHIVE_CREATED` and `USB_REOPEN_TEST_PASSED` after the close/eject/reconnect/password-from-independent-record/Test instructions. The agent observed the exact D: archive with one 32-byte entry marked encrypted. The first comparison returned `USB_KEY_RECOVERY_CHECK_FAILED`; a read-only location diagnostic found all expected source/USB locations except the extracted key file. Guided extraction was followed by a replacement prompt for an existing 32-byte PC destination; the owner was instructed to cancel without replacing it. A subsequent run of the same comparison returned `USB_KEY_RECOVERY_BYTES_MATCH` and `OFFLINE_CUSTODY_PENDING_PHYSICAL_CONFIRMATION`. After explicit close/eject/unplug/secure-storage and separate password-record instructions, the owner reported `OFFLINE_KEY_VERIFIED_AND_SECURED`.

The independent operator-procedure review covered the creation and recovery instructions statically; no fixture or agent-run Windows execution is claimed. Physical custody, fresh password-record recovery and actual Windows results are owner attestations. The cancellation itself and absence of overwrites were not independently observed. Earlier failed/missing-file observations are retained rather than relabeled as passes. The [bounded recovery record](t11-recovery-record.md) carries the acceptance scope; current final sign-off is indexed in the tracker/PR, not inferred from this checkpoint.

## Complete custody

Only after method A's `[KEY_COPY_BYTES_MATCH]` or method B's `[USB_KEY_RECOVERY_BYTES_MATCH]` and its complete fresh reopen/password-recovery check, close all archive windows, safely eject/disconnect the verified medium and secure it under your control. For method B confirm that only the encrypted archive was placed on the USB and its password is recoverable independently of this PC and stored separately from the USB. Then report **`OFFLINE_KEY_VERIFIED_AND_SECURED`**. That reports byte/readability verification plus your physical custody confirmation; do not send the medium's key/path/hash, password or a screen capture.

If suitable storage is unavailable, report **`OFFLINE_STORAGE_UNAVAILABLE`**. T11 stays open for this mandatory gate; no risk acceptance or “Done” state is inferred from an instruction to finish. A materially different custody method must be reviewed before it replaces this check.

After custody passes, the final independent review/owner acceptance still applies to the [bounded recovery record](t11-recovery-record.md). This handoff does not authorize import, provider cleanup, paid resources, deletion, recurring backups or production activation.
