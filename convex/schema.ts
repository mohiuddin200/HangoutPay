import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const schema = defineSchema({
  ...authTables,

  // Override the auth users table with additional fields
  users: defineTable({
    // Fields from @convex-dev/auth
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    image: v.optional(v.string()),
    isAnonymous: v.optional(v.boolean()),
    // Custom fields
    username: v.optional(v.string()),
    isGhost: v.optional(v.boolean()),
    claimedBy: v.optional(v.id("users")),
  })
    .index("email", ["email"])
    .index("by_username", ["username"]),

  trips: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
  }).index("by_createdBy", ["createdBy"]),

  members: defineTable({
    tripId: v.id("trips"),
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("member")),
    joinedAt: v.number(),
  })
    .index("by_tripId", ["tripId"])
    .index("by_userId", ["userId"])
    .index("by_tripId_userId", ["tripId", "userId"]),

  expenses: defineTable({
    tripId: v.id("trips"),
    title: v.string(),
    amount: v.number(),
    category: v.string(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
    isDeleted: v.boolean(),
  })
    .index("by_tripId", ["tripId"])
    .index("by_tripId_createdAt", ["tripId", "createdAt"]),

  expensePayers: defineTable({
    expenseId: v.id("expenses"),
    userId: v.id("users"),
    amount: v.number(),
  }).index("by_expenseId", ["expenseId"]),

  expenseParticipants: defineTable({
    expenseId: v.id("expenses"),
    userId: v.id("users"),
  }).index("by_expenseId", ["expenseId"]),

  settlements: defineTable({
    tripId: v.id("trips"),
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
    amount: v.number(),
    createdAt: v.number(),
    createdBy: v.id("users"),
  }).index("by_tripId", ["tripId"]),

  auditLogs: defineTable({
    tripId: v.id("trips"),
    userId: v.id("users"),
    action: v.string(),
    entityType: v.string(),
    entityId: v.string(),
    details: v.string(),
    createdAt: v.number(),
  }).index("by_tripId", ["tripId"]),
});

export default schema;
