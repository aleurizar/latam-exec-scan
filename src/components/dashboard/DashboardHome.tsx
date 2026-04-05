import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Globe, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

interface Stats {
  totalCompanies: number;
  totalExecutives: number;
  countries: number;
  industries: number;
}

const CHART_COLORS = [
  "hsl(214, 85%, 45%)",
  "hsl(200, 95%, 48%)",
  "hsl(150, 60%, 45%)",
  "hsl(35, 90%, 55%)",
  "hsl(340, 70%, 55%)",
  "hsl(270, 60%, 55%)",
  "hsl(180, 50%, 45%)",
  "hsl(50, 80%, 50%)",
];

export const DashboardHome = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [topCountries, setTopCountries] = useState<{ name: string; count: number }[]>([]);
  const [topIndustries, setTopIndustries] = useState<{ name: string; count: number }[]>([]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const [companiesRes, executivesRes] = await Promise.all([
      supabase.from("companies").select("country, industry"),
      supabase.from("executives").select("id", { count: "exact", head: true }),
    ]);

    const companies = companiesRes.data || [];
    const countries = [...new Set(companies.map((c) => c.country))];
    const industries = [...new Set(companies.map((c) => c.industry))];

    const countryMap: Record<string, number> = {};
    companies.forEach((c) => {
      countryMap[c.country] = (countryMap[c.country] || 0) + 1;
    });
    const sortedCountries = Object.entries(countryMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const industryMap: Record<string, number> = {};
    companies.forEach((c) => {
      industryMap[c.industry] = (industryMap[c.industry] || 0) + 1;
    });
    const sortedIndustries = Object.entries(industryMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    setStats({
      totalCompanies: companies.length,
      totalExecutives: executivesRes.count || 0,
      countries: countries.length,
      industries: industries.length,
    });
    setTopCountries(sortedCountries);
    setTopIndustries(sortedIndustries);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  const statCards = [
    { icon: Building2, label: "Empresas", value: stats?.totalCompanies || 0, color: "text-primary" },
    { icon: Users, label: "Ejecutivos", value: stats?.totalExecutives || 0, color: "text-accent" },
    { icon: Globe, label: "Países", value: stats?.countries || 0, color: "text-primary" },
    { icon: TrendingUp, label: "Industrias", value: stats?.industries || 0, color: "text-accent" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
        <p className="text-muted-foreground">Resumen de datos LATAM</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <stat.icon className={`w-8 h-8 ${stat.color}`} />
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Bar chart - Countries */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Empresas por País</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topCountries} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <YAxis
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                    formatter={(value: number) => [value, "Empresas"]}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {topCountries.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pie chart - Industries */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribución por Industria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={topIndustries}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={45}
                    paddingAngle={2}
                    label={({ name, percent }) =>
                      `${name.length > 12 ? name.slice(0, 12) + "…" : name} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={{ stroke: "hsl(var(--muted-foreground))" }}
                  >
                    {topIndustries.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                    formatter={(value: number) => [value, "Empresas"]}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
