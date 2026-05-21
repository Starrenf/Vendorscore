# Push VendorScore Pro_v0.5.58 to GitHub (Windows / PowerShell)

## 1) Put the project in the repo root
This zip contains the **project files**. GitHub/Vercel expect `package.json` to be in the **root of the repo**.

### If you already have the GitHub repo
```powershell
cd C:\Users\Frank\Documents\VSCode\Vendorscore

# clone fresh (recommended)
rm -Recurse -Force Vendorscore -ErrorAction SilentlyContinue
git clone https://github.com/Starrenf/Vendorscore.git Vendorscore
cd Vendorscore

# copy the contents of this zip folder INTO the repo root
# (IMPORTANT: copy the *contents*, not the folder itself)
# Example if you extracted the zip to: C:\Users\Frank\Downloads\VendorScore Pro_v0.5.58
Copy-Item -Recurse -Force "C:\Users\Frank\Downloads\VendorScore Pro_v0.5.58\*" .

git status
```

## 2) Commit + push
```powershell
git add -A
git commit -m "v0.5.58 clean starter build"
git push origin main
```

## 3) Verify locally
```powershell
npm install
npm run dev
```

## If you see: "not a git repository"
You are **not inside the cloned repo folder**. Run:
```powershell
cd C:\Users\Frank\Documents\VSCode\Vendorscore\Vendorscore
ls -Force
```
You should see a **.git** folder.

## If Vercel says: "vite: command not found"
That usually means Vercel doesn't see `package.json` at the repo root.
Make sure `package.json` is in the **top level** of the GitHub repo (not in a subfolder).
