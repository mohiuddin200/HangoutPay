import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { formatBDT } from "@/lib/utils";
import {
  Plus,
  Users,
  Calendar,
  ChevronRight,
  Loader2,
  TrendingDown,
  TrendingUp,
  Map,
} from "lucide-react";

export function DashboardPage() {
  const { toast } = useToast();
  const trips = useQuery(api.trips.list);
  const summary = useQuery(api.balances.getUserSummary);
  const createTrip = useMutation(api.trips.create);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [tripName, setTripName] = useState("");
  const [tripDescription, setTripDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tripName.trim()) return;

    setCreating(true);
    try {
      await createTrip({
        name: tripName.trim(),
        description: tripDescription.trim() || undefined,
      });
      toast({ title: "Trip created", description: `"${tripName.trim()}" is ready to go!` });
      setTripName("");
      setTripDescription("");
      setDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create trip",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const isLoading = trips === undefined;

  return (
    <div className="space-y-8 px-4 py-6">
      {/* Balance Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl bg-red-500 p-4 shadow-md dark:bg-red-600">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-red-100">
            <TrendingDown className="h-4 w-4" />
            You Owe
          </div>
          {summary === undefined ? (
            <Skeleton className="mt-3 h-8 w-24 bg-red-400/40" />
          ) : (
            <p className="mt-2 break-all text-2xl font-bold text-white">
              {formatBDT(summary.totalOwed)}
            </p>
          )}
        </div>
        <div className="rounded-2xl bg-emerald-500 p-4 shadow-md dark:bg-emerald-600">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-100">
            <TrendingUp className="h-4 w-4" />
            You're Owed
          </div>
          {summary === undefined ? (
            <Skeleton className="mt-3 h-8 w-24 bg-emerald-400/40" />
          ) : (
            <p className="mt-2 break-all text-2xl font-bold text-white">
              {formatBDT(summary.totalReceivable)}
            </p>
          )}
        </div>
      </div>

      {/* Header + Create */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your Trips</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5 rounded-full px-4">
              <Plus className="h-4 w-4" />
              New Trip
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreateTrip}>
              <DialogHeader>
                <DialogTitle>Create a Trip</DialogTitle>
                <DialogDescription>
                  Start a new trip to split expenses with your group.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="trip-name">Trip Name</Label>
                  <Input
                    id="trip-name"
                    placeholder="e.g., Cox's Bazar Weekend"
                    value={tripName}
                    onChange={(e) => setTripName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trip-desc">Description (optional)</Label>
                  <Input
                    id="trip-desc"
                    placeholder="e.g., Beach trip with college friends"
                    value={tripDescription}
                    onChange={(e) => setTripDescription(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={!tripName.trim() || creating}>
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Trip"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Trip List */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border p-5">
              <div className="flex items-center justify-between">
                <div className="space-y-2.5">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-28" />
                </div>
                <Skeleton className="h-5 w-5 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : trips.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Map className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="mb-1 text-lg font-semibold">No trips yet</p>
          <p className="mb-5 max-w-xs text-sm text-muted-foreground">
            Create your first trip to start splitting expenses with friends.
          </p>
          <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-1.5 rounded-full px-4">
            <Plus className="h-4 w-4" />
            Create Your First Trip
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {trips.map((trip) => (
            <Link key={trip._id} to={`/trip/${trip._id}`} className="group block">
              <div className="flex items-center justify-between rounded-2xl border bg-card p-5 transition-all hover:border-foreground/20 hover:shadow-sm">
                <div className="min-w-0 space-y-1.5">
                  <p className="truncate text-base font-semibold">{trip.name}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {trip.memberCount} {trip.memberCount === 1 ? "member" : "members"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(trip.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
