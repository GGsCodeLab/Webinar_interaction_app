"use client";

import { useEffect, useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

type User = { id: number; name: string; createdAt: string; highScore: number; quizScore: number };

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);

  async function load() {
    const res = await fetch("/api/users");
    setUsers(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(user: User) {
    if (!confirm(`Remove "${user.name}" from the session? They will need to re-register.`)) return;
    setDeleting(user.id);
    const res = await fetch(`/api/attendees/${user.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success(`${user.name} removed`);
      load();
    } else {
      toast.error("Failed to delete user");
    }
    setDeleting(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Registered Users</h1>
        <p className="text-sm text-muted-foreground">{users.length} attendee{users.length !== 1 ? "s" : ""} registered</p>
      </div>

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">S.No</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="w-40 text-center">Registered On</TableHead>
              <TableHead className="w-28 text-center">Quiz Score</TableHead>
              <TableHead className="w-32 text-center">Dino High Score</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">Loading…</TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-16 text-center">
                  <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                  <p className="text-muted-foreground">No users registered yet.</p>
                </TableCell>
              </TableRow>
            ) : (
              users.map((user, idx) => (
                <TableRow key={user.id} className="group">
                  <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell className="text-center text-sm text-muted-foreground">
                    {formatDate(user.createdAt)}
                  </TableCell>
                  <TableCell className="text-center">
                    {(user.quizScore ?? 0) > 0 ? (
                      <Badge variant="secondary">{user.quizScore} correct</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {user.highScore > 0 ? (
                      <Badge variant="secondary">{user.highScore.toLocaleString()}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      disabled={deleting === user.id}
                      onClick={() => handleDelete(user)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <Toaster />
    </div>
  );
}
