

## Plan: Search field always visible above tables

Move the search input out of the collapsible `DataFilters` panel so it's always visible when viewing Companies or Executives. The advanced filters (country, industry, size) remain behind the filter toggle.

### Changes

1. **`src/pages/Dashboard.tsx`** — Add a persistent search `Input` with a search icon above the tables in both the "companies" and "executives" views. Bind it to `filters.search`. The existing `DataFilters` component stays for advanced filters only.

2. **`src/components/dashboard/DataFilters.tsx`** — Remove the search `Input` field from this component, keeping only country, industry, and size filters.

