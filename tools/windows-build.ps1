$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $repoRoot

if (-not (Test-Path '.\package.json')) { throw 'package.json not found. Open the project folder first.' }

Write-Host 'Installing dependencies…' -ForegroundColor Cyan
npm install

Write-Host 'Building…' -ForegroundColor Cyan
npm run build

Write-Host 'Done. Build output is in ./dist' -ForegroundColor Green
