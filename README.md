# VendorScore Pro

## Commercial Software – Proprietary

VendorScore Pro is a strategic supplier evaluation platform developed and owned by **Frank Starren**.

This software is NOT open source and is not licensed for public redistribution.

---

## Purpose

VendorScore Pro provides educational institutions and governance professionals with:

- Structured supplier evaluations (KZL / Kraljic-inspired model)
- Multi-tenant organisation structure
- Governance and supplier risk insights
- Strategic dashboard reporting
- Visual performance indicators

### Current Scope

✔ Supplier evaluation  
✔ Organisational governance  
✔ Strategic scoring & insights  

### Not in Scope (for now)

✖ Contract lifecycle management  
✖ Contract storage or archiving  
✖ Financial processing  
✖ SLA administration  

---

## Architecture

- Frontend: React + Vite
- Database: Supabase (PostgreSQL)
- Multi-tenant structure (organizations)
- Evaluation logic aligned with K1–K5 weighted model
- Normalised scoring (0–100)

---

## Intended Use

VendorScore Pro may be used by:

- Frank Starren for personal supplier governance tracking
- Educational institutions under commercial agreement

Use of this software without explicit written permission is prohibited.

---

## License

See LICENSE file for full commercial terms.

© 2026 Frank Starren  
All rights reserved.


## v0.5.74
- statusoverzicht aangescherpt voor demo
- defensieve Supabase config normalisatie voor anon key/url
- over-pagina uitgebreid en generieker gemaakt
- statussamenvatting in leverancierdetail hersteld
