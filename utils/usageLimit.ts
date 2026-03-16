import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getUserPlan } from "./getUserPlan";

const FREE_DAILY_LIMIT = 10;

type UsageLimitResult =
  | { allowed: true }
  | { allowed: false; reason: "limit" | "error"; message: string };

export async function checkUsageLimit(
  userId: string,
): Promise<UsageLimitResult> {
  console.log("[usageLimit] Checking usage", { resolvedUserId: userId });

  const plan = await getUserPlan(userId);

  console.log("[usageLimit] Computed plan", { resolvedUserId: userId, plan });

  if (plan === "pro") {
    console.log("[usageLimit] Unlimited usage for pro plan", {
      resolvedUserId: userId,
    });
    return { allowed: true };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count, error } = await supabaseAdmin
    .from("ai_requests")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", today.toISOString());

  if (error) {
    console.error("[usageLimit] Usage check error", {
      resolvedUserId: userId,
      error,
    });
    return {
      allowed: false,
      reason: "error",
      message: "Unable to validate usage right now. Please try again.",
    };
  }

  console.log("[usageLimit] Daily request count", {
    resolvedUserId: userId,
    count: count ?? 0,
    freeDailyLimit: FREE_DAILY_LIMIT,
  });

  if ((count ?? 0) >= FREE_DAILY_LIMIT) {
    console.log("[usageLimit] Request blocked: free daily limit reached", {
      resolvedUserId: userId,
      count: count ?? 0,
      freeDailyLimit: FREE_DAILY_LIMIT,
    });
    return {
      allowed: false,
      reason: "limit",
      message: "Daily free AI limit reached. Upgrade to Pro.",
    };
  }

  return { allowed: true };
}
