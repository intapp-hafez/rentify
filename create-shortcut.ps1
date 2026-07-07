$WshShell = New-Object -comObject WScript.Shell
$DesktopPath = [Environment]::GetFolderPath('Desktop')
$Shortcut = $WshShell.CreateShortcut("$DesktopPath\Rentify Local.lnk")
$Shortcut.TargetPath = "e:\Ahmad Faizan UI-UX\rentify\start-rentify.bat"
$Shortcut.WorkingDirectory = "e:\Ahmad Faizan UI-UX\rentify"
$Shortcut.IconLocation = "e:\Ahmad Faizan UI-UX\rentify\public\rentify.ico"
$Shortcut.WindowStyle = 7
$Shortcut.Save()
Write-Host "Shortcut created successfully on your Desktop."
