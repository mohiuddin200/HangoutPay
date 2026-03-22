import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { formatBDT, toPaisa, toBDT } from "@/lib/utils";
import {
  ArrowLeft,
  Plus,
  MoreVertical,
  Settings,
  UserPlus,
  UserMinus,
  Ghost,
  Receipt,
  Users,
  Scale,
  Calendar,
  Loader2,
  Pencil,
  Trash2,
  X,
} from "lucide-react";

const CATEGORIES = [
  { value: "food", label: "Food" },
  { value: "transport", label: "Transport" },
  { value: "accommodation", label: "Accommodation" },
  { value: "entertainment", label: "Entertainment" },
  { value: "shopping", label: "Shopping" },
  { value: "utilities", label: "Utilities" },
  { value: "other", label: "Other" },
] as const;

const CATEGORY_COLORS: Record<string, string> = {
  food: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  transport: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  accommodation: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  entertainment: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  shopping: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  utilities: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  other: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function TripPage() {
  const { tripId } = useParams<{ tripId: string }>();

  const trip = useQuery(
    api.trips.get,
    tripId ? { tripId: tripId as Id<"trips"> } : "skip"
  );
  const expenses = useQuery(
    api.expenses.listByTrip,
    tripId ? { tripId: tripId as Id<"trips"> } : "skip"
  );
  const balances = useQuery(
    api.balances.getByTrip,
    tripId ? { tripId: tripId as Id<"trips"> } : "skip"
  );
  const currentUser = useQuery(api.users.current);

  const isAdmin = useMemo(() => {
    if (!trip || !currentUser) return false;
    return trip.members.some(
      (m) => m.userId === currentUser._id && m.role === "admin"
    );
  }, [trip, currentUser]);

  if (trip === undefined || expenses === undefined || currentUser === undefined || currentUser === null) {
    return <TripPageSkeleton />;
  }

  if (trip === null) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-20">
        <p className="text-lg font-medium">Trip not found</p>
        <Link to="/">
          <Button variant="link">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link to="/">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold">{trip.name}</h1>
            {trip.description && (
              <p className="truncate text-xs text-muted-foreground">
                {trip.description}
              </p>
            )}
          </div>
          {isAdmin && (
            <TripSettingsMenu
              tripId={tripId as Id<"trips">}
              tripName={trip.name}
              tripDescription={trip.description}
            />
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="expenses" className="flex-1">
        <div className="border-b px-4">
          <TabsList className="w-full justify-start gap-2 bg-transparent p-0">
            <TabsTrigger
              value="expenses"
              className="gap-1 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none"
            >
              <Receipt className="h-4 w-4" />
              Expenses
            </TabsTrigger>
            <TabsTrigger
              value="balances"
              className="gap-1 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none"
            >
              <Scale className="h-4 w-4" />
              Balances
            </TabsTrigger>
            <TabsTrigger
              value="members"
              className="gap-1 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none"
            >
              <Users className="h-4 w-4" />
              Members
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="expenses" className="mt-0 px-4 py-4">
          <ExpensesTab
            expenses={expenses}
            members={trip.members}
            tripId={tripId as Id<"trips">}
            currentUserId={currentUser._id}
            isAdmin={isAdmin}
          />
        </TabsContent>

        <TabsContent value="balances" className="mt-0 px-4 py-4">
          <BalancesTab
            balances={balances}
            members={trip.members}
            tripId={tripId as Id<"trips">}
          />
        </TabsContent>

        <TabsContent value="members" className="mt-0 px-4 py-4">
          <MembersTab
            members={trip.members}
            tripId={tripId as Id<"trips">}
            isAdmin={isAdmin}
            currentUserId={currentUser._id}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ──────────────────────── Trip Settings Menu ──────────────────────── */

function TripSettingsMenu({
  tripId,
  tripName,
  tripDescription,
}: {
  tripId: Id<"trips">;
  tripName: string;
  tripDescription?: string;
}) {
  const { toast } = useToast();
  const updateTrip = useMutation(api.trips.update);
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState(tripName);
  const [description, setDescription] = useState(tripDescription ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await updateTrip({
        tripId,
        name: name.trim(),
        description: description.trim() || undefined,
      });
      toast({ title: "Trip updated" });
      setEditOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update trip",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="shrink-0">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Settings className="mr-2 h-4 w-4" />
            Edit Trip
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Trip</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} disabled={!name.trim() || saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ──────────────────────── Expenses Tab ──────────────────────── */

interface TripMember {
  _id: string;
  userId: Id<"users">;
  role: string;
  user: { _id: Id<"users">; name?: string; image?: string; username?: string; isGhost?: boolean } | null;
}

interface ExpenseItem {
  _id: Id<"expenses">;
  title: string;
  amount: number;
  category: string;
  createdAt: number;
  createdBy: Id<"users">;
  isDeleted: boolean;
  payers: Array<{
    userId: Id<"users">;
    amount: number;
    user: { _id: Id<"users">; name?: string } | null;
  }>;
  participants: Array<{
    userId: Id<"users">;
    user: { _id: Id<"users">; name?: string } | null;
  }>;
  creator: { _id: Id<"users">; name?: string } | null;
}

function ExpensesTab({
  expenses,
  members,
  tripId,
  currentUserId,
  isAdmin,
}: {
  expenses: ExpenseItem[];
  members: TripMember[];
  tripId: Id<"trips">;
  currentUserId: Id<"users">;
  isAdmin: boolean;
}) {
  const { toast } = useToast();
  const deleteExpense = useMutation(api.expenses.softDelete);
  const [addOpen, setAddOpen] = useState(false);
  const [detailExpense, setDetailExpense] = useState<ExpenseItem | null>(null);
  const [editExpense, setEditExpense] = useState<ExpenseItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canModify = (expense: ExpenseItem) =>
    isAdmin || expense.createdBy === currentUserId;

  const handleDelete = async (expense: ExpenseItem) => {
    setDeleting(true);
    try {
      await deleteExpense({ expenseId: expense._id });
      toast({ title: "Expense deleted" });
      setDetailExpense(null);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-3">
      {expenses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Receipt className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle className="mb-2 text-lg">No expenses yet</CardTitle>
            <CardDescription>
              Add your first expense to start tracking.
            </CardDescription>
          </CardContent>
        </Card>
      ) : (
        expenses.map((expense) => (
          <Card
            key={expense._id}
            className="cursor-pointer transition-colors hover:bg-accent/50"
            onClick={() => setDetailExpense(expense)}
          >
            <CardContent className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium">{expense.title}</p>
                  <Badge
                    variant="secondary"
                    className={`shrink-0 text-[10px] ${CATEGORY_COLORS[expense.category] ?? CATEGORY_COLORS.other}`}
                  >
                    {expense.category}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    Paid by{" "}
                    {expense.payers
                      .map((p) => p.user?.name ?? "Unknown")
                      .join(", ")}
                  </span>
                  <span className="text-muted-foreground/50">|</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(expense.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
              </div>
              <p className="shrink-0 text-right font-semibold">
                {formatBDT(expense.amount)}
              </p>
            </CardContent>
          </Card>
        ))
      )}

      {/* Expense Detail Dialog */}
      <Dialog
        open={detailExpense !== null}
        onOpenChange={(open) => !open && setDetailExpense(null)}
      >
        {detailExpense && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{detailExpense.title}</DialogTitle>
              <DialogDescription>
                {formatBDT(detailExpense.amount)} -{" "}
                {new Date(detailExpense.createdAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="mb-1 text-sm font-medium">Category</p>
                <Badge
                  variant="secondary"
                  className={CATEGORY_COLORS[detailExpense.category] ?? CATEGORY_COLORS.other}
                >
                  {detailExpense.category}
                </Badge>
              </div>
              <Separator />
              <div>
                <p className="mb-2 text-sm font-medium">Paid by</p>
                <div className="space-y-1">
                  {detailExpense.payers.map((payer) => (
                    <div
                      key={payer.userId}
                      className="flex items-center justify-between text-sm"
                    >
                      <span>{payer.user?.name ?? "Unknown"}</span>
                      <span className="font-medium">
                        {formatBDT(payer.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <Separator />
              <div>
                <p className="mb-2 text-sm font-medium">Split between</p>
                <div className="flex flex-wrap gap-1">
                  {detailExpense.participants.map((p) => (
                    <Badge key={p.userId} variant="outline" className="text-xs">
                      {p.user?.name ?? "Unknown"}
                    </Badge>
                  ))}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatBDT(
                    Math.round(
                      detailExpense.amount / detailExpense.participants.length
                    )
                  )}{" "}
                  each
                </p>
              </div>

              {/* Edit & Delete Actions */}
              {canModify(detailExpense) && (
                <>
                  <Separator />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 gap-1"
                      onClick={() => {
                        setEditExpense(detailExpense);
                        setDetailExpense(null);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1 gap-1"
                      disabled={deleting}
                      onClick={() => handleDelete(detailExpense)}
                    >
                      {deleting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      Delete
                    </Button>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Add Expense Dialog */}
      <AddExpenseDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        tripId={tripId}
        members={members}
        currentUserId={currentUserId}
      />

      {/* Edit Expense Dialog */}
      <EditExpenseDialog
        expense={editExpense}
        onOpenChange={(open) => !open && setEditExpense(null)}
        members={members}
        currentUserId={currentUserId}
      />

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-20">
        <Button
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}

/* ──────────────────────── Add Expense Dialog ──────────────────────── */

interface PayerEntry {
  userId: Id<"users"> | "";
  amount: string;
}

function AddExpenseDialog({
  open,
  onOpenChange,
  tripId,
  members,
  currentUserId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: Id<"trips">;
  members: TripMember[];
  currentUserId: Id<"users">;
}) {
  const { toast } = useToast();
  const createExpense = useMutation(api.expenses.create);

  const [title, setTitle] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [category, setCategory] = useState("other");
  const [splitPayment, setSplitPayment] = useState(false);
  const [payers, setPayers] = useState<PayerEntry[]>([
    { userId: currentUserId, amount: "" },
  ]);
  const [participants, setParticipants] = useState<Set<string>>(
    () => new Set(members.map((m) => m.userId))
  );
  const [submitting, setSubmitting] = useState(false);

  const totalAmountPaisa = amountStr ? toPaisa(parseFloat(amountStr) || 0) : 0;

  const resetForm = () => {
    setTitle("");
    setAmountStr("");
    setCategory("other");
    setSplitPayment(false);
    setPayers([{ userId: currentUserId, amount: "" }]);
    setParticipants(new Set(members.map((m) => m.userId)));
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) resetForm();
    onOpenChange(v);
  };

  const payerTotal = splitPayment
    ? payers.reduce((sum, p) => sum + toPaisa(parseFloat(p.amount) || 0), 0)
    : totalAmountPaisa;

  const payerSumValid = payerTotal === totalAmountPaisa && totalAmountPaisa > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || totalAmountPaisa <= 0 || participants.size === 0) return;

    const payersList = splitPayment
      ? payers
          .filter((p) => p.userId && parseFloat(p.amount) > 0)
          .map((p) => ({
            userId: p.userId as Id<"users">,
            amount: toPaisa(parseFloat(p.amount)),
          }))
      : [{ userId: currentUserId, amount: totalAmountPaisa }];

    const payerSum = payersList.reduce((s, p) => s + p.amount, 0);
    if (payerSum !== totalAmountPaisa) {
      toast({
        title: "Payer amounts mismatch",
        description: "The sum of payer amounts must equal the total amount.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      await createExpense({
        tripId,
        title: title.trim(),
        amount: totalAmountPaisa,
        category,
        payers: payersList,
        participants: Array.from(participants) as Id<"users">[],
      });
      toast({ title: "Expense added" });
      resetForm();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add expense",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const addPayer = () => {
    setPayers((prev) => [...prev, { userId: "", amount: "" }]);
  };

  const removePayer = (index: number) => {
    setPayers((prev) => prev.filter((_, i) => i !== index));
  };

  const updatePayer = (index: number, field: "userId" | "amount", value: string) => {
    setPayers((prev) =>
      prev.map((p, i) =>
        i === index
          ? { ...p, [field]: field === "userId" ? (value as Id<"users">) : value }
          : p
      )
    );
  };

  const toggleParticipant = (userId: string) => {
    setParticipants((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const selectAllParticipants = () => {
    setParticipants(new Set(members.map((m) => m.userId)));
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
            <DialogDescription>
              Record a new expense for this trip.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="expense-title">Title</Label>
              <Input
                id="expense-title"
                placeholder="e.g., Dinner at restaurant"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="expense-amount">Amount (BDT)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  ৳
                </span>
                <Input
                  id="expense-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="pl-7"
                />
              </div>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Payers */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Who paid?</Label>
                <label className="flex cursor-pointer items-center gap-2 text-xs">
                  <Checkbox
                    checked={splitPayment}
                    onCheckedChange={(c) => {
                      setSplitPayment(!!c);
                      if (!c) {
                        setPayers([{ userId: currentUserId, amount: "" }]);
                      }
                    }}
                  />
                  Split payment
                </label>
              </div>

              {!splitPayment ? (
                <p className="text-sm text-muted-foreground">
                  You ({members.find((m) => m.userId === currentUserId)?.user?.name ?? "You"}) paid the full amount.
                </p>
              ) : (
                <div className="space-y-2">
                  {payers.map((payer, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Select
                        value={payer.userId as string}
                        onValueChange={(v) => updatePayer(index, "userId", v)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select member" />
                        </SelectTrigger>
                        <SelectContent>
                          {members.map((m) => (
                            <SelectItem key={m.userId} value={m.userId}>
                              {m.user?.name ?? "Unknown"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="relative w-28">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          ৳
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={payer.amount}
                          onChange={(e) =>
                            updatePayer(index, "amount", e.target.value)
                          }
                          className="pl-5 text-sm"
                        />
                      </div>
                      {payers.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => removePayer(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={addPayer}
                  >
                    <Plus className="h-3 w-3" />
                    Add Payer
                  </Button>
                  {totalAmountPaisa > 0 && !payerSumValid && (
                    <p className="text-xs text-destructive">
                      Payer amounts ({formatBDT(payerTotal)}) must equal total (
                      {formatBDT(totalAmountPaisa)})
                    </p>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* Participants */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Split between</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto px-2 py-1 text-xs"
                  onClick={selectAllParticipants}
                >
                  Select All
                </Button>
              </div>
              <div className="space-y-2">
                {members.map((member) => (
                  <label
                    key={member.userId}
                    className="flex cursor-pointer items-center gap-3 rounded-md border p-2.5 transition-colors hover:bg-accent/50"
                  >
                    <Checkbox
                      checked={participants.has(member.userId)}
                      onCheckedChange={() => toggleParticipant(member.userId)}
                    />
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={member.user?.image} />
                      <AvatarFallback className="text-xs">
                        {getInitials(member.user?.name ?? "?")}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{member.user?.name ?? "Unknown"}</span>
                  </label>
                ))}
              </div>
              {participants.size > 0 && totalAmountPaisa > 0 && (
                <p className="text-xs text-muted-foreground">
                  Equal split:{" "}
                  {formatBDT(Math.round(totalAmountPaisa / participants.size))}{" "}
                  each
                </p>
              )}
              {participants.size === 0 && (
                <p className="text-xs text-destructive">
                  Select at least one participant
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={
                !title.trim() ||
                totalAmountPaisa <= 0 ||
                participants.size === 0 ||
                (splitPayment && !payerSumValid) ||
                submitting
              }
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Expense"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ──────────────────────── Edit Expense Dialog ──────────────────────── */

function EditExpenseDialog({
  expense,
  onOpenChange,
  members,
  currentUserId,
}: {
  expense: ExpenseItem | null;
  onOpenChange: (open: boolean) => void;
  members: TripMember[];
  currentUserId: Id<"users">;
}) {
  const { toast } = useToast();
  const updateExpense = useMutation(api.expenses.update);

  const [title, setTitle] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [category, setCategory] = useState("other");
  const [splitPayment, setSplitPayment] = useState(false);
  const [payers, setPayers] = useState<PayerEntry[]>([]);
  const [participants, setParticipants] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Pre-fill form when expense changes
  if (expense && !initialized) {
    setTitle(expense.title);
    setAmountStr(toBDT(expense.amount).toString());
    setCategory(expense.category);

    const hasMultiplePayers = expense.payers.length > 1;
    setSplitPayment(hasMultiplePayers);
    setPayers(
      expense.payers.map((p) => ({
        userId: p.userId,
        amount: toBDT(p.amount).toString(),
      }))
    );
    setParticipants(new Set(expense.participants.map((p) => p.userId)));
    setInitialized(true);
  }

  // Reset when dialog closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setInitialized(false);
    }
    onOpenChange(open);
  };

  const totalAmountPaisa = amountStr ? toPaisa(parseFloat(amountStr) || 0) : 0;

  const payerTotal = splitPayment
    ? payers.reduce((sum, p) => sum + toPaisa(parseFloat(p.amount) || 0), 0)
    : totalAmountPaisa;

  const payerSumValid = payerTotal === totalAmountPaisa && totalAmountPaisa > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expense || !title.trim() || totalAmountPaisa <= 0 || participants.size === 0)
      return;

    const payersList = splitPayment
      ? payers
          .filter((p) => p.userId && parseFloat(p.amount) > 0)
          .map((p) => ({
            userId: p.userId as Id<"users">,
            amount: toPaisa(parseFloat(p.amount)),
          }))
      : [{ userId: currentUserId, amount: totalAmountPaisa }];

    const payerSum = payersList.reduce((s, p) => s + p.amount, 0);
    if (payerSum !== totalAmountPaisa) {
      toast({
        title: "Payer amounts mismatch",
        description: "The sum of payer amounts must equal the total amount.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      await updateExpense({
        expenseId: expense._id,
        title: title.trim(),
        amount: totalAmountPaisa,
        category,
        payers: payersList,
        participants: Array.from(participants) as Id<"users">[],
      });
      toast({ title: "Expense updated" });
      setInitialized(false);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to update expense",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const addPayer = () => {
    setPayers((prev) => [...prev, { userId: "", amount: "" }]);
  };

  const removePayer = (index: number) => {
    setPayers((prev) => prev.filter((_, i) => i !== index));
  };

  const updatePayer = (
    index: number,
    field: "userId" | "amount",
    value: string
  ) => {
    setPayers((prev) =>
      prev.map((p, i) =>
        i === index
          ? {
              ...p,
              [field]:
                field === "userId" ? (value as Id<"users">) : value,
            }
          : p
      )
    );
  };

  const toggleParticipant = (userId: string) => {
    setParticipants((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  return (
    <Dialog open={expense !== null} onOpenChange={handleOpenChange}>
      {expense && (
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Edit Expense</DialogTitle>
              <DialogDescription>
                Modify the expense details. All balances will recalculate
                automatically.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-4">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  placeholder="e.g., Dinner at restaurant"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  autoFocus
                />
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="edit-amount">Amount (BDT)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    ৳
                  </span>
                  <Input
                    id="edit-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    className="pl-7"
                  />
                </div>
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Payers */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Who paid?</Label>
                  <label className="flex cursor-pointer items-center gap-2 text-xs">
                    <Checkbox
                      checked={splitPayment}
                      onCheckedChange={(c) => {
                        setSplitPayment(!!c);
                        if (!c) {
                          setPayers([
                            {
                              userId: currentUserId,
                              amount: amountStr,
                            },
                          ]);
                        }
                      }}
                    />
                    Split payment
                  </label>
                </div>

                {!splitPayment ? (
                  <p className="text-sm text-muted-foreground">
                    {members.find((m) => m.userId === (payers[0]?.userId || currentUserId))
                      ?.user?.name ?? "You"}{" "}
                    paid the full amount.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {payers.map((payer, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Select
                          value={payer.userId as string}
                          onValueChange={(v) =>
                            updatePayer(index, "userId", v)
                          }
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select member" />
                          </SelectTrigger>
                          <SelectContent>
                            {members.map((m) => (
                              <SelectItem key={m.userId} value={m.userId}>
                                {m.user?.name ?? "Unknown"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="relative w-28">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                            ৳
                          </span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={payer.amount}
                            onChange={(e) =>
                              updatePayer(index, "amount", e.target.value)
                            }
                            className="pl-5 text-sm"
                          />
                        </div>
                        {payers.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() => removePayer(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={addPayer}
                    >
                      <Plus className="h-3 w-3" />
                      Add Payer
                    </Button>
                    {totalAmountPaisa > 0 && !payerSumValid && (
                      <p className="text-xs text-destructive">
                        Payer amounts ({formatBDT(payerTotal)}) must equal total
                        ({formatBDT(totalAmountPaisa)})
                      </p>
                    )}
                  </div>
                )}
              </div>

              <Separator />

              {/* Participants */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Split between</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto px-2 py-1 text-xs"
                    onClick={() =>
                      setParticipants(
                        new Set(members.map((m) => m.userId))
                      )
                    }
                  >
                    Select All
                  </Button>
                </div>
                <div className="space-y-2">
                  {members.map((member) => (
                    <label
                      key={member.userId}
                      className="flex cursor-pointer items-center gap-3 rounded-md border p-2.5 transition-colors hover:bg-accent/50"
                    >
                      <Checkbox
                        checked={participants.has(member.userId)}
                        onCheckedChange={() =>
                          toggleParticipant(member.userId)
                        }
                      />
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={member.user?.image} />
                        <AvatarFallback className="text-xs">
                          {getInitials(member.user?.name ?? "?")}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">
                        {member.user?.name ?? "Unknown"}
                      </span>
                    </label>
                  ))}
                </div>
                {participants.size > 0 && totalAmountPaisa > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Equal split:{" "}
                    {formatBDT(
                      Math.round(totalAmountPaisa / participants.size)
                    )}{" "}
                    each
                  </p>
                )}
                {participants.size === 0 && (
                  <p className="text-xs text-destructive">
                    Select at least one participant
                  </p>
                )}
              </div>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={
                  !title.trim() ||
                  totalAmountPaisa <= 0 ||
                  participants.size === 0 ||
                  (splitPayment && !payerSumValid) ||
                  submitting
                }
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      )}
    </Dialog>
  );
}

/* ──────────────────────── Balances Tab ──────────────────────── */

interface BalanceEntry {
  userId: Id<"users">;
  balance: number;
  user: { _id: Id<"users">; name?: string; image?: string; isGhost?: boolean } | null;
}

function BalancesTab({
  balances,
  members,
  tripId,
}: {
  balances: BalanceEntry[] | undefined;
  members: TripMember[];
  tripId: Id<"trips">;
}) {
  if (balances === undefined) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (balances.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Scale className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No balances to show. Add expenses first.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {balances.map((balance) => {
          const member = members.find((m) => m.userId === balance.userId);
          const isPositive = balance.balance > 0;
          const isZero = balance.balance === 0;

          return (
            <Card key={balance.userId}>
              <CardContent className="flex items-center gap-3 p-4">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={member?.user?.image} />
                  <AvatarFallback className="text-xs">
                    {getInitials(balance.user?.name ?? "Unknown")}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {balance.user?.name ?? "Unknown"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isZero
                      ? "Settled up"
                      : isPositive
                        ? "is owed"
                        : "owes"}
                  </p>
                </div>
                <p
                  className={`shrink-0 text-sm font-semibold ${
                    isZero
                      ? "text-muted-foreground"
                      : isPositive
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {isZero ? "৳0" : formatBDT(Math.abs(balance.balance))}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Link to={`/trip/${tripId}/settle`}>
        <Button variant="outline" className="w-full gap-2">
          <Scale className="h-4 w-4" />
          View Settlements
        </Button>
      </Link>
    </div>
  );
}

/* ──────────────────────── Members Tab ──────────────────────── */

function MembersTab({
  members,
  tripId,
  isAdmin,
  currentUserId,
}: {
  members: TripMember[];
  tripId: Id<"trips">;
  isAdmin: boolean;
  currentUserId: Id<"users">;
}) {
  const { toast } = useToast();
  const inviteByUsername = useMutation(api.trips.inviteByUsername);
  const removeMember = useMutation(api.trips.removeMember);
  const createGhostUser = useMutation(api.users.createGhostUser);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviting, setInviting] = useState(false);

  const [ghostOpen, setGhostOpen] = useState(false);
  const [ghostName, setGhostName] = useState("");
  const [creatingGhost, setCreatingGhost] = useState(false);

  const [removingId, setRemovingId] = useState<Id<"users"> | null>(null);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteUsername.trim()) return;

    setInviting(true);
    try {
      await inviteByUsername({ tripId, username: inviteUsername.trim() });
      toast({ title: "Member invited", description: `@${inviteUsername.trim()} has been added.` });
      setInviteUsername("");
      setInviteOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to invite",
        variant: "destructive",
      });
    } finally {
      setInviting(false);
    }
  };

  const handleCreateGhost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ghostName.trim()) return;

    setCreatingGhost(true);
    try {
      await createGhostUser({ name: ghostName.trim(), tripId });
      toast({ title: "Ghost user added", description: `${ghostName.trim()} has been added to the trip.` });
      setGhostName("");
      setGhostOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create ghost user",
        variant: "destructive",
      });
    } finally {
      setCreatingGhost(false);
    }
  };

  const handleRemove = async (userId: Id<"users">) => {
    setRemovingId(userId);
    try {
      await removeMember({ tripId, userId });
      toast({ title: "Member removed" });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove member",
        variant: "destructive",
      });
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {members.map((member) => (
          <Card key={member._id}>
            <CardContent className="flex items-center gap-3 p-4">
              <Avatar className="h-9 w-9">
                <AvatarImage src={member.user?.image} />
                <AvatarFallback className="text-xs">
                  {getInitials(member.user?.name ?? "?")}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">
                    {member.user?.name ?? "Unknown"}
                  </p>
                  {member.role === "admin" && (
                    <Badge variant="secondary" className="text-[10px]">
                      Admin
                    </Badge>
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  @{member.user?.username ?? "unknown"}
                </p>
              </div>
              {isAdmin && member.userId !== currentUserId && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-destructive hover:text-destructive"
                  onClick={() => handleRemove(member.userId)}
                  disabled={removingId === member.userId}
                >
                  {removingId === member.userId ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserMinus className="h-4 w-4" />
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {isAdmin && (
        <div className="flex gap-2">
          {/* Invite by username */}
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex-1 gap-1" size="sm">
                <UserPlus className="h-4 w-4" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleInvite}>
                <DialogHeader>
                  <DialogTitle>Invite by Username</DialogTitle>
                  <DialogDescription>
                    Enter the username of the person you want to add.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      @
                    </span>
                    <Input
                      value={inviteUsername}
                      onChange={(e) => setInviteUsername(e.target.value)}
                      placeholder="username"
                      className="pl-8"
                      autoFocus
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={!inviteUsername.trim() || inviting}>
                    {inviting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Invite"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Add Ghost User */}
          <Dialog open={ghostOpen} onOpenChange={setGhostOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex-1 gap-1" size="sm">
                <Ghost className="h-4 w-4" />
                Add Ghost User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleCreateGhost}>
                <DialogHeader>
                  <DialogTitle>Add Ghost User</DialogTitle>
                  <DialogDescription>
                    Create a placeholder for someone who doesn't have an account
                    yet. They can claim it later.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-2">
                  <Label htmlFor="ghost-name">Name</Label>
                  <Input
                    id="ghost-name"
                    value={ghostName}
                    onChange={(e) => setGhostName(e.target.value)}
                    placeholder="e.g., Rahim"
                    autoFocus
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={!ghostName.trim() || creatingGhost}>
                    {creatingGhost ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Add Ghost User"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────── Loading Skeleton ──────────────────────── */

function TripPageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <Skeleton className="h-10 w-10 rounded" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <div className="px-4">
        <Skeleton className="mb-4 h-10 w-full rounded-lg" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
