import { supabase } from "./supabase";

export async function getSupplierRiskProfile(supplierId) {
  const client = supabase();
  if (!client) throw new Error("Supabase is niet geconfigureerd.");

  const { data, error } = await client
    .from("supplier_risk_profiles")
    .select("*")
    .eq("supplier_id", supplierId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function saveSupplierRiskProfile(payload) {
  const client = supabase();
  if (!client) throw new Error("Supabase is niet geconfigureerd.");

  const { data, error } = await client
    .from("supplier_risk_profiles")
    .upsert(payload, { onConflict: "organization_id,supplier_id" })
    .select()
    .single();

  if (error) throw error;
  return data;
}
