import { NextResponse } from "next/server";
import { createSubscription } from "@/services/subscriptionService";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userId = (body?.userId ?? "").trim();
    const plan = (body?.plan ?? "").trim();

    console.log("[POST /api/subscriptions/create] Request received", {
      userId,
      plan,
    });

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!plan) {
      return NextResponse.json({ error: "Plan is required" }, { status: 400 });
    }

    const subscription = await createSubscription(userId, plan);

    console.log("[POST /api/subscriptions/create] Subscription created", {
      userId,
      plan,
      subscription,
    });

    return NextResponse.json({ success: true, subscription }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Subscription failed";

    console.error("[POST /api/subscriptions/create] Failed", {
      error,
      message,
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
