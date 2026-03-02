import { flattenGovernanceItems, isItemApplicable } from "./governanceItems";

function lsKey(orgId, supplierId) {
  return `VENDORSCORE_GOV_${orgId || "noorg"}_${supplierId}`;
}

export function computeGovernanceStats(map) {
  const items = flattenGovernanceItems();
  const applicable = items.filter((it) => it.type !== "meta" && isItemApplicable(it, map));
  const total = applicable.length;
  const checked = applicable.filter((it) => !!map?.[it.key]).length;
  const percent = total ? Math.round((checked / total) * 100) : 0;
  return { total, checked, percent };
}

export async function loadGovernance({ client, organizationId, supplierId }) {
  // Prefer Supabase, fallback to localStorage
  if (client && organizationId && supplierId) {
    try {
      const { data, error } = await client
        .from("supplier_governance")
        .select("item_key,is_checked")
        .eq("supplier_id", supplierId);

      if (error) throw error;

      const map = {};
      (data || []).forEach((row) => {
        map[row.item_key] = !!row.is_checked;
      });

      // merge in any local cache (so demos don't lose data if table missing earlier)
      try {
        const cached = JSON.parse(localStorage.getItem(lsKey(organizationId, supplierId)) || "{}");
        return { ...cached, ...map };
      } catch {
        return map;
      }
    } catch (err) {
      // Table missing or RLS etc -> fallback
      console.warn("loadGovernance fallback", err);
    }
  }

  try {
    return JSON.parse(localStorage.getItem(lsKey(organizationId, supplierId)) || "{}");
  } catch {
    return {};
  }
}

export async function toggleGovernanceItem({ client, organizationId, supplierId, key, value }) {
  // Write-through cache first (fast UI)
  try {
    const current = JSON.parse(localStorage.getItem(lsKey(organizationId, supplierId)) || "{}");
    current[key] = !!value;
    localStorage.setItem(lsKey(organizationId, supplierId), JSON.stringify(current));
  } catch {
    // ignore
  }

  if (!client || !organizationId || !supplierId) return;

  try {
    const { error } = await client
      .from("supplier_governance")
      .upsert(
        {
          supplier_id: supplierId,
          item_key: key,
          is_checked: !!value,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "supplier_id,item_key" }
      );

    if (error) throw error;
  } catch (err) {
    console.warn("toggleGovernanceItem supabase failed", err);
    // keep local cache as fallback
  }
}
