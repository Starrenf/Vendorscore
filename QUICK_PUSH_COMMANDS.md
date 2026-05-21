# Quick push in repo-root

Gebruik deze commando's alleen in je ECHTE repo-root, niet in een uitgepakte zipmap.

```powershell
cd C:\Users\Frank\Documents\VSCode\Vendorscore

git status
git pull --rebase origin main

if (Test-Path node_modules) { Remove-Item -Recurse -Force node_modules }
if (Test-Path package-lock.json) { Remove-Item -Force package-lock.json }

npm cache clean --force
npm install
npm run build

git add .
git commit -m "VendorScore v0.7.20 cleaner header spacing"
git push origin main
```
