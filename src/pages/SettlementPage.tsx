import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { formatBDT, toPaisa, toBDT } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Scale,
  Calendar,
  Banknote,
} from "lucide-react";

interface PaymentDialogState {
  from: Id<"users">;
  to: Id<"users">;
  fromName: string;
  toName: string;
  amount: number;
}

export function SettlementPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const { toast } = useToast();

  const trip = useQuery(
    api.trips.get,
    tripId ? { tripId: tripId as Id<"trips"> } : "skip"
  );
  const optimized = useQuery(
    api.balances.getOptimizedSettlements,
    tripId ? { tripId: tripId as Id<"trips"> } : "skip"
  );
  const pastSettlements = useQuery(
    api.settlements.listByTrip,
    tripId ? { tripId: tripId as Id<"trips"> } : "skip"
  );
  const createSettlement = useMutation(api.settlements.create);

  const [paymentDialog, setPaymentDialog] = useState<PaymentDialogState | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [recording, setRecording] = useState(false);

  const openPaymentDialog = (tx: { from: Id<"users">; to: Id<"users">; amount: number; fromUser: { name?: string } | null; toUser: { name?: string } | null }) => {
    setPaymentDialog({
      from: tx.from,
      to: tx.to,
      fromName: tx.fromUser?.name ?? "Unknown",
      toName: tx.toUser?.name ?? "Unknown",
      amount: tx.amount,
    });
    setPaymentAmount(toBDT(tx.amount).toString());
  };

  const handleRecordPayment = async () => {
    if (!paymentDialog || !tripId) return;

    const amountPaisa = toPaisa(parseFloat(paymentAmount) || 0);
    if (amountPaisa <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount.",
        variant: "destructive",
      });
      return;
    }

    setRecording(true);
    try {
      await createSettlement({
        tripId: tripId as Id<"trips">,
        fromUserId: paymentDialog.from,
        toUserId: paymentDialog.to,
        amount: amountPaisa,
      });
      toast({
        title: "Payment recorded",
        description: `${paymentDialog.fromName} paid ${formatBDT(amountPaisa)} to ${paymentDialog.toName}`,
      });
      setPaymentDialog(null);
      setPaymentAmount("");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to record payment",
        variant: "destructive",
      });
    } finally {
      setRecording(false);
    }
  };

  const isLoading =
    trip === undefined || optimized === undefined || pastSettlements === undefined;

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link to={tripId ? `/trip/${tripId}` : "/"}>
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold">Settlements</h1>
            {trip && (
              <p className="truncate text-xs text-muted-foreground">
                {trip.name}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6 px-4 py-6">
        {/* Optimized Settlements */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold">Suggested Payments</h2>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          ) : optimized && optimized.length > 0 ? (
            <div className="space-y-3">
              {optimized.map((tx, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="truncate font-medium text-red-600">
                            {tx.fromUser?.name ?? "Unknown"}
                          </span>
                          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="truncate font-medium text-green-600">
                            {tx.toUser?.name ?? "Unknown"}
                          </span>
                        </div>
                        <p className="mt-1 text-lg font-bold">
                          {formatBDT(tx.amount)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 gap-1"
                        onClick={() => openPaymentDialog(tx)}
                      >
                        <Banknote className="h-4 w-4" />
                        Record
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                <CheckCircle2 className="mb-3 h-12 w-12 text-green-500" />
                <CardTitle className="mb-1 text-base">All settled up!</CardTitle>
                <CardDescription>
                  No outstanding payments in this trip.
                </CardDescription>
              </CardContent>
            </Card>
          )}
        </section>

        <Separator />

        {/* Past Settlements */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold">Payment History</h2>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : pastSettlements && pastSettlements.length > 0 ? (
            <div className="space-y-2">
              {pastSettlements.map((settlement) => (
                <Card key={settlement._id}>
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="truncate font-medium">
                          {settlement.fromUser?.name ?? "Unknown"}
                        </span>
                        <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                        <span className="truncate font-medium">
                          {settlement.toUser?.name ?? "Unknown"}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {new Date(settlement.createdAt).toLocaleDateString(
                          "en-GB",
                          {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </p>
                    </div>
                    <Badge variant="secondary" className="shrink-0 font-semibold">
                      {formatBDT(settlement.amount)}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No payments recorded yet.
                </p>
              </CardContent>
            </Card>
          )}
        </section>
      </div>

      {/* Record Payment Dialog */}
      <Dialog
        open={paymentDialog !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPaymentDialog(null);
            setPaymentAmount("");
          }
        }}
      >
        {paymentDialog && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
              <DialogDescription>
                {paymentDialog.fromName} pays {paymentDialog.toName}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between rounded-lg bg-muted p-3">
                <span className="text-sm text-muted-foreground">
                  Suggested amount
                </span>
                <span className="font-semibold">
                  {formatBDT(paymentDialog.amount)}
                </span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-amount">Amount (BDT)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    ৳
                  </span>
                  <Input
                    id="payment-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="pl-7"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  You can record a partial payment.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={handleRecordPayment}
                disabled={
                  !paymentAmount ||
                  parseFloat(paymentAmount) <= 0 ||
                  recording
                }
              >
                {recording ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Recording...
                  </>
                ) : (
                  "Record Payment"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
