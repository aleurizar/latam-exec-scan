import { useEffect, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FilterState } from "@/pages/Dashboard";
import { ExternalLink, ListPlus, Lock, GitCompare } from "lucide-react";
import { TablePagination } from "./TablePagination";
import { AddToListDialog } from "./AddToListDialog";
import { CompareCompaniesView } from "./CompareCompaniesView";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useOnboarding } from "@/hooks/useOnboarding";

interface CompaniesTableProps {
  filters: FilterState;
  onSelectCompany?: (id: string) => void;
}

interface Company {
  id: string;
  name: string;
  country: string;
  industry: string;
  size: string | null;
  revenue_usd: number | null;
  website: string | null;
}

export const CompaniesTable = ({ filters, onSelectCompany }: CompaniesTableProps) => {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showAddToList, setShowAddToList] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const { plan } = useUserPlan();
  const { markTask } = useOnboarding();
  const isBasic = plan === "basic";

  useEffect(() => { setPage(0); }, [filters]);

  const { data, isLoading } = useQuery({
    queryKey: ["companies", filters, page, pageSize],
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    queryFn: async () => {
      let query = supabase
        .from("companies")
        .select("*", { count: "estimated" })
        .order("name");
      if (filters.country.length > 0) query = query.in("country", filters.country);
      if (filters.industry.length > 0) query = query.in("industry", filters.industry);
      if (filters.size.length > 0) query = query.in("size", filters.size);
      if (filters.search) query = query.ilike("name", `%${filters.search}%`);
      const from = page * pageSize;
      const { data, error, count } = await query.range(from, from + pageSize - 1);
      if (error) throw error;
      return { rows: (data || []) as Company[], total: count || 0 };
    },
  });

  const companies = data?.rows ?? [];
  const totalCount = data?.total ?? 0;

  const formatRevenue = (revenue: number | null) => {
    if (!revenue) return "N/A";
    return `$${(revenue / 1000000).toFixed(1)}M`;
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === companies.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(companies.map(c => c.id)));
    }
  };

  if (isLoading && companies.length === 0) {
    return (
      <Card>
        <div className="p-6 space-y-4">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      </Card>
    );
  }

  return (
    <>
      {selected.size > 0 && (
        <div className="mb-3 flex items-center gap-3">
          <Badge variant="secondary">{selected.size} seleccionado(s)</Badge>
          <Button size="sm" variant="outline" onClick={() => setShowAddToList(true)}>
            <ListPlus className="w-4 h-4 mr-1" /> Agregar a lista
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={selected.size < 2 || selected.size > 3}
            onClick={() => { setShowCompare(true); markTask("compare"); }}
            title={
              selected.size < 2
                ? "Seleccioná al menos 2 empresas"
                : selected.size > 3
                ? "Máximo 3 empresas"
                : "Comparar"
            }
          >
            <GitCompare className="w-4 h-4 mr-1" /> Comparar
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Deseleccionar</Button>
        </div>
      )}

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={companies.length > 0 && selected.size === companies.length}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Website</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                    No companies found. Adjust your filters or add sample data.
                  </TableCell>
                </TableRow>
              ) : (
                companies.map((company) => (
                  <TableRow key={company.id} className="cursor-pointer" onClick={() => onSelectCompany?.(company.id)}>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selected.has(company.id)}
                        onCheckedChange={() => toggleSelect(company.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-primary hover:underline cursor-pointer">
                        {company.name}
                      </span>
                    </TableCell>
                    <TableCell><Badge variant="outline">{company.country}</Badge></TableCell>
                    <TableCell>{company.industry}</TableCell>
                    <TableCell>{company.size || "N/A"}</TableCell>
                    <TableCell>
                      {isBasic ? (
                        <span className="inline-flex items-center gap-1 text-muted-foreground blur-sm select-none">$XX.XM</span>
                      ) : formatRevenue(company.revenue_usd)}
                    </TableCell>
                    <TableCell>
                      {isBasic ? (
                        <span className="inline-flex items-center gap-1 text-muted-foreground text-sm">
                          <Lock className="w-3 h-3" /> <span className="blur-sm select-none">website.com</span>
                        </span>
                      ) : company.website ? (
                        <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          Visit <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : <span className="text-muted-foreground">N/A</span>}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <TablePagination page={page} pageSize={pageSize} totalCount={totalCount} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </Card>

      <AddToListDialog
        open={showAddToList}
        onOpenChange={setShowAddToList}
        selectedIds={Array.from(selected)}
        itemType="company"
        onDone={() => setSelected(new Set())}
      />

      <CompareCompaniesView
        open={showCompare}
        onOpenChange={setShowCompare}
        companyIds={Array.from(selected)}
      />
    </>
  );
};
