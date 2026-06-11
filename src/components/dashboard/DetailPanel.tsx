import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { X, Building2, Globe, MapPin, Users, DollarSign, ExternalLink, User, Briefcase, Mail, Linkedin, Cpu, Lock, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEmailCredits } from "@/hooks/useEmailCredits";

interface DetailPanelProps {
  type: "company" | "executive" | null;
  id: string | null;
  onClose: () => void;
  onNavigate: (type: "company" | "executive", id: string) => void;
}

interface Company {
  id: string;
  name: string;
  country: string;
  industry: string;
  size: string | null;
  revenue_usd: number | null;
  website: string | null;
  description: string | null;
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
  companies: {
    id: string;
    name: string;
    industry: string;
    country: string;
    website: string | null;
  } | null;
}

interface CompanyExecutive {
  id: string;
  full_name: string;
  position: string;
  seniority: string | null;
}

const maskEmail = (email: string) => {
  const [local, domain] = email.split("@");
  if (!domain) return "***@***.com";
  return `${local[0]}***@${domain}`;
};

export const DetailPanel = ({ type, id, onClose, onNavigate }: DetailPanelProps) => {
  const [company, setCompany] = useState<Company | null>(null);
  const [executive, setExecutive] = useState<Executive | null>(null);
  const { isRevealed, revealEmail, canRevealEmail } = useEmailCredits();
  const [companyExecs, setCompanyExecs] = useState<CompanyExecutive[]>([]);
  const [loading, setLoading] = useState(false);
  const [revealingEmail, setRevealingEmail] = useState(false);

  const isOpen = type !== null && id !== null;

  useEffect(() => {
    if (!type || !id) return;
    setLoading(true);
    if (type === "company") {
      fetchCompany(id);
    } else {
      fetchExecutive(id);
    }
  }, [type, id]);

  const fetchCompany = async (companyId: string) => {
    const [companyRes, execsRes] = await Promise.all([
      supabase.from("companies").select("*").eq("id", companyId).single(),
      supabase.from("executives").select("id, full_name, position, seniority").eq("company_id", companyId).order("full_name"),
    ]);
    setCompany(companyRes.data);
    setCompanyExecs(execsRes.data || []);
    setExecutive(null);
    setLoading(false);
  };

  const fetchExecutive = async (execId: string) => {
    const { data } = await supabase
      .from("executives")
      .select("*, companies(id, name, industry, country, website)")
      .eq("id", execId)
      .single();
    setExecutive(data as Executive);
    setCompany(null);
    setCompanyExecs([]);
    setLoading(false);
  };

  const handleRevealEmail = async () => {
    if (!executive) return;
    setRevealingEmail(true);
    await revealEmail(executive.id);
    setRevealingEmail(false);
  };

  const formatRevenue = (revenue: number | null) => {
    if (!revenue) return "N/A";
    if (revenue >= 1_000_000_000) return `$${(revenue / 1_000_000_000).toFixed(1)}B`;
    return `$${(revenue / 1_000_000).toFixed(1)}M`;
  };

  return (
    <div
      className={cn(
        "h-screen border-l border-border bg-card overflow-y-auto transition-all duration-300 shrink-0",
        isOpen ? "w-[420px]" : "w-0 border-l-0"
      )}
    >
      {isOpen && (
        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-foreground">
              {type === "company" ? "Empresa" : "Ejecutivo"}
            </h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : type === "company" && company ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-bold text-foreground">{company.name}</h3>
                {company.description && (
                  <p className="text-sm text-muted-foreground mt-1">{company.description}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span>{company.country}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="w-4 h-4 text-primary" />
                  <span>{company.industry}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-primary" />
                  <span>{company.size || "N/A"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="w-4 h-4 text-primary" />
                  <span>{formatRevenue(company.revenue_usd)}</span>
                </div>
              </div>

              {company.website && (
                <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                  <Globe className="w-3 h-3" /> {company.website} <ExternalLink className="w-3 h-3" />
                </a>
              )}

              {companyExecs.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-foreground">Ejecutivos ({companyExecs.length})</h4>
                  <div className="space-y-1">
                    {companyExecs.map((exec) => (
                      <button
                        key={exec.id}
                        onClick={() => onNavigate("executive", exec.id)}
                        className="w-full text-left p-2 rounded-md hover:bg-muted transition-colors"
                      >
                        <div className="text-sm font-medium text-primary">{exec.full_name}</div>
                        <div className="text-xs text-muted-foreground">{exec.position}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : type === "executive" && executive ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">{executive.full_name}</h3>
                  <p className="text-sm text-muted-foreground">{executive.position}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span>{executive.country}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Briefcase className="w-4 h-4 text-muted-foreground" />
                  <Badge variant="secondary">{executive.seniority || "N/A"}</Badge>
                </div>
                {/* Email with reveal logic */}
                {executive.has_email ? (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    {(() => {
                      const revealedEmail = getRevealedContact(executive.id)?.email ?? executive.email;
                      return isRevealed(executive.id) && revealedEmail ? (
                        <a href={`mailto:${revealedEmail}`} className="text-primary hover:underline">{revealedEmail}</a>
                      ) : (
                        <span className="text-muted-foreground inline-flex items-center gap-1">
                          {executive.email_masked}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            disabled={revealingEmail || !canRevealEmail}
                            onClick={handleRevealEmail}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </span>
                      );
                    })()}
                  </div>
                ) : null}
                {/* LinkedIn */}
                {(() => {
                  const revealedLinkedin = getRevealedContact(executive.id)?.linkedin_url ?? executive.linkedin_url;
                  if (isRevealed(executive.id) && revealedLinkedin) {
                    return (
                      <div className="flex items-center gap-2 text-sm">
                        <Linkedin className="w-4 h-4 text-muted-foreground" />
                        <a href={revealedLinkedin} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                          Ver perfil <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    );
                  }
                  if (executive.has_linkedin) {
                    return (
                      <div className="flex items-center gap-2 text-sm">
                        <Linkedin className="w-4 h-4 text-muted-foreground" />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          disabled={revealingEmail || !canRevealEmail}
                          onClick={handleRevealEmail}
                        >
                          Revelar perfil
                        </Button>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              {executive.companies && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-foreground">Empresa</h4>
                  <button
                    onClick={() => onNavigate("company", executive.companies!.id)}
                    className="w-full text-left p-3 rounded-md border border-border hover:bg-muted transition-colors"
                  >
                    <div className="text-sm font-medium text-primary">{executive.companies.name}</div>
                    <div className="text-xs text-muted-foreground">{executive.companies.industry} · {executive.companies.country}</div>
                  </button>
                </div>
              )}

              {executive.technologies && executive.technologies.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-1 text-foreground">
                    <Cpu className="w-4 h-4" /> Tecnologías
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {executive.technologies.map((tech) => (
                      <Badge key={tech} variant="secondary" className="text-xs">{tech}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
