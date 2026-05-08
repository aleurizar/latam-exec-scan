import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Globe, Users, DollarSign, Briefcase, ExternalLink } from "lucide-react";
import { useUserPlan } from "@/hooks/useUserPlan";

interface CompareCompaniesViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyIds: string[];
}

interface CompanyDetail {
  id: string;
  name: string;
  country: string;
  industry: string;
  size: string | null;
  revenue_usd: number | null;
  website: string | null;
  description: string | null;
  exec_count: number;
}

const formatRevenue = (n: number | null) =>
  n ? `$${(n / 1_000_000).toFixed(1)}M` : "N/A";

export const CompareCompaniesView = ({ open, onOpenChange, companyIds }: CompareCompaniesViewProps) => {
  const { plan } = useUserPlan();
  const isBasic = plan === "basic";

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["compare-companies", companyIds],
    enabled: open && companyIds.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const { data: comps, error } = await supabase
        .from("companies")
        .select("*")
        .in("id", companyIds);
      if (error) throw error;

      // Fetch exec counts per company
      const counts = await Promise.all(
        (comps || []).map(async (c) => {
          const { count } = await supabase
            .from("executives")
            .select("id", { count: "estimated", head: true })
            .eq("company_id", c.id);
          return { id: c.id, count: count || 0 };
        })
      );
      const countMap = new Map(counts.map((x) => [x.id, x.count]));

      return (comps || []).map((c) => ({
        ...c,
        exec_count: countMap.get(c.id) || 0,
      })) as CompanyDetail[];
    },
  });

  const rows: { label: string; icon: any; render: (c: CompanyDetail) => React.ReactNode }[] = [
    { label: "País", icon: Globe, render: (c) => <Badge variant="outline">{c.country}</Badge> },
    { label: "Industria", icon: Briefcase, render: (c) => c.industry },
    { label: "Tamaño", icon: Users, render: (c) => c.size || <span className="text-muted-foreground">N/A</span> },
    {
      label: "Revenue",
      icon: DollarSign,
      render: (c) =>
        isBasic ? (
          <span className="text-muted-foreground blur-sm select-none">$XX.XM</span>
        ) : (
          formatRevenue(c.revenue_usd)
        ),
    },
    { label: "Ejecutivos", icon: Users, render: (c) => <span className="font-semibold">{c.exec_count}</span> },
    {
      label: "Website",
      icon: Globe,
      render: (c) =>
        isBasic ? (
          <span className="text-muted-foreground text-sm blur-sm select-none">website.com</span>
        ) : c.website ? (
          <a
            href={c.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-1 text-sm"
          >
            Visitar <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <span className="text-muted-foreground">N/A</span>
        ),
    },
    {
      label: "Descripción",
      icon: Building2,
      render: (c) =>
        c.description ? (
          <p className="text-xs text-muted-foreground line-clamp-4">{c.description}</p>
        ) : (
          <span className="text-muted-foreground text-xs">Sin descripción</span>
        ),
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Comparar empresas</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-80" />
            ))}
          </div>
        ) : (
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: `120px repeat(${companies.length}, minmax(0, 1fr))` }}
          >
            {/* Header row */}
            <div />
            {companies.map((c) => (
              <div key={c.id} className="border-b pb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-bold text-foreground leading-tight">{c.name}</h3>
              </div>
            ))}

            {/* Comparison rows */}
            {rows.map((row) => (
              <>
                <div
                  key={`label-${row.label}`}
                  className="flex items-center gap-2 text-sm font-medium text-muted-foreground py-3 border-b"
                >
                  <row.icon className="w-4 h-4" />
                  {row.label}
                </div>
                {companies.map((c) => (
                  <div
                    key={`${row.label}-${c.id}`}
                    className="text-sm text-foreground py-3 border-b"
                  >
                    {row.render(c)}
                  </div>
                ))}
              </>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
