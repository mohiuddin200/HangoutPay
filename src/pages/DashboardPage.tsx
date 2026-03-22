import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
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
    <div className="space-y-6 px-4 py-6">
      {/* Balance Summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">You owe</p>
              {summary === undefined ? (
                <Skeleton className="mt-1 h-5 w-16" />
              ) : (
                <p className="truncate text-lg font-semibold text-red-600 dark:text-red-400">
                  {formatBDT(summary.totalOwed)}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">You are owed</p>
              {summary === undefined ? (
                <Skeleton className="mt-1 h-5 w-16" />
              ) : (
                <p className="truncate text-lg font-semibold text-green-600 dark:text-green-400">
                  {formatBDT(summary.totalReceivable)}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header + Create */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your Trips</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              Create Trip
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
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-5 w-5 rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : trips.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Map className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle className="mb-2 text-lg">No trips yet</CardTitle>
            <CardDescription className="mb-4 max-w-xs">
              Create your first trip to start splitting expenses with friends.
            </CardDescription>
            <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-1">
              <Plus className="h-4 w-4" />
              Create Your First Trip
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {trips.map((trip) => (
            <Link key={trip._id} to={`/trip/${trip._id}`}>
              <Card className="transition-colors hover:bg-accent/50">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="min-w-0 space-y-1">
                    <p className="truncate font-medium">{trip.name}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {trip.memberCount} {trip.memberCount === 1 ? "member" : "members"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(trip.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
