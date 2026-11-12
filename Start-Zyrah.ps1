$ErrorActionPreference = 'Stop'
$applicationDirectory = Join-Path $PSScriptRoot 'updated-files'
$electronExecutable = Join-Path $applicationDirectory 'node_modules/electron/dist/electron.exe'
if (-not (Test-Path -LiteralPath $electronExecutable)) {
    throw 'Electron is missing. Run npm ci and npm run setup:desktop in updated-files first.'
}
# Launch the current source, not a historical portable build. Existing single-instance
# handling restores an already-running app; quit an older build before switching.
Start-Process -FilePath $electronExecutable -ArgumentList '.' -WorkingDirectory $applicationDirectory -WindowStyle Hidden
