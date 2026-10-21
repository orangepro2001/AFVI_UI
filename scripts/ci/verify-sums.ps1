# verify-sums.ps1 - check the files in a release folder against its SHA256SUMS.txt.
#
#   scripts/ci/verify-sums.ps1 -Dir <folder>
#
# SHA256SUMS.txt has the format of sha256sum: "<64 hex digits>  <file name>". Every file listed
# must exist and match; at least one file must be listed. Exits 1 on any mismatch.
# Works in Windows PowerShell 5.1 and PowerShell 7.

param(
    [Parameter(Mandatory = $true)][string]$Dir
)

$ErrorActionPreference = 'Stop'

$sums = Join-Path $Dir 'SHA256SUMS.txt'
if (-not (Test-Path -LiteralPath $sums)) {
    Write-Host "FAIL: no SHA256SUMS.txt in $Dir"
    exit 1
}

$checked = 0
$failed = 0
foreach ($line in Get-Content -LiteralPath $sums) {
    if ($line -notmatch '^([0-9a-fA-F]{64})\s+\*?(.+?)\s*$') {
        continue
    }
    $want = $Matches[1].ToLowerInvariant()
    $name = $Matches[2]
    $path = Join-Path $Dir $name
    if (-not (Test-Path -LiteralPath $path)) {
        Write-Host "FAIL: $name is listed but missing"
        $failed++
        continue
    }
    $got = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant()
    $checked++
    if ($got -eq $want) {
        Write-Host "ok    $name  $got"
    }
    else {
        Write-Host "FAIL: $name  expected $want  got $got"
        $failed++
    }
}

if ($checked -eq 0 -and $failed -eq 0) {
    Write-Host "FAIL: SHA256SUMS.txt lists no files"
    exit 1
}
if ($failed -gt 0) {
    exit 1
}
Write-Host "$checked file(s) match SHA256SUMS.txt"
