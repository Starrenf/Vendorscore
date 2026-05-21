import { supabase } from "./supabase";
import { normalizeSupplierDomain, supplierDomainChoices } from "./supplierDomains";

function getClient() {
  const client = supabase();
  if (!client) throw new Error("Supabase is niet geconfigureerd.");
  return client;
}

export async function getSupplierChecklistItems(supplierId) {
  const client = getClient();
  const { data, error } = await client
    .from("supplier_checklist_items")
    .select("*")
    .eq("supplier_id", supplierId)
    .order("category", { ascending: true })
    .order("label", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function updateSupplierChecklistItem(id, updates) {
  const client = getClient();
  const { data, error } = await client
    .from("supplier_checklist_items")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function getChecklistTemplates(organizationId, domainValue) {
  const client = getClient();
  const domains = supplierDomainChoices(domainValue);

  const { data: globalTemplates, error: globalError } = await client
    .from("supplier_checklist_templates")
    .select("*")
    .eq("is_active", true)
    .is("organization_id", null)
    .in("domain", domains)
    .order("sort_order", { ascending: true });
  if (globalError) throw globalError;

  let orgTemplates = [];
  if (organizationId) {
    const { data, error } = await client
      .from("supplier_checklist_templates")
      .select("*")
      .eq("is_active", true)
      .eq("organization_id", organizationId)
      .in("domain", domains)
      .order("sort_order", { ascending: true });
    if (error) throw error;
    orgTemplates = data || [];
  }

  const merged = [...orgTemplates, ...(globalTemplates || [])];
  const seen = new Set();
  return merged
    .filter((tpl) => {
      const key = tpl.item_key || tpl.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
}

async function createChecklistItemsForSupplier(supplier, { replaceExisting = false } = {}) {
  const client = getClient();
  const supplierId = supplier?.id;
  const organizationId = supplier?.organization_id;

  if (!supplierId || !organizationId) {
    throw new Error("Supplier mist id of organization_id");
  }

  if (replaceExisting) {
    const { error: deleteError } = await client
      .from("supplier_checklist_items")
      .delete()
      .eq("supplier_id", supplierId);
    if (deleteError) throw deleteError;
  }

  const templates = await getChecklistTemplates(organizationId, normalizeSupplierDomain(supplier?.category));
  if (!templates.length) return [];

  const rows = templates.map((tpl) => ({
    organization_id: organizationId,
    supplier_id: supplierId,
    template_id: tpl.id,
    item_key: tpl.item_key,
    label: tpl.label,
    category: tpl.category,
    is_checked: false,
    notes: null,
    updated_at: new Date().toISOString(),
  }));

  const { data, error } = await client
    .from("supplier_checklist_items")
    .insert(rows)
    .select();
  if (error) throw error;
  return data || [];
}

export async function ensureChecklistForSupplier(supplier) {
  const client = getClient();
  const supplierId = supplier?.id;
  const organizationId = supplier?.organization_id;

  if (!supplierId || !organizationId) {
    throw new Error("Supplier mist id of organization_id");
  }

  const { data: existing, error } = await client
    .from("supplier_checklist_items")
    .select("id")
    .eq("supplier_id", supplierId)
    .limit(1);
  if (error) throw error;
  if ((existing || []).length > 0) return existing;

  return createChecklistItemsForSupplier(supplier);
}

export async function rebuildChecklistForSupplier(supplier) {
  return createChecklistItemsForSupplier(supplier, { replaceExisting: true });
}
