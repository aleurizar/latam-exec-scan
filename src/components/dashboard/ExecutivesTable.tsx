import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FilterState } from "@/pages/Dashboard";
import { ExternalLink } from "lucide-react";
import { TablePagination } from "./TablePagination";

interface ExecutivesTableProps {
  filters: FilterState;
  onSelectExecutive?: (id: string) => void;
}

interface Executive {
  id: string;
  full_name: string;
  position: string;
  seniority: string | null;
  email: string | null;
  linkedin_url: string | null;
  country: string;
  technologies: string[] | null;
  companies: { name: string; industry: string } | null;
}

export const ExecutivesTable = ({ filters, onSelectExecutive }: ExecutivesTableProps) => {
  const [executives, setExecutives] = useState<Executive[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [filters]);

  useEffect(() => {
    fetchExecutives();
  }, [filters, page, pageSize]);

  const fetchExecutives = async () => {
    setLoading(true);
    let query = supabase.from("executives").select("*, companies(name, industry)", { count: "exact" }).order("full_name");

    if (filters.country.length > 0) query = query.in("country", filters.country);
    if (filters.search) query = query.or(`full_name.ilike.%${filters.search}%,position.ilike.%${filters.search}%`);

    const from = page * pageSize;
    const to = from + pageSize - 1;
    const { data, error, count } = await query.range(from, to);

    if (!error) {
      setExecutives(data || []);
      setTotalCount(count || 0);
    }
    setLoading(false);
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
              <TableHead>Name</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Seniority</TableHead>
              <TableHead>LinkedIn</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {executives.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                  No executives found. Adjust your filters or add sample data.
                </TableCell>
              </TableRow>
            ) : (
              executives.map((exec) => (
                <TableRow key={exec.id} className="cursor-pointer" onClick={() => onSelectExecutive?.(exec.id)}>
                  <TableCell>
                    <span className="font-medium text-primary hover:underline cursor-pointer">
                      {exec.full_name}
                    </span>
                  </TableCell>
                  <TableCell>{exec.position}</TableCell>
                  <TableCell>
                    {exec.companies ? (
                      <div>
                        <div className="font-medium">{exec.companies.name}</div>
                        <div className="text-sm text-muted-foreground">{exec.companies.industry}</div>
                      </div>
                    ) : "N/A"}
                  </TableCell>
                  <TableCell><Badge variant="outline">{exec.country}</Badge></TableCell>
                  <TableCell>{exec.seniority || "N/A"}</TableCell>
                  <TableCell>
                    {exec.linkedin_url ? (
                      <a href={exec.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        Profile <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : <span className="text-muted-foreground">N/A</span>}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <TablePagination
        page={page}
        pageSize={pageSize}
        totalCount={totalCount}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </Card>
  );
};
