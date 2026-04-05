import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, ChevronLeft, Building2, Users } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface List {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  item_count?: number;
}

interface ListItem {
  id: string;
  item_type: string;
  item_id: string;
  item_name?: string;
  item_detail?: string;
}

interface ListsViewProps {
  onSelectItem?: (type: "company" | "executive", id: string) => void;
}

export const ListsView = ({ onSelectItem }: ListsViewProps) => {
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeList, setActiveList] = useState<List | null>(null);
  const [listItems, setListItems] = useState<ListItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => { fetchLists(); }, []);

  const fetchLists = async () => {
    setLoading(true);
    const { data } = await supabase.from("lists").select("*").order("created_at", { ascending: false });

    if (data) {
      // Get item counts
      const listsWithCounts = await Promise.all(
        data.map(async (list) => {
          const { count } = await supabase.from("list_items").select("id", { count: "exact", head: true }).eq("list_id", list.id);
          return { ...list, item_count: count || 0 };
        })
      );
      setLists(listsWithCounts);
    }
    setLoading(false);
  };

  const openList = async (list: List) => {
    setActiveList(list);
    setItemsLoading(true);

    const { data } = await supabase.from("list_items").select("*").eq("list_id", list.id);
    if (!data) { setItemsLoading(false); return; }

    // Resolve names
    const companyIds = data.filter(i => i.item_type === "company").map(i => i.item_id);
    const execIds = data.filter(i => i.item_type === "executive").map(i => i.item_id);

    const [companiesRes, execsRes] = await Promise.all([
      companyIds.length > 0
        ? supabase.from("companies").select("id, name, country").in("id", companyIds)
        : Promise.resolve({ data: [] }),
      execIds.length > 0
        ? supabase.from("executives").select("id, full_name, position").in("id", execIds)
        : Promise.resolve({ data: [] }),
    ]);

    const companyMap = Object.fromEntries((companiesRes.data || []).map(c => [c.id, c]));
    const execMap = Object.fromEntries((execsRes.data || []).map(e => [e.id, e]));

    const enriched: ListItem[] = data.map(item => {
      if (item.item_type === "company") {
        const c = companyMap[item.item_id];
        return { ...item, item_name: c?.name || "Desconocido", item_detail: c?.country };
      } else {
        const e = execMap[item.item_id];
        return { ...item, item_name: e?.full_name || "Desconocido", item_detail: e?.position };
      }
    });

    setListItems(enriched);
    setItemsLoading(false);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setCreating(false); return; }

    const { error } = await supabase.from("lists").insert({
      user_id: user.id,
      name: newName.trim(),
      description: newDesc.trim() || null,
    });

    setCreating(false);
    if (error) { toast.error("Error al crear lista"); return; }
    toast.success("Lista creada");
    setShowCreate(false);
    setNewName("");
    setNewDesc("");
    fetchLists();
  };

  const handleDeleteList = async (listId: string) => {
    const { error } = await supabase.from("lists").delete().eq("id", listId);
    if (error) { toast.error("Error al eliminar"); return; }
    toast.success("Lista eliminada");
    if (activeList?.id === listId) setActiveList(null);
    fetchLists();
  };

  const handleRemoveItem = async (itemId: string) => {
    const { error } = await supabase.from("list_items").delete().eq("id", itemId);
    if (error) { toast.error("Error al eliminar elemento"); return; }
    setListItems(prev => prev.filter(i => i.id !== itemId));
    toast.success("Elemento eliminado de la lista");
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
      </div>
    );
  }

  // Detail view of a list
  if (activeList) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setActiveList(null)}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-xl font-bold text-foreground">{activeList.name}</h2>
            {activeList.description && <p className="text-sm text-muted-foreground">{activeList.description}</p>}
          </div>
        </div>

        <Card>
          {itemsLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : listItems.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              Esta lista está vacía. Selecciona empresas o ejecutivos y agrégalos aquí.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Detalle</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        {item.item_type === "company"
                          ? <><Building2 className="w-3 h-3" /> Empresa</>
                          : <><Users className="w-3 h-3" /> Ejecutivo</>}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <button
                        className="text-primary hover:underline font-medium"
                        onClick={() => onSelectItem?.(item.item_type as "company" | "executive", item.item_id)}
                      >
                        {item.item_name}
                      </button>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{item.item_detail || "—"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemoveItem(item.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    );
  }

  // Lists overview
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Mis Listas</h2>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-1" /> Nueva lista
        </Button>
      </div>

      {lists.length === 0 ? (
        <Card>
          <div className="p-12 text-center text-muted-foreground">
            No tienes listas aún. Crea una para empezar a organizar tus datos.
          </div>
        </Card>
      ) : (
        <div className="grid gap-3">
          {lists.map((list) => (
            <Card key={list.id} className="cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all" onClick={() => openList(list)}>
              <CardContent className="py-4 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">{list.name}</h3>
                  {list.description && <p className="text-sm text-muted-foreground">{list.description}</p>}
                  <Badge variant="secondary" className="mt-1">{list.item_count} elementos</Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive shrink-0"
                  onClick={(e) => { e.stopPropagation(); handleDeleteList(list.id); }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva lista</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Nombre</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nombre de la lista" autoFocus />
            </div>
            <div>
              <Label>Descripción (opcional)</Label>
              <Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Descripción..." />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating || !newName.trim()}>
              {creating ? "Creando..." : "Crear"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
