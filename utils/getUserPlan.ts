import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function getUserPlan(userId: string) {
  console.log("[getUserPlan] Resolving plan", { resolvedUserId: userId });

  const { data, error } = await supabaseAdmin
    .from("subscriptions")
    .select("id,plan,status,created_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[getUserPlan] Failed to fetch user subscription", {
      resolvedUserId: userId,
      error,
    });
    return "free";
  }

  console.log("[getUserPlan] Subscription row", {
    resolvedUserId: userId,
    subscription: data,
  });

  if (!data) {
    console.log("[getUserPlan] Computed plan", {
      resolvedUserId: userId,
      computedPlan: "free",
      reason: "no-active-subscription",
    });
    return "free";
  }

  const status = (data.status ?? "").trim().toLowerCase();
  const plan = (data.plan ?? "").trim().toLowerCase();

  console.log("[getUserPlan] Normalized subscription", {
    resolvedUserId: userId,
    plan,
    status,
  });

  if (status === "active" && plan === "pro") {
    console.log("[getUserPlan] Computed plan", {
      resolvedUserId: userId,
      computedPlan: "pro",
    });
    return "pro";
  }

  console.log("[getUserPlan] Computed plan", {
    resolvedUserId: userId,
    computedPlan: "free",
    reason: "subscription-not-pro-active",
  });

  return "free";
}
