\xef\xbb\xbf<#
  Instala Almacén Laberit como servicio de Windows con NSSM (https://nssm.cc).
  Ejecutar en PowerShell como administrador, desde la carpeta de la aplicación:
     powershell -ExecutionPolicy Bypass -File .\deploy\instalar-servicio-windows.ps1
  Parámetros opcionales: -Nssm C:\herramientas\nssm.exe  -Nombre AlmacenLaberit  -Puerto 8080
#>
param(
  [string]$Nssm = "nssm.exe",
  [string]$Nombre = "AlmacenLaberit",
  [int]$Puerto = 8080
)
$ErrorActionPreference = "Stop"
$app = Split-Path -Parent $PSScriptRoot
$node = (Get-Command node.exe -ErrorAction SilentlyContinue).Source
if (-not $node) { throw "No se encuentra node.exe. Instala Node.js 20 o superior (LTS) y vuelve a ejecutar." }
if (-not (Get-Command $Nssm -ErrorAction SilentlyContinue)) {
  $local = Join-Path $app "nssm.exe"
  if (Test-Path $local) { $Nssm = $local } else { throw "No se encuentra NSSM. Descárgalo de https://nssm.cc, copia nssm.exe (win64) en la carpeta de la aplicación o indica -Nssm <ruta>." }
}
Push-Location $app
if (-not (Test-Path "node_modules")) { Write-Host "Instalando dependencias..."; npm ci --omit=dev }
if (-not (Test-Path ".env")) { Copy-Item ".env.example" ".env"; Write-Host "Creado .env a partir de .env.example. Revísalo." }
New-Item -ItemType Directory -Force -Path "$app\data", "$app\backups", "$app\logs" | Out-Null

& $Nssm install $Nombre $node "server.js"
& $Nssm set $Nombre AppDirectory $app
& $Nssm set $Nombre DisplayName "Almacén Laberit"
& $Nssm set $Nombre Description "Inventario del almacén de Laberit"
& $Nssm set $Nombre Start SERVICE_AUTO_START
& $Nssm set $Nombre AppEnvironmentExtra "NODE_ENV=production" "PORT=$Puerto"
& $Nssm set $Nombre AppStdout "$app\logs\almacen.log"
& $Nssm set $Nombre AppStderr "$app\logs\almacen-error.log"
& $Nssm set $Nombre AppRotateFiles 1
& $Nssm set $Nombre AppRotateBytes 10485760
& $Nssm start $Nombre

if (-not (Get-NetFirewallRule -DisplayName "Almacén Laberit" -ErrorAction SilentlyContinue)) {
  New-NetFirewallRule -DisplayName "Almacén Laberit" -Direction Inbound -Protocol TCP -LocalPort $Puerto -Action Allow -Profile Domain,Private | Out-Null
}

# Copia diaria de la base de datos a las 02:30
$accion = New-ScheduledTaskAction -Execute $node -Argument "scripts\backup.js" -WorkingDirectory $app
$disparador = New-ScheduledTaskTrigger -Daily -At 2:30am
Register-ScheduledTask -TaskName "$Nombre - Copia diaria" -Action $accion -Trigger $disparador -User "SYSTEM" -RunLevel Highest -Force | Out-Null

Pop-Location
Write-Host "`nServicio '$Nombre' instalado y arrancado en el puerto $Puerto."
Write-Host "Abre http://$(hostname):$Puerto para crear el administrador."
Write-Host "Copia diaria programada a las 02:30 en $app\backups."
