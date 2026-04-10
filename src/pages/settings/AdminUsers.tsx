import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Users } from "lucide-react";

interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  plan: string;
  credits_used: number;
}

export const AdminUsers = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      // Fetch all profiles (admin can see via RLS or we use the visible ones)
      // Since profiles RLS only allows own profile, we need a workaround
      // Admin sees their own profile + we use the get_used_credits function
      // For MVP, admin can see all profiles via a security definer approach
      // But current RLS restricts to own profile. Let's fetch what we can.
      
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, full_name, plan");

      if (profiles) {
        const usersWithCredits = await Promise.all(
          profiles.map(async (p) => {
            const { data } = await supabase.rpc("get_used_credits", { _user_id: p.id });
            return {
              ...p,
              credits_used: (data as number) || 0,
            };
          })
        );
        setUsers(usersWithCredits);
      }
      setLoading(false);
    };
    fetchUsers();
  }, []);

  const planLimits: Record<string, number> = { basic: 100, silver: 1000, gold: 2000 };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Usuarios ({users.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Créditos usados</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.full_name || "Sin nombre"}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  <Badge variant={u.plan === "gold" ? "default" : "secondary"}>
                    {u.plan}
                  </Badge>
                </TableCell>
                <TableCell>
                  {u.credits_used} / {planLimits[u.plan] || 100}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
