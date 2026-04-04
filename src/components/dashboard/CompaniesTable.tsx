import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FilterState } from "@/pages/Dashboard";
import { ExternalLink } from "lucide-react";

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
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompanies();
  }, [filters]);

  const fetchCompanies = async () => {
    setLoading(true);
    let query = supabase.from("companies").select("*").order("name");

    if (filters.country.length > 0) query = query.in("country", filters.country);
    if (filters.industry.length > 0) query = query.in("industry", filters.industry);
    if (filters.size.length > 0) query = query.in("size", filters.size);
    if (filters.search) query = query.ilike("name", `%${filters.search}%`);

    const { data, error } = await query.limit(100);
    if (!error) setCompanies(data || []);
    setLoading(false);
  };

  const formatRevenue = (revenue: number | null) => {
    if (!revenue) return "N/A";
    return `$${(revenue / 1000000).toFixed(1)}M`;
  };

  if (loading) {
    return (
      <Card>
        <div className="p-6 space-y-4">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
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
                <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                  No companies found. Adjust your filters or add sample data.
                </TableCell>
              </TableRow>
            ) : (
              companies.map((company) => (
                <TableRow key={company.id} className="cursor-pointer" onClick={() => onSelectCompany?.(company.id)}>
                  <TableCell>
                    <span className="font-medium text-primary hover:underline cursor-pointer">
                      {company.name}
                    </span>
                  </TableCell>
                  <TableCell><Badge variant="outline">{company.country}</Badge></TableCell>
                  <TableCell>{company.industry}</TableCell>
                  <TableCell>{company.size || "N/A"}</TableCell>
                  <TableCell>{formatRevenue(company.revenue_usd)}</TableCell>
                  <TableCell>
                    {company.website ? (
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
    </Card>
  );
};
