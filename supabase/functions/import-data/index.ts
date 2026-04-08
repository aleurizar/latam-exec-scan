import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

interface ImportRequest {
  type: "companies" | "executives";
  rows: Record<string, string>[];
  duplicateMode: "skip" | "overwrite";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user and admin role
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: hasRole } = await adminClient.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (!hasRole) {
      return new Response(JSON.stringify({ error: "Solo administradores pueden importar datos" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: ImportRequest = await req.json();
    const { type, rows, duplicateMode } = body;

    if (!type || !rows || !Array.isArray(rows) || rows.length === 0) {
      return new Response(JSON.stringify({ error: "Datos inválidos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (rows.length > 5000) {
      return new Response(JSON.stringify({ error: "Máximo 5000 filas por importación" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let inserted = 0;
    let skipped = 0;
    let updated = 0;
    const errors: string[] = [];

    if (type === "companies") {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          if (!row.name || !row.country || !row.industry) {
            errors.push(`Fila ${i + 1}: campos requeridos faltantes`);
            continue;
          }

          // Check duplicate by name
          const { data: existing } = await adminClient
            .from("companies")
            .select("id")
            .ilike("name", row.name.trim())
            .limit(1);

          if (existing && existing.length > 0) {
            if (duplicateMode === "skip") {
              skipped++;
              continue;
            }
            // Overwrite
            const { error: updateErr } = await adminClient
              .from("companies")
              .update({
                country: row.country.trim(),
                industry: row.industry.trim(),
                size: row.size?.trim() || null,
                revenue_usd: row.revenue_usd ? parseInt(row.revenue_usd, 10) || null : null,
                website: row.website?.trim() || null,
                description: row.description?.trim() || null,
              })
              .eq("id", existing[0].id);

            if (updateErr) {
              errors.push(`Fila ${i + 1}: ${updateErr.message}`);
            } else {
              updated++;
            }
          } else {
            const { error: insertErr } = await adminClient.from("companies").insert({
              name: row.name.trim(),
              country: row.country.trim(),
              industry: row.industry.trim(),
              size: row.size?.trim() || null,
              revenue_usd: row.revenue_usd ? parseInt(row.revenue_usd, 10) || null : null,
              website: row.website?.trim() || null,
              description: row.description?.trim() || null,
            });

            if (insertErr) {
              errors.push(`Fila ${i + 1}: ${insertErr.message}`);
            } else {
              inserted++;
            }
          }
        } catch (e) {
          errors.push(`Fila ${i + 1}: ${e.message}`);
        }
      }
    } else if (type === "executives") {
      // Build company name -> id cache
      const companyCache = new Map<string, string>();

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          if (!row.full_name || !row.position || !row.country || !row.company_name) {
            errors.push(`Fila ${i + 1}: campos requeridos faltantes`);
            continue;
          }

          // Resolve company_id
          const companyName = row.company_name.trim().toLowerCase();
          let companyId = companyCache.get(companyName);

          if (!companyId) {
            const { data: companies } = await adminClient
              .from("companies")
              .select("id")
              .ilike("name", row.company_name.trim())
              .limit(1);

            if (companies && companies.length > 0) {
              companyId = companies[0].id;
              companyCache.set(companyName, companyId);
            } else {
              errors.push(`Fila ${i + 1}: empresa "${row.company_name}" no encontrada`);
              continue;
            }
          }

          // Check duplicate by email if available
          let existingExec = null;
          if (row.email?.trim()) {
            const { data } = await adminClient
              .from("executives")
              .select("id")
              .ilike("email", row.email.trim())
              .limit(1);
            existingExec = data?.[0] || null;
          }

          if (existingExec) {
            if (duplicateMode === "skip") {
              skipped++;
              continue;
            }
            const { error: updateErr } = await adminClient
              .from("executives")
              .update({
                full_name: row.full_name.trim(),
                position: row.position.trim(),
                country: row.country.trim(),
                company_id: companyId,
                seniority: row.seniority?.trim() || null,
                linkedin_url: row.linkedin_url?.trim() || null,
              })
              .eq("id", existingExec.id);

            if (updateErr) {
              errors.push(`Fila ${i + 1}: ${updateErr.message}`);
            } else {
              updated++;
            }
          } else {
            const { error: insertErr } = await adminClient.from("executives").insert({
              full_name: row.full_name.trim(),
              position: row.position.trim(),
              country: row.country.trim(),
              company_id: companyId,
              email: row.email?.trim() || null,
              seniority: row.seniority?.trim() || null,
              linkedin_url: row.linkedin_url?.trim() || null,
            });

            if (insertErr) {
              errors.push(`Fila ${i + 1}: ${insertErr.message}`);
            } else {
              inserted++;
            }
          }
        } catch (e) {
          errors.push(`Fila ${i + 1}: ${e.message}`);
        }
      }
    }

    return new Response(
      JSON.stringify({ inserted, skipped, updated, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
