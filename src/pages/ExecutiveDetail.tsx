import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, User, Briefcase, MapPin, Mail, Linkedin, Building2, ExternalLink, Cpu, Lock } from "lucide-react";
import { useUserPlan } from "@/hooks/useUserPlan";

interface Executive {
  id: string;
  full_name: string;
  position: string;
  seniority: string | null;
  email: string | null;
  linkedin_url: string | null;
  country: string;
  technologies: string[] | null;
  companies: {
    id: string;
    name: string;
    industry: string;
    country: string;
    website: string | null;
  } | null;
}

const ExecutiveDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [executive, setExecutive] = useState<Executive | null>(null);
  const [loading, setLoading] = useState(true);
  const { canViewContactInfo } = useUserPlan();

  useEffect(() => {
    if (id) fetchExecutive();
  }, [id]);

  const fetchExecutive = async () => {
    const { data, error } = await supabase
      .from("executives")
      .select("*, companies(id, name, industry, country, website)")
      .eq("id", id!)
      .single();

    if (error) {
      console.error("Error fetching executive:", error);
      navigate("/dashboard");
    } else {
      setExecutive(data as Executive);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!executive) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-4">
        <Button variant="ghost" onClick={() => navigate("/dashboard")} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Volver al Dashboard
        </Button>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Executive Header */}
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{executive.full_name}</h1>
            <p className="text-lg text-muted-foreground">{executive.position}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información de Contacto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>{executive.country}</span>
              </div>
              <div className="flex items-center gap-3">
                <Briefcase className="w-4 h-4 text-muted-foreground" />
                <Badge variant="secondary">{executive.seniority || "N/A"}</Badge>
              </div>
              {executive.email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <a href={`mailto:${executive.email}`} className="text-primary hover:underline">
                    {executive.email}
                  </a>
                </div>
              )}
              {executive.linkedin_url && (
                <div className="flex items-center gap-3">
                  <Linkedin className="w-4 h-4 text-muted-foreground" />
                  <a href={executive.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                    Ver perfil <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Company Info */}
          {executive.companies && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Empresa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link to={`/company/${executive.companies.id}`} className="text-xl font-semibold text-primary hover:underline">
                  {executive.companies.name}
                </Link>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{executive.companies.industry}</Badge>
                  <Badge variant="outline">{executive.companies.country}</Badge>
                </div>
                {executive.companies.website && (
                  <a href={executive.companies.website} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                    {executive.companies.website} <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Technologies */}
        {executive.technologies && executive.technologies.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Cpu className="w-5 h-5" />
                Tecnologías
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {executive.technologies.map((tech) => (
                  <Badge key={tech} variant="secondary">{tech}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default ExecutiveDetail;
