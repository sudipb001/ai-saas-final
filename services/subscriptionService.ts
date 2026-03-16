import { supabase } from "@/lib/supabase";

export async function createSubscription(userId: string, plan: string) {
  const subscription = {
    id: "sub_demo_12345",
    plan,
    status: "active",
  };

  await supabase.from("subscriptions").insert({
    user_id: userId,
    plan: plan,
    status: "active",
  });

  return subscription;
}

// export async function createSubscription(plan: string) {
//   return {
//     id: "sub_demo_12345",
//     plan,
//     status: "created",
//   };
// }

// // // Real code
// // import Razorpay from "razorpay"

// // const razorpay = new Razorpay({
// //   key_id: process.env.RAZORPAY_KEY_ID!,
// //   key_secret: process.env.RAZORPAY_KEY_SECRET!
// // })
