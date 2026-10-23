# Requires PowerShell 7. Never pass a secret as a parameter.
[CmdletBinding()]
param([string]$ManifestPath, [string]$ManifestSha256)

function Invoke-T19ImportChild {
    param([string]$NodePath, [string]$RunnerPath, [string[]]$ChildArguments,
          [AllowNull()][string]$InputJson, [int]$TimeoutMilliseconds = 30000)
    $process = $null
    try {
        $start = [Diagnostics.ProcessStartInfo]::new()
        $start.FileName = $NodePath
        $start.UseShellExecute = $false
        $start.CreateNoWindow = $true
        $start.RedirectStandardInput = $true
        $start.RedirectStandardOutput = $true
        $start.RedirectStandardError = $true
        $start.StandardInputEncoding = [Text.UTF8Encoding]::new($false)
        # Prevent inherited Node injection/debug options from capturing input.
        [void]$start.Environment.Remove('NODE_OPTIONS')
        [void]$start.Environment.Remove('NODE_PATH')
        [void]$start.Environment.Remove('NODE_DEBUG')
        $start.ArgumentList.Add($RunnerPath)
        foreach ($argument in $ChildArguments) { $start.ArgumentList.Add($argument) }
        $process = [Diagnostics.Process]::new()
        $process.StartInfo = $start
        if (-not $process.Start()) { throw 'Rejected' }
        $stdout = $process.StandardOutput.ReadToEndAsync()
        $stderr = $process.StandardError.ReadToEndAsync()
        if ($null -ne $InputJson) {
            if (-not $process.StandardInput.WriteAsync($InputJson).Wait($TimeoutMilliseconds)) { throw 'Rejected' }
        }
        $process.StandardInput.Close()
        if (-not $process.WaitForExit($TimeoutMilliseconds)) { throw 'Rejected' }
        if (-not $stdout.Wait($TimeoutMilliseconds) -or -not $stderr.Wait($TimeoutMilliseconds)) { throw 'Rejected' }
        # Never echo child output or exceptions: it may contain sensitive material.
        if ($process.ExitCode -ne 0 -or $stderr.Result.Length -ne 0) { throw 'Rejected' }
        return $stdout.Result.Trim()
    } catch { throw 'T19 private-pipe operation rejected.' }
    finally {
        if ($null -ne $process) {
            try { if (-not $process.HasExited) { $process.Kill($true); [void]$process.WaitForExit(5000) } } catch { }
            $process.Dispose()
        }
        $InputJson = $null
    }
}

function Invoke-T19MaskedImport {
    param([string]$NodePath, [string]$RunnerPath, [string]$ManifestFile, [string]$ApprovedHash,
          [int]$TimeoutMilliseconds = 30000)
    $secure = $null; $pointer = [IntPtr]::Zero; $plain = $null; $json = $null
    try {
        if ($PSVersionTable.PSVersion.Major -lt 7 -or $ApprovedHash -cnotmatch '^[a-f0-9]{64}$') { throw 'Rejected' }
        $fullPath = [IO.Path]::GetFullPath($ManifestFile)
        if ((Get-Item -LiteralPath $fullPath).Length -gt 32768) { throw 'Rejected' }
        if ((Get-FileHash -LiteralPath $fullPath -Algorithm SHA256).Hash.ToLowerInvariant() -cne $ApprovedHash) { throw 'Rejected' }
        $manifest = [IO.File]::ReadAllText($fullPath) | ConvertFrom-Json
        if ($manifest.custodyVerification.deviceName -ine [Environment]::MachineName -or
            $manifest.custodyVerification.windowsAccount -ine [Security.Principal.WindowsIdentity]::GetCurrent().Name) { throw 'Rejected' }
        if ($manifest.clientId -cnotmatch '^[A-Za-z0-9.\-_]{1,200}$') { throw 'Rejected' }
        $common = @(('--manifest=' + $fullPath), ('--execute-approved=' + $ApprovedHash))
        $receipt = Invoke-T19ImportChild -NodePath $NodePath -RunnerPath $RunnerPath -ChildArguments ($common + @('--check-import=' + $manifest.clientId)) -TimeoutMilliseconds $TimeoutMilliseconds
        if ($receipt -cne 'TEST import gate validated; no storage or provider access performed.') { throw 'Rejected' }
        # Only interactive, masked input; no plaintext secret parameter or file source.
        $secure = Read-Host 'Enter the approved TEST client secret (masked)' -AsSecureString
        if ($null -eq $secure -or $secure.Length -eq 0 -or $secure.Length -gt 4096) { throw 'Rejected' }
        $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
        $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
        if ($plain -match '[\r\n\x00]') { throw 'Rejected' }
        $json = @{clientSecret = $plain} | ConvertTo-Json -Compress
        if ([Text.Encoding]::UTF8.GetByteCount($json) -gt 16384) { throw 'Rejected' }
        $receipt = Invoke-T19ImportChild -NodePath $NodePath -RunnerPath $RunnerPath -ChildArguments ($common + @('--import-client=' + $manifest.clientId)) -InputJson $json -TimeoutMilliseconds $TimeoutMilliseconds
        if ($receipt -cne 'TEST client stored; no provider request performed.') { throw 'Rejected' }
        Write-Output 'TEST client stored; no provider request performed.'
    } catch { throw 'T19 masked import rejected; no diagnostic secret output is available.' }
    finally {
        if ($pointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
        if ($null -ne $secure) { $secure.Dispose() }
        $plain = $null; $json = $null; $secure = $null
    }
}

if ($MyInvocation.InvocationName -ne '.') {
    $ErrorActionPreference = 'Stop'
    try {
        if ([Console]::IsInputRedirected -or [Console]::IsOutputRedirected) { throw 'Rejected' }
        $node = (Get-Command node -CommandType Application -ErrorAction Stop).Source
        Invoke-T19MaskedImport -NodePath $node -RunnerPath (Join-Path $PSScriptRoot 't19-connection.mjs') -ManifestFile $ManifestPath -ApprovedHash $ManifestSha256
        exit 0
    } catch { [Console]::Error.WriteLine('T19 masked import rejected; review approval and local custody prerequisites.'); exit 1 }
}
