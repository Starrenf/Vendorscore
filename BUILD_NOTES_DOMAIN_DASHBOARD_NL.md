VendorScore Pro v0.7.20 – Domeinselectie + dashboard update

Wat is nieuw
- Leverancierdetail bevat nu een veld "Domein" met keuzes: ICT, Facilitair, Huisvesting, Generiek.
- Beheersstatus gebruikt het gekozen domein om de juiste checklist-template te initialiseren.
- In Beheersstatus is een knop toegevoegd: "Checklist opnieuw opbouwen".
  Gebruik deze nadat je het domein wijzigt, zodat de checklist opnieuw uit de juiste templates wordt opgebouwd.
- Leveranciersoverzicht toont nu ook het gekozen domein.
- Dashboard toont nu extra managementinformatie:
  - gemiddelde risicoscore
  - gemiddelde prestatiescore
  - domeinverdeling
  - domein/risico/prestatie in de prioriteitenlijst

Belangrijke aannames
- Domein wordt opgeslagen in suppliers.category.
- Checklist-templates gebruiken het veld supplier_checklist_templates.domain.
- Globale templates met organization_id = null blijven ondersteund.
- Indien zowel domeinspecifieke als generieke templates bestaan, worden beide meegenomen.

Gebruik
1. Open leverancier > Gegevens.
2. Kies het juiste Domein.
3. Sla op.
4. Open Beheersstatus.
5. Klik indien nodig op "Checklist opnieuw opbouwen".

Build-status
- Lokale production build succesvol uitgevoerd met vite build.
