export type Plan = "free" | "pro";

export const PLANS = {
  free: {
    name: "Free",
    price: 0,
    aiLimit: 10,
  },

  pro: {
    name: "Pro",
    price: 999,
    aiLimit: 1000,
  },
};
