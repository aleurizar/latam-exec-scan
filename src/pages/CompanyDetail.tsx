import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Building2, Globe, MapPin, Users, DollarSign, ExternalLink } from "lucide-react";

interface Company {
  id: string;
  name: string;
  country: string;
  industry: string;
  size: string | null;
  revenue_usd: number | null;
  website: string | null;
  description: string | null;
  created_at: string;
}

interface Executive {
  id: string;
  full_name: string;
  position: string;
  seniority: string | null;
  email: string | null;
  linkedin_url: string | null;
  country: string;
}

const CompanyDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [company, setCompany] = useState<Company | null>(null);
  const [executives, setExecutives] = useState<Executive[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchCompany();
      fetchExecutives();
    }
  }, [id]);

  const fetchCompany = async () => {
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .eq("id", id!)
      .single();

    if (error) {
      console.error("Error fetching company:", error);
      navigate("/dashboard");
    } else {
      setCompany(data);
    }
    setLoading(false);
  };

  const fetchExecutives = async () => {
    const { data } = await supabase
      .from("executives")
      .select("id, full_name, position, seniority, email, linkedin_url, country")
      .eq("company_id", id!)
      .order("full_name");

    if (data) setExecutives(data);
  };

  const formatRevenue = (revenue: number | null) => {
    if (!revenue) return "N/A";
    if (revenue >= 1_000_000_000) return `$${(revenue / 1_000_000_000).toFixed(1)}B`;
    return `$${(revenue / 1_000_000).toFixed(1)}M`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!company) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-4">
        <Button variant="ghost" onClick={() => navigate("/dashboard")} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Volver al Dashboard
        </Button>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Company Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{company.name}</h1>
            {company.description && (
              <p className="text-muted-foreground mt-2 max-w-2xl">{company.description}</p>
            )}
          </div>
          {company.website && (
            <a href={company.website} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="gap-2">
                <Globe className="w-4 h-4" />
                Website
                <ExternalLink className="w-3 h-3" />
              </Button>
            </a>
          )}
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6 flex items-center gap-3">
              <MapPin className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">País</p>
                <p className="font-semibold">{company.country}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-3">
              <Building2 className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Industria</p>
                <p className="font-semibold">{company.industry}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-3">
              <Users className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Tamaño</p>
                <p className="font-semibold">{company.size || "N/A"}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Revenue</p>
                <p className="font-semibold">{formatRevenue(company.revenue_usd)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Executives */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Ejecutivos ({executives.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {executives.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No hay ejecutivos registrados para esta empresa.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Seniority</TableHead>
                    <TableHead>País</TableHead>
                    <TableHead>LinkedIn</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {executives.map((exec) => (
                    <TableRow key={exec.id}>
                      <TableCell>
                        <Link to={`/executive/${exec.id}`} className="font-medium text-primary hover:underline">
                          {exec.full_name}
                        </Link>
                      </TableCell>
                      <TableCell>{exec.position}</TableCell>
                      <TableCell>{exec.seniority || "N/A"}</TableCell>
                      <TableCell><Badge variant="outline">{exec.country}</Badge></TableCell>
                      <TableCell>
                        {exec.linkedin_url ? (
                          <a href={exec.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                            Profile <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : <span className="text-muted-foreground">N/A</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CompanyDetail;
