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
import { ExternalLink, ListPlus, Lock, Plus } from "lucide-react";
import { TablePagination } from "./TablePagination";
import { AddToListDialog } from "./AddToListDialog";
import { useEmailCredits } from "@/hooks/useEmailCredits";
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

const maskEmail = (email: string) => {
  const [local, domain] = email.split("@");
  if (!domain) return "***@***.com";
  return `${local[0]}***@${domain}`;
};

export const ExecutivesTable = ({ filters, onSelectExecutive }: ExecutivesTableProps) => {
  const { isRevealed, revealEmail, canRevealEmail } = useEmailCredits();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showAddToList, setShowAddToList] = useState(false);
  const [revealingId, setRevealingId] = useState<string | null>(null);
  const { plan } = useUserPlan();
  const isBasic = plan === "basic";

  useEffect(() => { setPage(0); }, [filters]);

  const { data, isLoading } = useQuery({
    queryKey: ["executives", filters, page, pageSize],
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    queryFn: async () => {
      let query = supabase
        .from("executives")
        .select("*, companies(name, industry)", { count: "estimated" })
        .order("full_name");
      if (filters.country.length > 0) query = query.in("country", filters.country);
      if (filters.search) {
        query = query.or(
          `full_name.ilike.%${filters.search}%,position.ilike.%${filters.search}%`
        );
      }
      const from = page * pageSize;
      const { data, error, count } = await query.range(from, from + pageSize - 1);
      if (error) throw error;
      return { rows: (data || []) as Executive[], total: count || 0 };
    },
  });

  const executives = data?.rows ?? [];
  const totalCount = data?.total ?? 0;

  const handleReveal = async (e: React.MouseEvent, execId: string) => {
    e.stopPropagation();
    setRevealingId(execId);
    await revealEmail(execId);
    setRevealingId(null);
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

  if (isLoading && executives.length === 0) {
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
                <TableHead>Nombre</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>País</TableHead>
                <TableHead>Seniority</TableHead>
                <TableHead>LinkedIn</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {executives.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                    No se encontraron ejecutivos. Ajusta los filtros o agrega datos.
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
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {exec.email ? (
                        isRevealed(exec.id) ? (
                          <a href={`mailto:${exec.email}`} className="text-primary hover:underline text-sm">
                            {exec.email}
                          </a>
                        ) : (
                          <span className="text-muted-foreground inline-flex items-center gap-1 text-sm">
                            {maskEmail(exec.email)}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              disabled={revealingId === exec.id || !canRevealEmail}
                              onClick={(e) => handleReveal(e, exec.id)}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </span>
                        )
                      ) : (
                        <span className="text-muted-foreground text-sm">N/A</span>
                      )}
                    </TableCell>
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
                      {isBasic ? (
                        <span className="inline-flex items-center gap-1 text-muted-foreground text-sm">
                          <Lock className="w-3 h-3" /> <span className="blur-sm select-none">Profile</span>
                        </span>
                      ) : exec.linkedin_url ? (
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
