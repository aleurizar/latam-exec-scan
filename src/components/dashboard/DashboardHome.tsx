import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Globe, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Stats {
  totalCompanies: number;
  totalExecutives: number;
  countries: number;
  industries: number;
}

export const DashboardHome = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [topCountries, setTopCountries] = useState<{ country: string; count: number }[]>([]);
  const [topIndustries, setTopIndustries] = useState<{ industry: string; count: number }[]>([]);

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

    // Count by country
    const countryMap: Record<string, number> = {};
    companies.forEach((c) => {
      countryMap[c.country] = (countryMap[c.country] || 0) + 1;
    });
    const sortedCountries = Object.entries(countryMap)
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Count by industry
    const industryMap: Record<string, number> = {};
    companies.forEach((c) => {
      industryMap[c.industry] = (industryMap[c.industry] || 0) + 1;
    });
    const sortedIndustries = Object.entries(industryMap)
      .map(([industry, count]) => ({ industry, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

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
      </div>
    );
  }

  const statCards = [
    { icon: Building2, label: "Empresas", value: stats?.totalCompanies || 0, color: "text-primary" },
    { icon: Users, label: "Ejecutivos", value: stats?.totalExecutives || 0, color: "text-accent" },
    { icon: Globe, label: "Países", value: stats?.countries || 0, color: "text-data-green" },
    { icon: TrendingUp, label: "Industrias", value: stats?.industries || 0, color: "text-data-orange" },
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
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Países</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topCountries.map((item) => (
                <div key={item.country} className="flex items-center justify-between">
                  <span className="text-sm text-foreground">{item.country}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${(item.count / (topCountries[0]?.count || 1)) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground w-6 text-right">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Industrias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topIndustries.map((item) => (
                <div key={item.industry} className="flex items-center justify-between">
                  <span className="text-sm text-foreground">{item.industry}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full"
                        style={{ width: `${(item.count / (topIndustries[0]?.count || 1)) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground w-6 text-right">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
