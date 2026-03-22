import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

async function computeBalancesForTrip(ctx: QueryCtx, tripId: Id<"trips">) {
  const balances = new Map<string, number>();

  const members = await ctx.db
    .query("members")
    .withIndex("by_tripId", (q) => q.eq("tripId", tripId))
    .collect();

  for (const member of members) {
    balances.set(member.userId, 0);
  }

  const expenses = await ctx.db
    .query("expenses")
    .withIndex("by_tripId", (q) => q.eq("tripId", tripId))
    .collect();

  for (const expense of expenses) {
    if (expense.isDeleted) continue;

    const payers = await ctx.db
      .query("expensePayers")
      .withIndex("by_expenseId", (q) => q.eq("expenseId", expense._id))
      .collect();

    const participants = await ctx.db
      .query("expenseParticipants")
      .withIndex("by_expenseId", (q) => q.eq("expenseId", expense._id))
      .collect();

    const numParticipants = participants.length;
    if (numParticipants === 0) continue;

    for (const payer of payers) {
      const current = balances.get(payer.userId) ?? 0;
      balances.set(payer.userId, current + payer.amount);
    }

    const shareBase = Math.floor(expense.amount / numParticipants);
    const remainder = expense.amount - shareBase * numParticipants;

    for (let i = 0; i < participants.length; i++) {
      const participant = participants[i];
      const share = shareBase + (i < remainder ? 1 : 0);
      const current = balances.get(participant.userId) ?? 0;
      balances.set(participant.userId, current - share);
    }
  }

  const settlements = await ctx.db
    .query("settlements")
    .withIndex("by_tripId", (q) => q.eq("tripId", tripId))
    .collect();

  for (const settlement of settlements) {
    const fromCurrent = balances.get(settlement.fromUserId) ?? 0;
    balances.set(settlement.fromUserId, fromCurrent + settlement.amount);

    const toCurrent = balances.get(settlement.toUserId) ?? 0;
    balances.set(settlement.toUserId, toCurrent - settlement.amount);
  }

  return balances;
}

export const getByTrip = query({
  args: { tripId: v.id("trips") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    const membership = await ctx.db
      .query("members")
      .withIndex("by_tripId_userId", (q) =>
        q.eq("tripId", args.tripId).eq("userId", userId)
      )
      .unique();

    if (membership === null) {
      throw new Error("You are not a member of this trip");
    }

    const balances = await computeBalancesForTrip(ctx, args.tripId);

    const result = await Promise.all(
      Array.from(balances.entries()).map(async ([memberId, balance]) => {
        const user = await ctx.db.get(memberId as Id<"users">);
        return {
          userId: memberId as Id<"users">,
          balance,
          user,
        };
      })
    );

    return result;
  },
});

export const getOptimizedSettlements = query({
  args: { tripId: v.id("trips") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    const membership = await ctx.db
      .query("members")
      .withIndex("by_tripId_userId", (q) =>
        q.eq("tripId", args.tripId).eq("userId", userId)
      )
      .unique();

    if (membership === null) {
      throw new Error("You are not a member of this trip");
    }

    const balances = await computeBalancesForTrip(ctx, args.tripId);

    // Separate into creditors and debtors
    const creditors: { userId: string; amount: number }[] = [];
    const debtors: { userId: string; amount: number }[] = [];

    for (const [memberId, balance] of balances.entries()) {
      if (balance > 0) {
        creditors.push({ userId: memberId, amount: balance });
      } else if (balance < 0) {
        debtors.push({ userId: memberId, amount: -balance });
      }
    }

    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);

    const optimized: {
      from: Id<"users">;
      to: Id<"users">;
      amount: number;
    }[] = [];

    let ci = 0;
    let di = 0;

    while (ci < creditors.length && di < debtors.length) {
      const transfer = Math.min(creditors[ci].amount, debtors[di].amount);

      if (transfer > 0) {
        optimized.push({
          from: debtors[di].userId as Id<"users">,
          to: creditors[ci].userId as Id<"users">,
          amount: transfer,
        });
      }

      creditors[ci].amount -= transfer;
      debtors[di].amount -= transfer;

      if (creditors[ci].amount === 0) ci++;
      if (debtors[di].amount === 0) di++;
    }

    const result = await Promise.all(
      optimized.map(async (s) => {
        const fromUser = await ctx.db.get(s.from);
        const toUser = await ctx.db.get(s.to);
        return { ...s, fromUser, toUser };
      })
    );

    return result;
  },
});

export const getUserSummary = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return { totalOwed: 0, totalReceivable: 0 };
    }

    // Get all trips the user is a member of
    const memberships = await ctx.db
      .query("members")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    let totalOwed = 0; // money user owes others
    let totalReceivable = 0; // money owed to user

    for (const membership of memberships) {
      const balances = await computeBalancesForTrip(ctx, membership.tripId);
      const userBalance = balances.get(userId) ?? 0;

      if (userBalance > 0) {
        totalReceivable += userBalance;
      } else if (userBalance < 0) {
        totalOwed += -userBalance;
      }
    }

    return { totalOwed, totalReceivable };
  },
});

export const getTripAnalytics = query({
  args: { tripId: v.id("trips") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    const membership = await ctx.db
      .query("members")
      .withIndex("by_tripId_userId", (q) =>
        q.eq("tripId", args.tripId).eq("userId", userId)
      )
      .unique();

    if (membership === null) {
      throw new Error("You are not a member of this trip");
    }

    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_tripId", (q) => q.eq("tripId", args.tripId))
      .collect();

    const activeExpenses = expenses.filter((e) => !e.isDeleted);
    const totalSpent = activeExpenses.reduce((sum, e) => sum + e.amount, 0);

    const userSpending = new Map<string, number>();

    for (const expense of activeExpenses) {
      const payers = await ctx.db
        .query("expensePayers")
        .withIndex("by_expenseId", (q) => q.eq("expenseId", expense._id))
        .collect();

      for (const payer of payers) {
        const current = userSpending.get(payer.userId) ?? 0;
        userSpending.set(payer.userId, current + payer.amount);
      }
    }

    const categoryBreakdown = new Map<string, number>();
    for (const expense of activeExpenses) {
      const current = categoryBreakdown.get(expense.category) ?? 0;
      categoryBreakdown.set(expense.category, current + expense.amount);
    }

    const perUserSpending = await Promise.all(
      Array.from(userSpending.entries()).map(async ([memberId, amount]) => {
        const user = await ctx.db.get(memberId as Id<"users">);
        return {
          userId: memberId as Id<"users">,
          amount,
          user,
        };
      })
    );

    return {
      totalSpent,
      expenseCount: activeExpenses.length,
      perUserSpending,
      categoryBreakdown: Array.from(categoryBreakdown.entries()).map(
        ([category, amount]) => ({ category, amount })
      ),
    };
  },
});
