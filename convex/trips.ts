import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { QueryCtx, MutationCtx } from "./_generated/server";

async function assertTripAdmin(
  ctx: QueryCtx | MutationCtx,
  tripId: Id<"trips">,
  userId: Id<"users">
) {
  const member = await ctx.db
    .query("members")
    .withIndex("by_tripId_userId", (q) =>
      q.eq("tripId", tripId).eq("userId", userId)
    )
    .unique();

  if (member === null || member.role !== "admin") {
    throw new Error("Only trip admins can perform this action");
  }
  return member;
}

async function assertTripMember(
  ctx: QueryCtx | MutationCtx,
  tripId: Id<"trips">,
  userId: Id<"users">
) {
  const member = await ctx.db
    .query("members")
    .withIndex("by_tripId_userId", (q) =>
      q.eq("tripId", tripId).eq("userId", userId)
    )
    .unique();

  if (member === null) {
    throw new Error("You are not a member of this trip");
  }
  return member;
}

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    const now = Date.now();

    const tripId = await ctx.db.insert("trips", {
      name: args.name,
      description: args.description,
      createdBy: userId,
      createdAt: now,
    });

    // Add creator as admin member
    await ctx.db.insert("members", {
      tripId,
      userId,
      role: "admin",
      joinedAt: now,
    });

    return tripId;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return [];
    }

    // Get all memberships for the current user
    const memberships = await ctx.db
      .query("members")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const trips = await Promise.all(
      memberships.map(async (membership) => {
        const trip = await ctx.db.get(membership.tripId);
        if (trip === null) {
          return null;
        }

        // Count members for this trip
        const members = await ctx.db
          .query("members")
          .withIndex("by_tripId", (q) => q.eq("tripId", trip._id))
          .collect();

        return {
          ...trip,
          memberCount: members.length,
          currentUserRole: membership.role,
        };
      })
    );

    return trips.filter((t) => t !== null);
  },
});

export const get = query({
  args: { tripId: v.id("trips") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    const trip = await ctx.db.get(args.tripId);
    if (trip === null) {
      throw new Error("Trip not found");
    }

    // Verify the user is a member
    await assertTripMember(ctx, args.tripId, userId);

    // Get all members with user details
    const memberRecords = await ctx.db
      .query("members")
      .withIndex("by_tripId", (q) => q.eq("tripId", args.tripId))
      .collect();

    const members = await Promise.all(
      memberRecords.map(async (member) => {
        const user = await ctx.db.get(member.userId);
        return {
          ...member,
          user,
        };
      })
    );

    return {
      ...trip,
      members,
    };
  },
});

export const update = mutation({
  args: {
    tripId: v.id("trips"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    await assertTripAdmin(ctx, args.tripId, userId);

    const updates: Record<string, string | undefined> = {};
    if (args.name !== undefined) {
      updates.name = args.name;
    }
    if (args.description !== undefined) {
      updates.description = args.description;
    }

    await ctx.db.patch(args.tripId, updates);
    return { success: true };
  },
});

export const addMember = mutation({
  args: {
    tripId: v.id("trips"),
    userId: v.id("users"),
    role: v.optional(v.union(v.literal("admin"), v.literal("member"))),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (currentUserId === null) {
      throw new Error("Not authenticated");
    }

    await assertTripAdmin(ctx, args.tripId, currentUserId);

    // Check if user is already a member
    const existing = await ctx.db
      .query("members")
      .withIndex("by_tripId_userId", (q) =>
        q.eq("tripId", args.tripId).eq("userId", args.userId)
      )
      .unique();

    if (existing !== null) {
      throw new Error("User is already a member of this trip");
    }

    // Verify the target user exists
    const targetUser = await ctx.db.get(args.userId);
    if (targetUser === null) {
      throw new Error("User not found");
    }

    const memberId = await ctx.db.insert("members", {
      tripId: args.tripId,
      userId: args.userId,
      role: args.role ?? "member",
      joinedAt: Date.now(),
    });

    return memberId;
  },
});

export const removeMember = mutation({
  args: {
    tripId: v.id("trips"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (currentUserId === null) {
      throw new Error("Not authenticated");
    }

    await assertTripAdmin(ctx, args.tripId, currentUserId);

    if (args.userId === currentUserId) {
      throw new Error("Cannot remove yourself from the trip");
    }

    const member = await ctx.db
      .query("members")
      .withIndex("by_tripId_userId", (q) =>
        q.eq("tripId", args.tripId).eq("userId", args.userId)
      )
      .unique();

    if (member === null) {
      throw new Error("User is not a member of this trip");
    }

    await ctx.db.delete(member._id);
    return { success: true };
  },
});

export const inviteByUsername = mutation({
  args: {
    tripId: v.id("trips"),
    username: v.string(),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (currentUserId === null) {
      throw new Error("Not authenticated");
    }

    await assertTripAdmin(ctx, args.tripId, currentUserId);

    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .unique();

    if (user === null) {
      throw new Error("User not found with that username");
    }

    // Check if already a member
    const existing = await ctx.db
      .query("members")
      .withIndex("by_tripId_userId", (q) =>
        q.eq("tripId", args.tripId).eq("userId", user._id)
      )
      .unique();

    if (existing !== null) {
      throw new Error("User is already a member of this trip");
    }

    const memberId = await ctx.db.insert("members", {
      tripId: args.tripId,
      userId: user._id,
      role: "member",
      joinedAt: Date.now(),
    });

    return memberId;
  },
});
