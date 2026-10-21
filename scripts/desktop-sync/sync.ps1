# sync.ps1 - keep the newest tested executable of the rolling "nightly" Release on this PC's desktop.
#
#   sync.ps1 [-Repo owner/name] [-Tag nightly] [-Dest <folder>] [-Prefix AFVI-UI-] [-Suffix -windows-amd64.exe]
#
# What it does, every time it runs (the scheduled task from install.ps1 runs it every few minutes):
#   1. downloads SHA256SUMS.txt of the Release (a plain file URL: no API, no token, no rate limit),
#   2. if the executable it names is not in -Dest yet: downloads it to <name>.part, checks the
#      SHA-256, renames it to <name> (a half-finished download is never an executable),
#   3. deletes the older <Prefix>*<Suffix> files in -Dest, except one that is running (it stays and
#      is removed on a later run, once it was closed). Nothing else in -Dest is ever touched.
# The Release only ever holds an executable that passed the Windows tests (docs/CI.md), so the
# desktop never gets an untested build. A missing Release (it is replaced in a few seconds after
# each push) is not an error. Log: %LOCALAPPDATA%\AFVI-UI-Sync\sync.log.
#
# Exit codes: 0 up to date or nothing to do, 1 a download or checksum failed.
# Works in Windows PowerShell 5.1 and PowerShell 7.

param(
    [string]$Repo = 'orangepro2001/AFVI_UI',
    [string]$Tag = 'nightly',
    [string]$Dest = '',
    [string]$Prefix = 'AFVI-UI-',
    [string]$Suffix = '-windows-amd64.exe',
    [string]$LogDir = ''
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'   # Windows PowerShell 5.1 downloads crawl with the progress bar
try { [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12 } catch { }

if (-not $Dest) { $Dest = [Environment]::GetFolderPath('Desktop') }
if (-not $LogDir) { $LogDir = Join-Path $env:LOCALAPPDATA 'AFVI-UI-Sync' }
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$logFile = Join-Path $LogDir 'sync.log'

function Write-Log([string]$text) {
    $line = '{0} {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $text
    Write-Host $line
    try { Add-Content -LiteralPath $logFile -Value $line } catch { }
}

# Keep the log small: the newest 300 lines once it passes 200 KB.
try {
    if ((Test-Path -LiteralPath $logFile) -and (Get-Item -LiteralPath $logFile).Length -gt 200KB) {
        $tail = Get-Content -LiteralPath $logFile -Tail 300
        Set-Content -LiteralPath $logFile -Value $tail
    }
}
catch { }

# One run at a time (the task also refuses to start a second instance).
$mutex = New-Object System.Threading.Mutex($false, 'Local\AFVI-UI-Sync')
if (-not $mutex.WaitOne(0)) {
    Write-Log 'another sync is running, skipping'
    exit 0
}

function Test-InUse([string]$path) {
    # A running executable: same file path, or its path cannot be read (then assume it is ours).
    $procs = @(Get-Process -Name ([IO.Path]::GetFileNameWithoutExtension($path)) -ErrorAction SilentlyContinue)
    foreach ($p in $procs) {
        $pp = $null
        try { $pp = $p.Path } catch { }
        if (-not $pp -or ($pp -ieq $path)) { return $true }
    }
    return $false
}

$code = 0
try {
    $base = "https://github.com/$Repo/releases/download/$Tag"

    try {
        $sums = (Invoke-WebRequest -UseBasicParsing -Uri "$base/SHA256SUMS.txt").Content
    }
    catch {
        $status = $null
        if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode }
        if ($status -eq 404) {
            Write-Log "no release '$Tag' yet (or it is being replaced), nothing to do"
            return
        }
        throw
    }
    if ($sums -is [byte[]]) { $sums = [Text.Encoding]::UTF8.GetString($sums) }

    $name = $null
    $want = $null
    foreach ($line in ($sums -split "`n")) {
        if ($line -match ('^([0-9a-fA-F]{64})\s+\*?(' + [regex]::Escape($Prefix) + '\S+' + [regex]::Escape($Suffix) + ')\s*$')) {
            $want = $Matches[1].ToLowerInvariant()
            $name = $Matches[2]
            break
        }
    }
    if (-not $name) {
        Write-Log "SHA256SUMS.txt of '$Tag' lists no $Prefix*$Suffix file, nothing to do"
        return
    }

    $target = Join-Path $Dest $name
    $have = $false
    if (Test-Path -LiteralPath $target) {
        $have = ((Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant() -eq $want)
        if (-not $have) { Write-Log "$name is on the desktop but its checksum differs, downloading it again" }
    }

    if (-not $have) {
        $part = "$target.part"
        Write-Log "downloading $name"
        try {
            Invoke-WebRequest -UseBasicParsing -Uri "$base/$name" -OutFile $part
            $got = (Get-FileHash -LiteralPath $part -Algorithm SHA256).Hash.ToLowerInvariant()
            if ($got -ne $want) { throw "checksum mismatch: expected $want, got $got" }
            Move-Item -LiteralPath $part -Destination $target -Force
        }
        finally {
            if (Test-Path -LiteralPath $part) { Remove-Item -LiteralPath $part -Force -ErrorAction SilentlyContinue }
        }
        $size = [math]::Round((Get-Item -LiteralPath $target).Length / 1MB, 1)
        Write-Log "new executable on the desktop: $target ($size MB, sha256 $($want.Substring(0, 8))...)"
    }
    else {
        Write-Log "up to date: $name"
    }

    # Older copies: only <Prefix>*<Suffix> in Dest, never the new one.
    foreach ($old in @(Get-ChildItem -LiteralPath $Dest -File -Filter "$Prefix*$Suffix" -ErrorAction SilentlyContinue)) {
        if ($old.Name -ieq $name) { continue }
        if (Test-InUse $old.FullName) {
            Write-Log "keeping $($old.Name): it is running, it will be removed after it is closed"
            continue
        }
        try {
            Remove-Item -LiteralPath $old.FullName -Force
            Write-Log "removed the older $($old.Name)"
        }
        catch {
            Write-Log "keeping $($old.Name): $($_.Exception.Message)"
        }
    }
}
catch {
    Write-Log "FAILED: $($_.Exception.Message)"
    $code = 1
}
finally {
    $mutex.ReleaseMutex()
    $mutex.Dispose()
}
exit $code
