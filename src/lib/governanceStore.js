import { flattenGovernanceItems, isItemApplicable } from "./governanceItems";

function lsKey(orgId, supplierId) {
  return `VENDORSCORE_GOV_${orgId || "noorg"}_${supplierId}`;
}

const GOVERNANCE_ITEM_MAP = Object.fromEntries(
  flattenGovernanceItems().map((item, index) => [
    item.key,
    {
      key: item.key,
      label: item.label,
      category: item.categoryLabel,
      sort_order: index + 1,
    },
  ])
);

export function computeGovernanceStats(checksMap) {
  const items = flattenGovernanceItems();
  const applicable = items.filter((it) => it.type !== "meta" && isItemApplicable(it, checksMap));
  const total = applicable.length;
  const checked = applicable.filter((it) => !!checksMap?.[it.key]).length;
  const percent = total ? Math.round((checked / total) * 100) : 0;
  return { total, checked, percent };
}

function normalizePayload(payload) {
  if (!payload || typeof payload !== "object") return { checks: {}, notes: {} };
  if (payload.checks && payload.notes) return payload;

  const checks = {};
  Object.entries(payload).forEach(([k, v]) => {
    if (typeof v === "boolean") checks[k] = v;
  });
  return { checks, notes: {} };
}

function readLocal(organizationId, supplierId) {
  try {
    return normalizePayload(JSON.parse(localStorage.getItem(lsKey(organizationId, supplierId)) || "{}"));
  } catch {
    return { checks: {}, notes: {} };
  }
}

function writeLocal(organizationId, supplierId, payload) {
  try {
    localStorage.setItem(lsKey(organizationId, supplierId), JSON.stringify(payload));
  } catch {
    // ignore
  }
}

async function getCurrentUserId(client) {
  try {
    const { data } = await client.auth.getUser();
    return data?.user?.id || null;
  } catch {
    return null;
  }
}

function buildChecklistRow({ organizationId, supplierId, key, checked, noteText, updatedBy }) {
  const def = GOVERNANCE_ITEM_MAP[key] || {
    key,
    label: key,
    category: "Overig",
    sort_order: 999,
  };

  return {
    organization_id: organizationId,
    supplier_id: supplierId,
    item_key: def.key,
    label: def.label,
    category: def.category,
    checked: !!checked,
    note_text: noteText || null,
    sort_order: def.sort_order,
    updated_at: new Date().toISOString(),
    updated_by: updatedBy,
  };
}

export async function loadGovernance({ client, organizationId, supplierId }) {
  if (client && organizationId && supplierId) {
    try {
      const { data, error } = await client
        .from("governance_checklist_items")
        .select("item_key,checked,note_text")
        .eq("organization_id", organizationId)
        .eq("supplier_id", supplierId)
        .order("sort_order", { ascending: true });

      if (error) throw error;

      const checks = {};
      const notes = {};
      (data || []).forEach((row) => {
        if (row?.item_key) checks[row.item_key] = !!row.checked;
        if (row?.note_text != null && row.note_text !== "") notes[row.item_key] = String(row.note_text);
      });

      const cached = readLocal(organizationId, supplierId);
      return {
        checks: { ...cached.checks, ...checks },
        notes: { ...cached.notes, ...notes },
      };
    } catch (err) {
      console.warn("loadGovernance fallback", err);
    }
  }

  return readLocal(organizationId, supplierId);
}

export async function toggleGovernanceItem({ client, organizationId, supplierId, key, value }) {
  const current = readLocal(organizationId, supplierId);
  current.checks[key] = !!value;
  writeLocal(organizationId, supplierId, current);

  if (!client || !organizationId || !supplierId) return;

  try {
    const updatedBy = await getCurrentUserId(client);
    const row = buildChecklistRow({
      organizationId,
      supplierId,
      key,
      checked: !!value,
      noteText: current.notes?.[key] || null,
      updatedBy,
    });

    const { error } = await client
      .from("governance_checklist_items")
      .upsert(row, { onConflict: "organization_id,supplier_id,item_key" });

    if (error) throw error;
  } catch (err) {
    console.warn("toggleGovernanceItem supabase failed", err);
  }
}

export async function setGovernanceNote({ client, organizationId, supplierId, key, note }) {
  const text = (note ?? "").toString();
  const current = readLocal(organizationId, supplierId);

  if (text.trim()) current.notes[key] = text;
  else delete current.notes[key];

  writeLocal(organizationId, supplierId, current);

  if (!client || !organizationId || !supplierId) return;

  try {
    const updatedBy = await getCurrentUserId(client);
    const row = buildChecklistRow({
      organizationId,
      supplierId,
      key,
      checked: !!current.checks?.[key],
      noteText: text || null,
      updatedBy,
    });

    const { error } = await client
      .from("governance_checklist_items")
      .upsert(row, { onConflict: "organization_id,supplier_id,item_key" });

    if (error) throw error;
  } catch (err) {
    console.warn("setGovernanceNote supabase failed", err);
  }
}
