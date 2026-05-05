import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FilterState } from "@/pages/Dashboard";
import { Download, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataType: string;
  filters: FilterState;
}

const PLAN_LIMITS: Record<string, number> = {
  basic: 0,
  silver: 5000,
  gold: 50000,
};

export const ExportDialog = ({ open, onOpenChange, dataType, filters }: ExportDialogProps) => {
  const [format, setFormat] = useState<"csv" | "xlsx">("csv");
  const [loading, setLoading] = useState(false);
  const [quota, setQuota] = useState({ used: 0, limit: 500, plan: "basic" });

  useEffect(() => {
    if (open) {
      fetchQuota();
    }
  }, [open]);

  const fetchQuota = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .single();

    const plan = profile?.plan || "basic";
    const monthYear = new Date().toISOString().slice(0, 7);

    const { data: quotaData } = await supabase
      .from("export_quotas")
      .select("records_exported")
      .eq("user_id", user.id)
      .eq("month_year", monthYear)
      .single();

    setQuota({
      used: quotaData?.records_exported || 0,
      limit: PLAN_LIMITS[plan] ?? 0,
      plan,
    });
  };

  const handleExport = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("You must be logged in to export");
      return;
    }

    if (quota.used >= quota.limit) {
      toast.error("Export limit reached for this month");
      return;
    }

    setLoading(true);

    const monthYear = new Date().toISOString().slice(0, 7);

    // Create export log
    const { error: logError } = await supabase.from("export_logs").insert({
      user_id: user.id,
      export_type: dataType,
      record_count: 0,
      status: "pending",
    });

    if (logError) {
      toast.error("Failed to create export log");
      setLoading(false);
      return;
    }

    // Update quota
    const { error: quotaError } = await supabase
      .from("export_quotas")
      .upsert({
        user_id: user.id,
        month_year: monthYear,
        records_exported: quota.used + 100,
      }, {
        onConflict: "user_id,month_year"
      });

    setLoading(false);

    if (quotaError) {
      toast.error("Failed to update export quota");
      return;
    }

    toast.success(`Export started! Format: ${format.toUpperCase()}`);
    onOpenChange(false);
  };

  const remaining = quota.limit - quota.used;
  const usagePercent = (quota.used / quota.limit) * 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Data</DialogTitle>
          <DialogDescription>
            Export {dataType} data with your current filters applied
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Monthly Quota</span>
                  <Badge variant={usagePercent > 80 ? "destructive" : "secondary"}>
                    {quota.used} / {quota.limit} records
                  </Badge>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(usagePercent, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {remaining} records remaining this month
                </p>
              </div>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label>Export Format</Label>
            <RadioGroup value={format} onValueChange={(v) => setFormat(v as "csv" | "xlsx")}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv" className="font-normal cursor-pointer">
                  CSV (Comma Separated Values)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="xlsx" id="xlsx" />
                <Label htmlFor="xlsx" className="font-normal cursor-pointer">
                  XLSX (Excel Spreadsheet)
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Active Filters</Label>
            <div className="flex flex-wrap gap-2">
              {filters.country.length > 0 && (
                <Badge variant="outline">Countries: {filters.country.join(", ")}</Badge>
              )}
              {filters.industry.length > 0 && (
                <Badge variant="outline">Industries: {filters.industry.join(", ")}</Badge>
              )}
              {filters.size.length > 0 && (
                <Badge variant="outline">Sizes: {filters.size.join(", ")}</Badge>
              )}
              {filters.search && (
                <Badge variant="outline">Search: "{filters.search}"</Badge>
              )}
              {filters.country.length === 0 && filters.industry.length === 0 && 
               filters.size.length === 0 && !filters.search && (
                <span className="text-sm text-muted-foreground">No filters applied</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={loading || remaining <= 0}>
            <Download className="w-4 h-4 mr-2" />
            {loading ? "Exporting..." : "Export"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};