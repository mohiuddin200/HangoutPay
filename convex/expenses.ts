import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const create = mutation({
  args: {
    tripId: v.id("trips"),
    title: v.string(),
    amount: v.number(),
    category: v.string(),
    payers: v.array(
      v.object({
        userId: v.id("users"),
        amount: v.number(),
      })
    ),
    participants: v.array(v.id("users")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    // Verify user is a trip member
    const membership = await ctx.db
      .query("members")
      .withIndex("by_tripId_userId", (q) =>
        q.eq("tripId", args.tripId).eq("userId", userId)
      )
      .unique();

    if (membership === null) {
      throw new Error("You are not a member of this trip");
    }

    // Validate amount is a positive integer (paisa)
    if (!Number.isInteger(args.amount) || args.amount <= 0) {
      throw new Error("Amount must be a positive integer (paisa)");
    }

    // Validate payer amounts sum to total
    const payerTotal = args.payers.reduce((sum, p) => sum + p.amount, 0);
    if (payerTotal !== args.amount) {
      throw new Error(
        `Sum of payer amounts (${payerTotal}) must equal total amount (${args.amount})`
      );
    }

    // Validate at least one participant
    if (args.participants.length === 0) {
      throw new Error("At least one participant is required");
    }

    // Validate all payer amounts are positive integers
    for (const payer of args.payers) {
      if (!Number.isInteger(payer.amount) || payer.amount <= 0) {
        throw new Error("Each payer amount must be a positive integer (paisa)");
      }
    }

    const now = Date.now();

    const expenseId = await ctx.db.insert("expenses", {
      tripId: args.tripId,
      title: args.title,
      amount: args.amount,
      category: args.category,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    });

    // Create payer records
    for (const payer of args.payers) {
      await ctx.db.insert("expensePayers", {
        expenseId,
        userId: payer.userId,
        amount: payer.amount,
      });
    }

    // Create participant records
    for (const participantId of args.participants) {
      await ctx.db.insert("expenseParticipants", {
        expenseId,
        userId: participantId,
      });
    }

    // Create audit log
    await ctx.db.insert("auditLogs", {
      tripId: args.tripId,
      userId,
      action: "create",
      entityType: "expense",
      entityId: expenseId,
      details: `Created expense "${args.title}" for ${args.amount} paisa`,
      createdAt: now,
    });

    return expenseId;
  },
});

export const update = mutation({
  args: {
    expenseId: v.id("expenses"),
    title: v.optional(v.string()),
    amount: v.optional(v.number()),
    category: v.optional(v.string()),
    payers: v.optional(
      v.array(
        v.object({
          userId: v.id("users"),
          amount: v.number(),
        })
      )
    ),
    participants: v.optional(v.array(v.id("users"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    const expense = await ctx.db.get(args.expenseId);
    if (expense === null || expense.isDeleted) {
      throw new Error("Expense not found");
    }

    // Check if user is admin or the creator
    const membership = await ctx.db
      .query("members")
      .withIndex("by_tripId_userId", (q) =>
        q.eq("tripId", expense.tripId).eq("userId", userId)
      )
      .unique();

    if (membership === null) {
      throw new Error("You are not a member of this trip");
    }

    if (membership.role !== "admin" && expense.createdBy !== userId) {
      throw new Error("Only the creator or an admin can update this expense");
    }

    const now = Date.now();
    const newAmount = args.amount ?? expense.amount;

    // If payers are being updated, validate
    if (args.payers !== undefined) {
      const payerTotal = args.payers.reduce((sum, p) => sum + p.amount, 0);
      if (payerTotal !== newAmount) {
        throw new Error(
          `Sum of payer amounts (${payerTotal}) must equal total amount (${newAmount})`
        );
      }

      for (const payer of args.payers) {
        if (!Number.isInteger(payer.amount) || payer.amount <= 0) {
          throw new Error(
            "Each payer amount must be a positive integer (paisa)"
          );
        }
      }

      // Delete old payers
      const oldPayers = await ctx.db
        .query("expensePayers")
        .withIndex("by_expenseId", (q) => q.eq("expenseId", args.expenseId))
        .collect();

      for (const oldPayer of oldPayers) {
        await ctx.db.delete(oldPayer._id);
      }

      // Create new payers
      for (const payer of args.payers) {
        await ctx.db.insert("expensePayers", {
          expenseId: args.expenseId,
          userId: payer.userId,
          amount: payer.amount,
        });
      }
    }

    // If participants are being updated, validate and replace
    if (args.participants !== undefined) {
      if (args.participants.length === 0) {
        throw new Error("At least one participant is required");
      }

      // Delete old participants
      const oldParticipants = await ctx.db
        .query("expenseParticipants")
        .withIndex("by_expenseId", (q) => q.eq("expenseId", args.expenseId))
        .collect();

      for (const oldParticipant of oldParticipants) {
        await ctx.db.delete(oldParticipant._id);
      }

      // Create new participants
      for (const participantId of args.participants) {
        await ctx.db.insert("expenseParticipants", {
          expenseId: args.expenseId,
          userId: participantId,
        });
      }
    }

    // Update the expense record
    const updates: Record<string, unknown> = { updatedAt: now };
    if (args.title !== undefined) updates.title = args.title;
    if (args.amount !== undefined) updates.amount = args.amount;
    if (args.category !== undefined) updates.category = args.category;

    await ctx.db.patch(args.expenseId, updates);

    // Audit log
    await ctx.db.insert("auditLogs", {
      tripId: expense.tripId,
      userId,
      action: "update",
      entityType: "expense",
      entityId: args.expenseId,
      details: `Updated expense "${args.title ?? expense.title}"`,
      createdAt: now,
    });

    return { success: true };
  },
});

export const softDelete = mutation({
  args: { expenseId: v.id("expenses") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    const expense = await ctx.db.get(args.expenseId);
    if (expense === null || expense.isDeleted) {
      throw new Error("Expense not found");
    }

    // Check if user is admin or the creator
    const membership = await ctx.db
      .query("members")
      .withIndex("by_tripId_userId", (q) =>
        q.eq("tripId", expense.tripId).eq("userId", userId)
      )
      .unique();

    if (membership === null) {
      throw new Error("You are not a member of this trip");
    }

    if (membership.role !== "admin" && expense.createdBy !== userId) {
      throw new Error("Only the creator or an admin can delete this expense");
    }

    const now = Date.now();

    await ctx.db.patch(args.expenseId, {
      isDeleted: true,
      updatedAt: now,
    });

    // Audit log
    await ctx.db.insert("auditLogs", {
      tripId: expense.tripId,
      userId,
      action: "delete",
      entityType: "expense",
      entityId: args.expenseId,
      details: `Deleted expense "${expense.title}"`,
      createdAt: now,
    });

    return { success: true };
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

    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_tripId_createdAt", (q) => q.eq("tripId", args.tripId))
      .order("desc")
      .collect();

    // Filter out deleted expenses
    const activeExpenses = expenses.filter((e) => !e.isDeleted);

    // Populate payers and participants
    const result = await Promise.all(
      activeExpenses.map(async (expense) => {
        const payers = await ctx.db
          .query("expensePayers")
          .withIndex("by_expenseId", (q) => q.eq("expenseId", expense._id))
          .collect();

        const payersWithUsers = await Promise.all(
          payers.map(async (payer) => {
            const user = await ctx.db.get(payer.userId);
            return { ...payer, user };
          })
        );

        const participants = await ctx.db
          .query("expenseParticipants")
          .withIndex("by_expenseId", (q) => q.eq("expenseId", expense._id))
          .collect();

        const participantsWithUsers = await Promise.all(
          participants.map(async (participant) => {
            const user = await ctx.db.get(participant.userId);
            return { ...participant, user };
          })
        );

        const creator = await ctx.db.get(expense.createdBy);

        return {
          ...expense,
          payers: payersWithUsers,
          participants: participantsWithUsers,
          creator,
        };
      })
    );

    return result;
  },
});

export const get = query({
  args: { expenseId: v.id("expenses") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    const expense = await ctx.db.get(args.expenseId);
    if (expense === null || expense.isDeleted) {
      throw new Error("Expense not found");
    }

    // Verify membership
    const membership = await ctx.db
      .query("members")
      .withIndex("by_tripId_userId", (q) =>
        q.eq("tripId", expense.tripId).eq("userId", userId)
      )
      .unique();

    if (membership === null) {
      throw new Error("You are not a member of this trip");
    }

    const payers = await ctx.db
      .query("expensePayers")
      .withIndex("by_expenseId", (q) => q.eq("expenseId", expense._id))
      .collect();

    const payersWithUsers = await Promise.all(
      payers.map(async (payer) => {
        const user = await ctx.db.get(payer.userId);
        return { ...payer, user };
      })
    );

    const participants = await ctx.db
      .query("expenseParticipants")
      .withIndex("by_expenseId", (q) => q.eq("expenseId", expense._id))
      .collect();

    const participantsWithUsers = await Promise.all(
      participants.map(async (participant) => {
        const user = await ctx.db.get(participant.userId);
        return { ...participant, user };
      })
    );

    const creator = await ctx.db.get(expense.createdBy);

    return {
      ...expense,
      payers: payersWithUsers,
      participants: participantsWithUsers,
      creator,
    };
  },
});
