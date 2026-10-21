# run-wintests.ps1 - run the Go tests that scripts/wintests.sh compiled for Windows.
#
#   scripts/ci/run-wintests.ps1 -Dir <folder with *-wintests.tar.gz> -Repo <repository checkout>
#
# The archive holds <name>.test.exe binaries and wintests.txt ("<binary><TAB><package folder>").
# Each binary runs in its package folder inside -Repo (tests read testdata/ relative to it).
# No archive in -Dir (a v* Release has none) means nothing to run: exit 0. Any failing binary:
# exit 1, with its output printed. The full output goes to <Dir>\wintests.log.
# Works in Windows PowerShell 5.1 and PowerShell 7.

param(
    [Parameter(Mandatory = $true)][string]$Dir,
    [Parameter(Mandatory = $true)][string]$Repo
)

$ErrorActionPreference = 'Stop'

function Add-Summary([string]$text) {
    if ($env:GITHUB_STEP_SUMMARY) {
        Add-Content -LiteralPath $env:GITHUB_STEP_SUMMARY -Value $text
    }
}

$archive = Get-ChildItem -LiteralPath $Dir -Filter '*-wintests.tar.gz' -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $archive) {
    Write-Host "No *-wintests.tar.gz in $Dir, the Go tests are skipped."
    Add-Summary "Go tests on Windows: skipped (no wintests archive in this release)"
    exit 0
}

$stage = Join-Path ([System.IO.Path]::GetTempPath()) ("afvi-wintests-" + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $stage | Out-Null
$log = Join-Path $Dir 'wintests.log'
Set-Content -LiteralPath $log -Value "wintests $($archive.Name)"

try {
    # bsdtar from Windows itself: GNU tar (Git for Windows) reads "C:" in a path as a host name.
    $tar = Join-Path $env:SystemRoot 'System32\tar.exe'
    & $tar -xzf $archive.FullName -C $stage
    if ($LASTEXITCODE -ne 0) {
        throw "tar could not unpack $($archive.Name)"
    }

    $manifest = Join-Path $stage 'wintests.txt'
    if (-not (Test-Path -LiteralPath $manifest)) {
        throw "wintests.txt is missing in the archive"
    }

    $failed = 0
    $ran = 0
    $rows = @()
    foreach ($line in Get-Content -LiteralPath $manifest) {
        if (-not $line.Trim()) { continue }
        $parts = $line -split "`t"
        if ($parts.Count -ne 2) {
            throw "bad line in wintests.txt: $line"
        }
        $exe = Join-Path $stage $parts[0]
        $work = Join-Path $Repo $parts[1]
        if (-not (Test-Path -LiteralPath $work)) {
            throw "package folder $($parts[1]) is not in the checkout $Repo"
        }
        $out = Join-Path $stage ($parts[0] + '.out')
        $err = Join-Path $stage ($parts[0] + '.err')
        $started = Get-Date
        $p = Start-Process -FilePath $exe -ArgumentList '-test.count=1', '-test.v' -WorkingDirectory $work `
            -NoNewWindow -Wait -PassThru -RedirectStandardOutput $out -RedirectStandardError $err
        $secs = [math]::Round(((Get-Date) - $started).TotalSeconds, 1)
        $text = (Get-Content -LiteralPath $out -Raw) + (Get-Content -LiteralPath $err -Raw)
        Add-Content -LiteralPath $log -Value "=== $($parts[1]) ($($parts[0])) exit $($p.ExitCode) in ${secs}s"
        Add-Content -LiteralPath $log -Value $text
        $pass = ([regex]::Matches($text, '(?m)^\s*--- PASS')).Count
        $skip = ([regex]::Matches($text, '(?m)^\s*--- SKIP')).Count
        $ran++
        if ($p.ExitCode -eq 0) {
            Write-Host ("ok    {0,-22} {1} passed, {2} skipped, {3}s" -f $parts[1], $pass, $skip, $secs)
            $rows += "| ``$($parts[1])`` | pass | $pass passed, $skip skipped |"
        }
        else {
            $failed++
            Write-Host ("FAIL  {0,-22} exit {1}" -f $parts[1], $p.ExitCode)
            Write-Host $text
            $rows += "| ``$($parts[1])`` | **FAIL** (exit $($p.ExitCode)) | |"
        }
    }

    Add-Summary "### Go tests on Windows"
    Add-Summary "| package | result | detail |"
    Add-Summary "| --- | --- | --- |"
    foreach ($r in $rows) { Add-Summary $r }

    if ($ran -eq 0) {
        throw "wintests.txt lists no test binary"
    }
    if ($failed -gt 0) {
        Write-Host "$failed of $ran test binaries failed, full output in $log"
        exit 1
    }
    Write-Host "$ran test binaries passed"
}
finally {
    Remove-Item -LiteralPath $stage -Recurse -Force -ErrorAction SilentlyContinue
}
