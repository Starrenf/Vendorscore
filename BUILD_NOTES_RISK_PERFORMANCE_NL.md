# VendorScore Pro build-notes – risico, prestaties en beheersstatus

Deze build bevat:
- nieuwe tab **Risico** op leverancierdetail
- nieuwe tab **Prestaties** op leverancierdetail
- nieuwe tab **Beheersstatus** (nieuwe checkliststructuur)
- bestaande **Governance** tab blijft bestaan
- aangepaste SupplierDetail integratie

## Toegevoegde bestanden
- `src/lib/supplierRisk.js`
- `src/lib/supplierPerformance.js`
- `src/lib/supplierChecklist.js`
- `src/components/suppliers/SupplierRiskTab.jsx`
- `src/components/suppliers/SupplierPerformanceTab.jsx`
- `src/components/suppliers/SupplierManagementChecklistTab.jsx`

## Opmerking over lokale build
In deze bron zat een afwijkende `node_modules/.bin/vite` verwijzing. Daardoor kan `npm run build` lokaal soms falen met een fout richting `node_modules/dist/node/cli.js`.

Werkende build-opdracht in deze sessie:

```bash
node node_modules/vite/bin/vite.js build
```

Op Vercel hoort dit normaal geen probleem te zijn, omdat dependencies daar schoon opnieuw worden geïnstalleerd.
