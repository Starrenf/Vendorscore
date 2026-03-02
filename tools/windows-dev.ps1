$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $repoRoot

if (-not (Test-Path '.\package.json')) { throw 'package.json not found. Open the project folder first.' }

Write-Host 'Installing dependencies (if needed)…' -ForegroundColor Cyan
npm install

Write-Host 'Starting dev server…' -ForegroundColor Cyan
npm run dev
