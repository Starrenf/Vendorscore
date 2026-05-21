import { supabase } from "./supabase";

export async function getSupplierPerformanceReviews(supplierId) {
  const client = supabase();
  if (!client) throw new Error("Supabase is niet geconfigureerd.");

  const { data, error } = await client
    .from("supplier_performance_reviews")
    .select("*, supplier_performance_review_items(*)")
    .eq("supplier_id", supplierId)
    .order("review_date", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createSupplierPerformanceReview(reviewPayload, itemRows = []) {
  const client = supabase();
  if (!client) throw new Error("Supabase is niet geconfigureerd.");

  const { data: review, error: reviewError } = await client
    .from("supplier_performance_reviews")
    .insert(reviewPayload)
    .select()
    .single();

  if (reviewError) throw reviewError;

  if (itemRows.length) {
    const rows = itemRows.map((item) => ({ ...item, review_id: review.id }));
    const { error: itemsError } = await client
      .from("supplier_performance_review_items")
      .insert(rows);

    if (itemsError) throw itemsError;
  }

  return review;
}
