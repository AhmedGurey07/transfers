@echo off
setlocal
cd /d "%~dp0"

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command ^
  "$site = 'https://ahmedgurey07.github.io/transfers/';" ^
  "$icon = Join-Path '%~dp0' 'shaafici-warehouse-200-logo.ico';" ^
  "$edgeCandidates = @((Join-Path $env:ProgramFiles 'Microsoft\Edge\Application\msedge.exe'), (Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe'), (Join-Path $env:LOCALAPPDATA 'Microsoft\Edge\Application\msedge.exe'));" ^
  "$edge = $edgeCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1;" ^
  "if (!$edge) { throw 'Microsoft Edge is required to run the online app window.' }" ^
  "$desktop = [Environment]::GetFolderPath('Desktop');" ^
  "$startMenu = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs';" ^
  "foreach ($folder in @($desktop, $startMenu)) {" ^
  "  $urlFile = Join-Path $folder 'SHAAFICI Order Desk.url';" ^
  "  if (Test-Path $urlFile) { Remove-Item -LiteralPath $urlFile -Force; }" ^
  "  $shortcutFile = Join-Path $folder 'SHAAFICI Order Desk.lnk';" ^
  "  $shell = New-Object -ComObject WScript.Shell;" ^
  "  $shortcut = $shell.CreateShortcut($shortcutFile);" ^
  "  $shortcut.TargetPath = $edge;" ^
  "$shortcut.Arguments = ('--app=' + $site + ' --start-maximized --no-first-run --disable-features=msEdgeSidebarV2');" ^
  "  $shortcut.WorkingDirectory = $folder;" ^
  "  $shortcut.Description = 'Open SHAAFICI Order Desk online';" ^
  "  $shortcut.IconLocation = $icon;" ^
  "  $shortcut.Save();" ^
  "}" ^
  "$shellApp = New-Object -ComObject Shell.Application;" ^
  "$startItem = $shellApp.Namespace($startMenu).ParseName('SHAAFICI Order Desk.lnk');" ^
  "if ($startItem) { foreach ($verb in $startItem.Verbs()) { if ($verb.Name -match 'taskbar|t[aâ]skleiste|barra de tareas|barre des tâches') { $verb.DoIt(); break; } }" ^
  "}"

if errorlevel 1 (
  echo Could not create the shortcuts.
  pause
  exit /b 1
)

echo SHAAFICI Order Desk was added to your Desktop and Start menu.
echo These shortcuts open the online website:
echo https://ahmedgurey07.github.io/transfers/
pause
