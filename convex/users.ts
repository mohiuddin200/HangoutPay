import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const current = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return null;
    }
    return await ctx.db.get(userId);
  },
});

export const getById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

export const getByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .unique();
  },
});

export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .unique();
  },
});

export const updateUsername = mutation({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    const username = args.username.trim().toLowerCase();

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      throw new Error(
        "Username must be 3-20 characters and contain only letters, numbers, and underscores"
      );
    }

    const existing = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", username))
      .unique();

    if (existing !== null && existing._id !== userId) {
      throw new Error("Username is already taken");
    }

    await ctx.db.patch(userId, { username });
    return { success: true };
  },
});

export const createGhostUser = mutation({
  args: {
    name: v.string(),
    email: v.optional(v.string()),
    tripId: v.id("trips"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    // Verify user is admin of the trip
    const membership = await ctx.db
      .query("members")
      .withIndex("by_tripId_userId", (q) =>
        q.eq("tripId", args.tripId).eq("userId", userId)
      )
      .unique();

    if (membership === null) {
      throw new Error("You are not a member of this trip");
    }

    const timestamp = Date.now();
    const ghostUsername = `ghost_${timestamp}_${Math.random().toString(36).substring(2, 8)}`;

    const ghostId = await ctx.db.insert("users", {
      name: args.name,
      email: args.email ?? "",
      username: ghostUsername,
      isGhost: true,
      claimedBy: userId,
    });

    // Add ghost user to the trip
    await ctx.db.insert("members", {
      tripId: args.tripId,
      userId: ghostId,
      role: "member",
      joinedAt: timestamp,
    });

    return ghostId;
  },
});
