import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FilterState } from "@/pages/Dashboard";
import { ExternalLink, ListPlus, Lock } from "lucide-react";
import { TablePagination } from "./TablePagination";
import { AddToListDialog } from "./AddToListDialog";
import { useUserPlan } from "@/hooks/useUserPlan";

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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showAddToList, setShowAddToList] = useState(false);

  useEffect(() => { setPage(0); }, [filters]);
  useEffect(() => { fetchExecutives(); }, [filters, page, pageSize]);

  const fetchExecutives = async () => {
    setLoading(true);
    let query = supabase.from("executives").select("*, companies(name, industry)", { count: "exact" }).order("full_name");
    if (filters.country.length > 0) query = query.in("country", filters.country);
    if (filters.search) query = query.or(`full_name.ilike.%${filters.search}%,position.ilike.%${filters.search}%`);
    const from = page * pageSize;
    const { data, error, count } = await query.range(from, from + pageSize - 1);
    if (!error) {
      setExecutives(data || []);
      setTotalCount(count || 0);
    }
    setLoading(false);
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === executives.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(executives.map(e => e.id)));
    }
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
    <>
      {selected.size > 0 && (
        <div className="mb-3 flex items-center gap-3">
          <Badge variant="secondary">{selected.size} seleccionado(s)</Badge>
          <Button size="sm" variant="outline" onClick={() => setShowAddToList(true)}>
            <ListPlus className="w-4 h-4 mr-1" /> Agregar a lista
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
                    checked={executives.length > 0 && selected.size === executives.length}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
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
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                    No executives found. Adjust your filters or add sample data.
                  </TableCell>
                </TableRow>
              ) : (
                executives.map((exec) => (
                  <TableRow key={exec.id} className="cursor-pointer" onClick={() => onSelectExecutive?.(exec.id)}>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selected.has(exec.id)}
                        onCheckedChange={() => toggleSelect(exec.id)}
                      />
                    </TableCell>
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
        <TablePagination page={page} pageSize={pageSize} totalCount={totalCount} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </Card>

      <AddToListDialog
        open={showAddToList}
        onOpenChange={setShowAddToList}
        selectedIds={Array.from(selected)}
        itemType="executive"
        onDone={() => setSelected(new Set())}
      />
    </>
  );
};
