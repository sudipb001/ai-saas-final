import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function createSubscription(userId: string, plan: string) {
  const normalizedUserId = (userId ?? "").trim();
  const normalizedPlan = (plan ?? "").trim().toLowerCase();

  console.log("[createSubscription] Attempting insert", {
    userId: normalizedUserId,
    plan: normalizedPlan,
  });

  if (!normalizedUserId) {
    throw new Error("Missing required field: userId");
  }

  if (!normalizedPlan) {
    throw new Error("Missing required field: plan");
  }

  const { data, error } = await supabaseAdmin
    .from("subscriptions")
    .insert({
      user_id: normalizedUserId,
      plan: normalizedPlan,
      status: "active",
    })
    .select("id, user_id, plan, status, created_at")
    .single();

  console.log("[createSubscription] Supabase insert result", {
    userId: normalizedUserId,
    plan: normalizedPlan,
    insertResult: data,
  });

  if (error) {
    console.error("[createSubscription] Supabase insert error", {
      userId: normalizedUserId,
      plan: normalizedPlan,
      error,
    });
    throw new Error(error.message);
  }

  if (!data) {
    console.error("[createSubscription] Insert completed without data", {
      userId: normalizedUserId,
      plan: normalizedPlan,
    });
    throw new Error("Failed to create subscription: no row returned");
  }

  return data;
}
