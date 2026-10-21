# smoke.ps1 - start the Windows executable and check that it really comes up.
#
#   scripts/ci/smoke.ps1 -Dir <folder with AFVI-UI-<version>-windows-amd64.exe> [-Out <folder>]
#                        [-RequireWindow] [-InstallWebView2] [-WindowTimeoutSec 90] [-AliveSec 15]
#
# 1. starts the executable (only this process is ever stopped, by its id),
# 2. waits for its main window to carry the title that main.go sets from the version in the file
#    name: "Pixel Inspector ( Version : <version> - AFVI )",
# 3. checks that the process stays alive for -AliveSec seconds and the title does not change,
# 4. takes a screenshot of the screen (best effort) into -Out, then stops the process.
#
# -InstallWebView2: when the WebView2 runtime is not in the registry, install it first with
# Microsoft's evergreen bootstrapper (for a CI machine image that lacks it; the app needs it).
# The process dying, or (with -RequireWindow) no window with that title in time, is a failure and
# exits 1. Without -RequireWindow a living process without the expected window is a warning, for a
# machine without an interactive desktop. -Out also receives smoke.log.
# Works in Windows PowerShell 5.1 and PowerShell 7.

param(
    [Parameter(Mandatory = $true)][string]$Dir,
    [string]$Out = '',
    [switch]$RequireWindow,
    [switch]$InstallWebView2,
    [int]$WindowTimeoutSec = 90,
    [int]$AliveSec = 15
)

$ErrorActionPreference = 'Stop'

$exe = Get-ChildItem -LiteralPath $Dir -Filter 'AFVI-UI-*-windows-amd64.exe' | Select-Object -First 1
if (-not $exe) {
    Write-Host "FAIL: no AFVI-UI-*-windows-amd64.exe in $Dir"
    exit 1
}
if ($exe.Name -notmatch '^AFVI-UI-(.+)-windows-amd64\.exe$') {
    Write-Host "FAIL: cannot read the version from $($exe.Name)"
    exit 1
}
$version = $Matches[1]
$expected = "Pixel Inspector ( Version : $version - AFVI )"

if ($Out) {
    New-Item -ItemType Directory -Force -Path $Out | Out-Null
    $log = Join-Path $Out 'smoke.log'
    Set-Content -LiteralPath $log -Value "smoke $($exe.Name)"
}
$lines = @()
function Note([string]$text) {
    Write-Host $text
    $script:lines += $text
    if ($log) { Add-Content -LiteralPath $log -Value $text }
}

function Get-WebView2Version {
    $keys = @(
        'HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}',
        'HKLM:\SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}',
        'HKCU:\SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}'
    )
    foreach ($k in $keys) {
        $v = (Get-ItemProperty -Path $k -Name pv -ErrorAction SilentlyContinue).pv
        if ($v) { return $v }
    }
    return $null
}

function Save-Screenshot([string]$path) {
    try {
        Add-Type -AssemblyName System.Windows.Forms, System.Drawing
        $b = [System.Windows.Forms.SystemInformation]::VirtualScreen
        if ($b.Width -le 0 -or $b.Height -le 0) { throw "screen is $($b.Width)x$($b.Height)" }
        $bmp = New-Object System.Drawing.Bitmap $b.Width, $b.Height
        try {
            $g = [System.Drawing.Graphics]::FromImage($bmp)
            try { $g.CopyFromScreen($b.Left, $b.Top, 0, 0, $bmp.Size) } finally { $g.Dispose() }
            $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
        }
        finally { $bmp.Dispose() }
        Note "screenshot: $path ($($b.Width)x$($b.Height))"
    }
    catch {
        Note "WARNING: no screenshot ($($_.Exception.Message))"
    }
}

$wv = Get-WebView2Version
if (-not $wv -and $InstallWebView2) {
    Note "WebView2 runtime not found, installing it with the evergreen bootstrapper"
    try {
        $ProgressPreference = 'SilentlyContinue'
        $setup = Join-Path ([System.IO.Path]::GetTempPath()) 'MicrosoftEdgeWebview2Setup.exe'
        Invoke-WebRequest -UseBasicParsing -Uri 'https://go.microsoft.com/fwlink/p/?LinkId=2124703' -OutFile $setup
        $inst = Start-Process -FilePath $setup -ArgumentList '/silent', '/install' -Wait -PassThru
        Note "bootstrapper exit code $($inst.ExitCode)"
        $wv = Get-WebView2Version
    }
    catch {
        Note "WARNING: could not install the WebView2 runtime ($($_.Exception.Message))"
    }
}
if ($wv) { Note "WebView2 runtime: $wv" } else { Note "WARNING: WebView2 runtime not found in the registry" }
Note "executable: $($exe.Name)"
Note "expected window title: $expected"

$p = $null
$failure = $null
try {
    $p = Start-Process -FilePath $exe.FullName -PassThru
    Note "started pid $($p.Id)"

    # --- the window --------------------------------------------------------------
    $title = ''
    $found = $false
    $deadline = (Get-Date).AddSeconds($WindowTimeoutSec)
    while ((Get-Date) -lt $deadline) {
        $p.Refresh()
        if ($p.HasExited) {
            throw "the process exited with code $($p.ExitCode) before a window appeared"
        }
        $title = $p.MainWindowTitle
        if ($title -eq $expected) { $found = $true; break }
        Start-Sleep -Milliseconds 500
    }
    if ($found) {
        Note "window found: '$title'"
    }
    elseif ($RequireWindow) {
        throw "no window titled '$expected' within ${WindowTimeoutSec}s (last title: '$title')"
    }
    else {
        Note "WARNING: no window titled '$expected' within ${WindowTimeoutSec}s (last title: '$title'), the process is alive"
    }

    # --- staying alive -----------------------------------------------------------
    $until = (Get-Date).AddSeconds($AliveSec)
    while ((Get-Date) -lt $until) {
        Start-Sleep -Milliseconds 500
        $p.Refresh()
        if ($p.HasExited) {
            throw "the process exited with code $($p.ExitCode) after $AliveSec seconds were not over"
        }
    }
    if ($found -and $p.MainWindowTitle -ne $expected) {
        throw "the window title changed to '$($p.MainWindowTitle)'"
    }
    Note "still running after ${AliveSec}s"

    if ($Out) { Save-Screenshot (Join-Path $Out 'smoke.png') }
}
catch {
    $failure = $_.Exception.Message
    Note "FAIL: $failure"
    if ($Out) { Save-Screenshot (Join-Path $Out 'smoke-failure.png') }
}
finally {
    if ($p) {
        try {
            $p.Refresh()
            if (-not $p.HasExited) {
                Stop-Process -Id $p.Id -Force
                Note "stopped pid $($p.Id)"
            }
        }
        catch {
            Note "WARNING: could not stop pid $($p.Id): $($_.Exception.Message)"
        }
    }
    if ($env:GITHUB_STEP_SUMMARY) {
        $head = if ($failure) { '**FAIL**' } else { 'pass' }
        Add-Content -LiteralPath $env:GITHUB_STEP_SUMMARY -Value "### Start the exe: $head"
        Add-Content -LiteralPath $env:GITHUB_STEP_SUMMARY -Value ('```' + "`n" + ($lines -join "`n") + "`n" + '```')
    }
}

if ($failure) { exit 1 }
Write-Host "smoke test passed"
