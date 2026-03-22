import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { query } from "./_generated/server";

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

    const logs = await ctx.db
      .query("auditLogs")
      .withIndex("by_tripId", (q) => q.eq("tripId", args.tripId))
      .order("desc")
      .collect();

    // Populate user details
    const result = await Promise.all(
      logs.map(async (log) => {
        const user = await ctx.db.get(log.userId);
        return {
          ...log,
          user,
        };
      })
    );

    return result;
  },
});
