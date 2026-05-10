import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Users, Mail, FileDown, ListPlus, TrendingUp, Activity } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, PieChart, Pie, Cell, Legend } from "recharts";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { KpiCard } from "@/components/admin/analytics/KpiCard";
import { DateRangeControl } from "@/components/admin/analytics/DateRangeControl";
import {
  useAnalyticsSummary,
  useAnalyticsTimeseries,
  useAnalyticsTopUsers,
  DateRange,
} from "@/hooks/useAdminAnalytics";
import { downloadCsv } from "@/lib/analyticsCsv";
import { toast } from "sonner";

const PLAN_COLORS: Record<string, string> = {
  basic: "hsl(var(--muted-foreground))",
  silver: "hsl(var(--primary))",
  gold: "hsl(var(--accent-foreground, var(--primary)))",
};

const AdminAnalytics = () => {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [allowed, setAllowed] = useState(false);

  const [range, setRange] = useState<DateRange>(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    return { from, to };
  });
  const [compare, setCompare] = useState(true);

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      const isAdmin = roles?.some((r) => r.role === "admin") ?? false;
      if (!isAdmin) {
        toast.error("Solo admins pueden ver Analytics");
        navigate("/dashboard");
        return;
      }
      setAllowed(true);
      setAuthChecked(true);
    };
    check();
  }, [navigate]);

  const summaryQ = useAnalyticsSummary(range, compare);
  const timeseriesQ = useAnalyticsTimeseries(range);
  const topUsersQ = useAnalyticsTopUsers(range, 10);

  const sum = summaryQ.data?.current;
  const prev = summaryQ.data?.previous;

  const planDistData = useMemo(() => {
    if (!sum?.plan_distribution) return [];
    return Object.entries(sum.plan_distribution).map(([name, value]) => ({ name, value: Number(value) }));
  }, [sum]);

  const revealsByPlanData = useMemo(() => {
    if (!sum?.reveals_by_plan) return [];
    return Object.entries(sum.reveals_by_plan).map(([name, value]) => ({ name, value: Number(value) }));
  }, [sum]);

  const tsData = useMemo(() => {
    return (timeseriesQ.data ?? []).map((r) => ({
      ...r,
      label: format(new Date(r.day), "dd MMM", { locale: es }),
    }));
  }, [timeseriesQ.data]);

  const handleExport = () => {
    if (!sum) return;
    const rows = [
      { metric: "DAU", current: sum.dau, previous: prev?.dau ?? "" },
      { metric: "WAU", current: sum.wau, previous: prev?.wau ?? "" },
      { metric: "MAU", current: sum.mau, previous: prev?.mau ?? "" },
      { metric: "Revelados", current: sum.reveals, previous: prev?.reveals ?? "" },
      { metric: "Exports", current: sum.exports, previous: prev?.exports ?? "" },
      { metric: "Registros exportados", current: sum.records_exported, previous: prev?.records_exported ?? "" },
      { metric: "Listas creadas", current: sum.lists_created, previous: prev?.lists_created ?? "" },
      { metric: "Signups", current: sum.signups, previous: prev?.signups ?? "" },
      { metric: "Upgrades", current: sum.upgrades, previous: prev?.upgrades ?? "" },
      { metric: "Logins", current: sum.logins, previous: prev?.logins ?? "" },
      { metric: "Búsquedas", current: sum.searches, previous: prev?.searches ?? "" },
    ];
    downloadCsv(`analytics_${format(range.from, "yyyyMMdd")}_${format(range.to, "yyyyMMdd")}.csv`, rows);
  };

  if (!authChecked || !allowed) {
    return <div className="min-h-screen bg-background p-8"><Skeleton className="h-8 w-48 mb-4" /><Skeleton className="h-64 w-full" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-4 flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate("/dashboard")} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </Button>
        <h1 className="text-lg font-bold text-foreground">Admin Analytics</h1>
        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
            <Download className="w-4 h-4" />
            Exportar CSV
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <Card>
          <CardContent className="p-4">
            <DateRangeControl range={range} onChange={setRange} compare={compare} onCompareChange={setCompare} />
          </CardContent>
        </Card>

        {/* KPIs */}
        {summaryQ.isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
        ) : sum ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiCard label="DAU" value={sum.dau} icon={Activity} current={sum.dau} previous={prev?.dau} />
            <KpiCard label="MAU" value={sum.mau} icon={Users} current={sum.mau} previous={prev?.mau} />
            <KpiCard label="Revelados" value={sum.reveals} icon={Mail} current={sum.reveals} previous={prev?.reveals} />
            <KpiCard label="Exports" value={sum.exports} icon={FileDown} current={sum.exports} previous={prev?.exports} />
            <KpiCard label="Upgrades" value={sum.upgrades} icon={TrendingUp} current={sum.upgrades} previous={prev?.upgrades} />
            <KpiCard label="Listas" value={sum.lists_created} icon={ListPlus} current={sum.lists_created} previous={prev?.lists_created} />
          </div>
        ) : null}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Actividad diaria</CardTitle></CardHeader>
            <CardContent>
              {timeseriesQ.isLoading ? <Skeleton className="h-72 w-full" /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={tsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                    <Legend />
                    <Line type="monotone" dataKey="reveals" stroke="hsl(var(--primary))" strokeWidth={2} name="Revelados" dot={false} />
                    <Line type="monotone" dataKey="exports" stroke="hsl(var(--destructive))" strokeWidth={2} name="Exports" dot={false} />
                    <Line type="monotone" dataKey="logins" stroke="hsl(var(--muted-foreground))" strokeWidth={2} name="Logins" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Nuevos signups</CardTitle></CardHeader>
            <CardContent>
              {timeseriesQ.isLoading ? <Skeleton className="h-72 w-full" /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={tsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                    <Line type="monotone" dataKey="signups" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Usuarios por plan</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={planDistData} dataKey="value" nameKey="name" outerRadius={90} label>
                    {planDistData.map((entry, i) => (
                      <Cell key={i} fill={PLAN_COLORS[entry.name] ?? "hsl(var(--primary))"} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Revelados por plan</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={revealsByPlanData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Detail tabs */}
        <Card>
          <CardHeader><CardTitle className="text-base">Detalle</CardTitle></CardHeader>
          <CardContent>
            <Tabs defaultValue="top-users">
              <TabsList>
                <TabsTrigger value="top-users">Top usuarios</TabsTrigger>
                <TabsTrigger value="metrics">Métricas</TabsTrigger>
              </TabsList>

              <TabsContent value="top-users" className="mt-4">
                {topUsersQ.isLoading ? <Skeleton className="h-48 w-full" /> : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuario</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead className="text-right">Revelados</TableHead>
                        <TableHead className="text-right">Exports</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(topUsersQ.data ?? []).map((u) => (
                        <TableRow key={u.user_id}>
                          <TableCell className="font-medium">{u.full_name ?? "—"}</TableCell>
                          <TableCell>{u.email}</TableCell>
                          <TableCell><Badge variant="secondary">{u.plan}</Badge></TableCell>
                          <TableCell className="text-right tabular-nums">{u.reveals}</TableCell>
                          <TableCell className="text-right tabular-nums">{u.exports}</TableCell>
                        </TableRow>
                      ))}
                      {!topUsersQ.data?.length && (
                        <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Sin datos en el período seleccionado.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              <TabsContent value="metrics" className="mt-4">
                {sum && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Métrica</TableHead>
                        <TableHead className="text-right">Período actual</TableHead>
                        <TableHead className="text-right">Período previo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[
                        ["DAU", sum.dau, prev?.dau],
                        ["WAU", sum.wau, prev?.wau],
                        ["MAU", sum.mau, prev?.mau],
                        ["Revelados", sum.reveals, prev?.reveals],
                        ["Exports", sum.exports, prev?.exports],
                        ["Registros exportados", sum.records_exported, prev?.records_exported],
                        ["Listas creadas", sum.lists_created, prev?.lists_created],
                        ["Signups", sum.signups, prev?.signups],
                        ["Upgrades", sum.upgrades, prev?.upgrades],
                        ["Logins", sum.logins, prev?.logins],
                        ["Búsquedas", sum.searches, prev?.searches],
                      ].map(([label, c, p]) => (
                        <TableRow key={label as string}>
                          <TableCell className="font-medium">{label}</TableCell>
                          <TableCell className="text-right tabular-nums">{c as number}</TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">{p ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminAnalytics;
