import { NextResponse } from "next/server";
import { createSubscription } from "@/services/subscriptionService";

export async function POST(req: Request) {
  const { userId, plan } = await req.json();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subscription = await createSubscription(userId, plan);

  return NextResponse.json(subscription);
}
