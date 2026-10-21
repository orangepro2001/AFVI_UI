# install.ps1 - install (or remove) the scheduled task that keeps the desktop executable current.
#
#   install.ps1 [-IntervalMinutes 5] [-DryRun] [-Uninstall] [-Repo owner/name] [-Tag nightly]
#
# Install: copies sync.ps1 to %LOCALAPPDATA%\AFVI-UI-Sync\, then registers the task "AFVI-UI-Sync"
# for the current user (no administrator rights): it starts at logon and then every
# -IntervalMinutes minutes, runs hidden (conhost --headless, so no console window flashes), does not
# start a second copy, catches up after sleep. sync.ps1 is taken from this script's folder, or
# from the main branch on GitHub when this script was fetched on its own:
#   irm https://raw.githubusercontent.com/orangepro2001/AFVI_UI/main/scripts/desktop-sync/install.ps1 | iex
# -DryRun builds and prints the task and registers nothing. -Uninstall removes the task and the
# installed files (the executables on the desktop stay). Run it again to update.
# Works in Windows PowerShell 5.1 and PowerShell 7.

param(
    [int]$IntervalMinutes = 5,
    [switch]$DryRun,
    [switch]$Uninstall,
    [string]$Repo = 'orangepro2001/AFVI_UI',
    [string]$Tag = 'nightly',
    [string]$TaskName = 'AFVI-UI-Sync'
)

$ErrorActionPreference = 'Stop'
$installDir = Join-Path $env:LOCALAPPDATA 'AFVI-UI-Sync'
$installed = Join-Path $installDir 'sync.ps1'

if ($Uninstall) {
    if ($DryRun) {
        Write-Host "would remove the task $TaskName and $installDir"
        return
    }
    if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
        Write-Host "removed the task $TaskName"
    }
    else {
        Write-Host "no task $TaskName"
    }
    if (Test-Path -LiteralPath $installDir) {
        Remove-Item -LiteralPath $installDir -Recurse -Force
        Write-Host "removed $installDir"
    }
    return
}

# --- sync.ps1 ----------------------------------------------------------------------
$source = $null
if ($PSScriptRoot) {
    $candidate = Join-Path $PSScriptRoot 'sync.ps1'
    if (Test-Path -LiteralPath $candidate) { $source = $candidate }
}
if ($DryRun) {
    if ($source) { Write-Host "would copy $source to $installed" }
    else { Write-Host "would download sync.ps1 from GitHub to $installed" }
}
else {
    New-Item -ItemType Directory -Force -Path $installDir | Out-Null
    if ($source) {
        Copy-Item -LiteralPath $source -Destination $installed -Force
    }
    else {
        $ProgressPreference = 'SilentlyContinue'
        try { [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12 } catch { }
        Invoke-WebRequest -UseBasicParsing -Uri "https://raw.githubusercontent.com/$Repo/main/scripts/desktop-sync/sync.ps1" -OutFile $installed
    }
}

# --- the task ----------------------------------------------------------------------
$syncArgs = "-NoProfile -ExecutionPolicy Bypass -File `"$installed`" -Repo $Repo -Tag $Tag"
# conhost --headless runs the console program without a window, and waits for it to end.
$action = New-ScheduledTaskAction -Execute 'conhost.exe' -Argument "--headless powershell.exe $syncArgs"
$logon = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$repeat = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes)
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
    -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 15) -Hidden
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited

if ($DryRun) {
    Write-Host "task:      $TaskName (user $env:USERDOMAIN\$env:USERNAME, no elevation)"
    Write-Host "action:    $($action.Execute) $($action.Arguments)"
    Write-Host "triggers:  at logon; every $IntervalMinutes minutes from $($repeat.StartBoundary)"
    Write-Host "settings:  start when available, no second instance, hidden, 15 minute limit"
    Write-Host "dry run: nothing registered"
    return
}

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger @($logon, $repeat) -Settings $settings `
    -Principal $principal -Description "Keeps the newest tested $Repo '$Tag' executable on the desktop (sync.ps1)" -Force | Out-Null
Write-Host "task $TaskName registered: at logon and every $IntervalMinutes minutes"
Write-Host "log:        $(Join-Path $installDir 'sync.log')"
Write-Host "run now:    Start-ScheduledTask -TaskName $TaskName"
Write-Host "remove:     install.ps1 -Uninstall"
