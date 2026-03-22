import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const create = mutation({
  args: {
    tripId: v.id("trips"),
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    // Validate amount
    if (!Number.isInteger(args.amount) || args.amount <= 0) {
      throw new Error("Amount must be a positive integer (paisa)");
    }

    if (args.fromUserId === args.toUserId) {
      throw new Error("Cannot settle with yourself");
    }

    // Verify current user is a trip member
    const currentMembership = await ctx.db
      .query("members")
      .withIndex("by_tripId_userId", (q) =>
        q.eq("tripId", args.tripId).eq("userId", userId)
      )
      .unique();

    if (currentMembership === null) {
      throw new Error("You are not a member of this trip");
    }

    // Verify fromUser is a trip member
    const fromMembership = await ctx.db
      .query("members")
      .withIndex("by_tripId_userId", (q) =>
        q.eq("tripId", args.tripId).eq("userId", args.fromUserId)
      )
      .unique();

    if (fromMembership === null) {
      throw new Error("The payer is not a member of this trip");
    }

    // Verify toUser is a trip member
    const toMembership = await ctx.db
      .query("members")
      .withIndex("by_tripId_userId", (q) =>
        q.eq("tripId", args.tripId).eq("userId", args.toUserId)
      )
      .unique();

    if (toMembership === null) {
      throw new Error("The recipient is not a member of this trip");
    }

    const now = Date.now();

    const settlementId = await ctx.db.insert("settlements", {
      tripId: args.tripId,
      fromUserId: args.fromUserId,
      toUserId: args.toUserId,
      amount: args.amount,
      createdAt: now,
      createdBy: userId,
    });

    // Audit log
    await ctx.db.insert("auditLogs", {
      tripId: args.tripId,
      userId,
      action: "create",
      entityType: "settlement",
      entityId: settlementId,
      details: `Recorded settlement of ${args.amount} paisa from user to another`,
      createdAt: now,
    });

    return settlementId;
  },
});

export const listByTrip = query({
  args: { tripId: v.id("trips") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    // Verify membership
    const membership = await ctx.db
      .query("members")
      .withIndex("by_tripId_userId", (q) =>
        q.eq("tripId", args.tripId).eq("userId", userId)
      )
      .unique();

    if (membership === null) {
      throw new Error("You are not a member of this trip");
    }

    const settlements = await ctx.db
      .query("settlements")
      .withIndex("by_tripId", (q) => q.eq("tripId", args.tripId))
      .collect();

    // Populate user details
    const result = await Promise.all(
      settlements.map(async (settlement) => {
        const fromUser = await ctx.db.get(settlement.fromUserId);
        const toUser = await ctx.db.get(settlement.toUserId);
        const createdByUser = await ctx.db.get(settlement.createdBy);
        return {
          ...settlement,
          fromUser,
          toUser,
          createdByUser,
        };
      })
    );

    return result;
  },
});
