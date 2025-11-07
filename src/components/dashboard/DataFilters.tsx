import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { FilterState } from "@/pages/Dashboard";

interface DataFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

const COUNTRIES = ["Mexico", "Brazil", "Argentina", "Colombia", "Chile", "Peru"];
const INDUSTRIES = ["Technology", "Finance", "Healthcare", "Manufacturing", "Retail", "Energy"];
const SIZES = ["1-50", "51-200", "201-1000", "1000+"];

export const DataFilters = ({ filters, onFiltersChange }: DataFiltersProps) => {
  const toggleFilter = (category: keyof FilterState, value: string) => {
    const current = filters[category] as string[];
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    
    onFiltersChange({ ...filters, [category]: updated });
  };

  const removeFilter = (category: keyof FilterState, value: string) => {
    const current = filters[category] as string[];
    onFiltersChange({ ...filters, [category]: current.filter(v => v !== value) });
  };

  return (
    <Card className="mb-6">
      <CardContent className="pt-6 space-y-4">
        <div>
          <Label className="mb-2 block">Search</Label>
          <Input
            placeholder="Search companies or executives..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          />
        </div>

        <div>
          <Label className="mb-2 block">Country</Label>
          <div className="flex flex-wrap gap-2">
            {COUNTRIES.map(country => (
              <Badge
                key={country}
                variant={filters.country.includes(country) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleFilter("country", country)}
              >
                {country}
                {filters.country.includes(country) && (
                  <X className="ml-1 w-3 h-3" onClick={(e) => {
                    e.stopPropagation();
                    removeFilter("country", country);
                  }} />
                )}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <Label className="mb-2 block">Industry</Label>
          <div className="flex flex-wrap gap-2">
            {INDUSTRIES.map(industry => (
              <Badge
                key={industry}
                variant={filters.industry.includes(industry) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleFilter("industry", industry)}
              >
                {industry}
                {filters.industry.includes(industry) && (
                  <X className="ml-1 w-3 h-3" onClick={(e) => {
                    e.stopPropagation();
                    removeFilter("industry", industry);
                  }} />
                )}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <Label className="mb-2 block">Company Size</Label>
          <div className="flex flex-wrap gap-2">
            {SIZES.map(size => (
              <Badge
                key={size}
                variant={filters.size.includes(size) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleFilter("size", size)}
              >
                {size} employees
                {filters.size.includes(size) && (
                  <X className="ml-1 w-3 h-3" onClick={(e) => {
                    e.stopPropagation();
                    removeFilter("size", size);
                  }} />
                )}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};