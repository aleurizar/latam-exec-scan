import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { useOnboarding } from "@/hooks/useOnboarding";

interface AddToListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  itemType: "company" | "executive";
  onDone?: () => void;
}

interface ListOption {
  id: string;
  name: string;
}

export const AddToListDialog = ({ open, onOpenChange, selectedIds, itemType, onDone }: AddToListDialogProps) => {
  const { markTask } = useOnboarding();
  const [lists, setLists] = useState<ListOption[]>([]);
  const [selectedList, setSelectedList] = useState<string>("");
  const [newListName, setNewListName] = useState("");
  const [creatingNew, setCreatingNew] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) fetchLists();
  }, [open]);

  const fetchLists = async () => {
    const { data } = await supabase.from("lists").select("id, name").order("name");
    setLists(data || []);
    setSelectedList("");
    setNewListName("");
    setCreatingNew(false);
  };

  const handleAdd = async () => {
    if (selectedIds.length === 0) return;
    setLoading(true);

    let listId = selectedList;

    if (creatingNew && newListName.trim()) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data, error } = await supabase
        .from("lists")
        .insert({ user_id: user.id, name: newListName.trim() })
        .select("id")
        .single();

      if (error || !data) {
        toast.error("Error al crear la lista");
        setLoading(false);
        return;
      }
      listId = data.id;
    }

    if (!listId) {
      toast.error("Selecciona o crea una lista");
      setLoading(false);
      return;
    }

    const items = selectedIds.map((item_id) => ({
      list_id: listId,
      item_type: itemType,
      item_id,
    }));

    const { error } = await supabase.from("list_items").upsert(items, {
      onConflict: "list_id,item_type,item_id",
    });

    setLoading(false);

    if (error) {
      toast.error("Error al agregar elementos");
      return;
    }

    toast.success(`${selectedIds.length} elemento(s) agregado(s) a la lista`);
    markTask("list");
    onOpenChange(false);
    onDone?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar a lista</DialogTitle>
          <DialogDescription>
            {selectedIds.length} {itemType === "company" ? "empresa(s)" : "ejecutivo(s)"} seleccionado(s)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {lists.length > 0 && !creatingNew && (
            <RadioGroup value={selectedList} onValueChange={setSelectedList}>
              {lists.map((list) => (
                <div key={list.id} className="flex items-center space-x-2">
                  <RadioGroupItem value={list.id} id={list.id} />
                  <Label htmlFor={list.id} className="font-normal cursor-pointer">{list.name}</Label>
                </div>
              ))}
            </RadioGroup>
          )}

          {creatingNew ? (
            <div className="space-y-2">
              <Label>Nombre de la nueva lista</Label>
              <Input
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="Mi lista..."
                autoFocus
              />
              <Button variant="ghost" size="sm" onClick={() => setCreatingNew(false)}>
                Cancelar
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setCreatingNew(true)} className="w-full">
              <Plus className="w-4 h-4 mr-1" /> Nueva lista
            </Button>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleAdd} disabled={loading || (!selectedList && !(creatingNew && newListName.trim()))}>
            {loading ? "Agregando..." : "Agregar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
