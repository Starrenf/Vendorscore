// Contract Governance checklist items (demo/FSR-ready)
// Keys are stable IDs used for storage in Supabase/localStorage.

export const GOVERNANCE_CATEGORIES = [
  {
    id: "contract",
    label: "Juridisch & Contractueel",
    items: [
      { key: "contract.sla_approved", label: "SLA vastgesteld en akkoord" },
      { key: "contract.dab_present", label: "DAB/DAP aanwezig en beoordeeld" },
      {
        key: "contract.dpa_signed",
        label: "Verwerkersovereenkomst (AVG) ondertekend",
        note: "Alleen indien van toepassing (verwerking persoonsgegevens).",
        appliesIf: (m) => !!m["privacy.personal_data"],
      },
      { key: "contract.summary_done", label: "Contractsamenvatting gemaakt (Gilde template 1–12)" },
      { key: "contract.indexation_checked", label: "Indexatieclausule gecontroleerd" },
      { key: "contract.exit_clause_checked", label: "Exit/portability afspraken geborgd" },
      { key: "contract.termination_registered", label: "Opzegtermijn en einddatum geregistreerd" },
      { key: "contract.nttl_registered", label: "Contract geregistreerd in contracttool" },
    ],
  },
  {
    id: "privacy",
    label: "Privacy & Security",
    items: [
      {
        key: "privacy.personal_data",
        label: "Persoonsgegevens worden verwerkt",
        note: "Zet aan als deze leverancier (direct/indirect) persoonsgegevens verwerkt.",
        type: "meta",
      },
      { key: "privacy.security_info_received", label: "Security documentatie ontvangen (beleid/maatregelen)" },
      { key: "privacy.certification_present", label: "ISO 27001 / relevante certificering aanwezig" },
      {
        key: "privacy.dpia_done",
        label: "DPIA uitgevoerd (indien vereist)",
        appliesIf: (m) => !!m["privacy.personal_data"],
      },
      { key: "privacy.datalek_process_agreed", label: "Incident- en datalekprocedure afgestemd" },
      { key: "privacy.audit_logging", label: "Logging & audittrail beschikbaar" },
      { key: "privacy.data_location_known", label: "Dataopslaglocatie bekend (EU/non-EU)" },
    ],
  },
  {
    id: "finance",
    label: "Financieel & Administratief",
    items: [
      { key: "finance.budget_owner_confirmed", label: "Budgethouder bevestigd" },
      { key: "finance.invoice_check", label: "Facturatie-afspraken gecontroleerd" },
      { key: "finance.licenses_validated", label: "Licentieaantallen gevalideerd" },
      { key: "finance.po_process_ready", label: "Inkoop-/PO-proces ingericht" },
    ],
  },
  {
    id: "operations",
    label: "Operationeel & Relatiemanagement",
    items: [
      { key: "ops.owner_assigned", label: "Interne contracteigenaar toegewezen" },
      { key: "ops.vendor_am_known", label: "Accountmanager leverancier bekend" },
      { key: "ops.meetings_planned", label: "Reguliere overleggen gepland" },
      { key: "ops.kpi_reporting", label: "KPI/SLA-rapportage ingericht" },
      { key: "ops.escalation_path", label: "Escalatieprocedure vastgelegd" },
    ],
  },
  {
    id: "strategy",
    label: "Strategisch",
    items: [
      { key: "strat.kraljic_set", label: "Leveranciersstrategie bepaald (Kraljic)" },
      { key: "strat.risk_assessed", label: "Risicoanalyse uitgevoerd" },
      { key: "strat.continuity_check", label: "Continuïteitscheck gedaan (leveringszekerheid/financieel)" },
      { key: "strat.roadmap_talks", label: "Roadmap/innovatie-overleg ingepland" },
    ],
  },
];

export function flattenGovernanceItems() {
  return GOVERNANCE_CATEGORIES.flatMap((c) => c.items.map((i) => ({ ...i, categoryId: c.id, categoryLabel: c.label })));
}

export function isItemApplicable(item, map) {
  if (typeof item.appliesIf === "function") return !!item.appliesIf(map || {});
  return true;
}
