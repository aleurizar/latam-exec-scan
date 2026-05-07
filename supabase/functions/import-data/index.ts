import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ImportRequest {
  type: "companies" | "executives";
  rows: Record<string, string>[];
  duplicateMode: "skip" | "overwrite";
  autoCreateCompanies?: boolean;
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
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
    const { type, rows, duplicateMode, autoCreateCompanies } = body;

    if (!type || !rows || !Array.isArray(rows) || rows.length === 0) {
      return new Response(JSON.stringify({ error: "Datos inválidos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (rows.length > 10000) {
      return new Response(JSON.stringify({ error: "Máximo 10000 filas por importación" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let inserted = 0;
    let skipped = 0;
    let updated = 0;
    const errors: string[] = [];

    if (type === "companies") {
      // Batch: fetch all existing company names upfront
      const { data: existingCompanies } = await adminClient
        .from("companies")
        .select("id, name");

      const nameToId = new Map<string, string>();
      for (const c of existingCompanies || []) {
        nameToId.set(c.name.toLowerCase().trim(), c.id);
      }

      const toInsert: any[] = [];
      const toUpdate: { id: string; data: any }[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row.name || !row.country || !row.industry) {
          errors.push(`Fila ${i + 1}: campos requeridos faltantes`);
          continue;
        }

        const existingId = nameToId.get(row.name.trim().toLowerCase());

        if (existingId) {
          if (duplicateMode === "skip") {
            skipped++;
          } else {
            toUpdate.push({
              id: existingId,
              data: {
                country: row.country.trim(),
                industry: row.industry.trim(),
                size: row.size?.trim() || null,
                revenue_usd: row.revenue_usd ? parseInt(row.revenue_usd, 10) || null : null,
                website: row.website?.trim() || null,
                description: row.description?.trim() || null,
              },
            });
          }
        } else {
          nameToId.set(row.name.trim().toLowerCase(), "pending");
          toInsert.push({
            name: row.name.trim(),
            country: row.country.trim(),
            industry: row.industry.trim(),
            size: row.size?.trim() || null,
            revenue_usd: row.revenue_usd ? parseInt(row.revenue_usd, 10) || null : null,
            website: row.website?.trim() || null,
            description: row.description?.trim() || null,
          });
        }
      }

      // Batch insert in chunks of 1000
      if (toInsert.length > 0) {
        const CHUNK = 1000;
        for (let i = 0; i < toInsert.length; i += CHUNK) {
          const slice = toInsert.slice(i, i + CHUNK);
          const { error: insertErr, data: insertedData } = await adminClient
            .from("companies")
            .insert(slice)
            .select("id");
          if (insertErr) {
            errors.push(`Error batch insert (chunk ${i / CHUNK + 1}): ${insertErr.message}`);
          } else {
            inserted += insertedData?.length || slice.length;
          }
        }
      }

      // Updates must be individual
      for (const u of toUpdate) {
        const { error: updateErr } = await adminClient
          .from("companies")
          .update(u.data)
          .eq("id", u.id);
        if (updateErr) errors.push(`Update error: ${updateErr.message}`);
        else updated++;
      }

    } else if (type === "executives") {
      // Pre-fetch all companies for name resolution
      const { data: allCompanies } = await adminClient
        .from("companies")
        .select("id, name");

      const companyMap = new Map<string, string>();
      for (const c of allCompanies || []) {
        companyMap.set(c.name.toLowerCase().trim(), c.id);
      }

      const toInsert: any[] = [];
      const toUpdate: { id: string; data: any }[] = [];
      const emailsToCheck: string[] = [];

      // Collect emails for batch duplicate check
      for (const row of rows) {
        if (row.email?.trim()) emailsToCheck.push(row.email.trim().toLowerCase());
      }

      const existingByEmail = new Map<string, string>();
      if (emailsToCheck.length > 0) {
        // Fetch in batches of 100 emails
        for (let i = 0; i < emailsToCheck.length; i += 100) {
          const batch = emailsToCheck.slice(i, i + 100);
          const { data: execs } = await adminClient
            .from("executives")
            .select("id, email")
            .in("email", batch);
          for (const e of execs || []) {
            if (e.email) existingByEmail.set(e.email.toLowerCase(), e.id);
          }
        }
      }

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row.full_name || !row.position || !row.country || !row.company_name) {
          errors.push(`Fila ${i + 1}: campos requeridos faltantes`);
          continue;
        }

        let companyId = companyMap.get(row.company_name.trim().toLowerCase());
        if (!companyId) {
          if (autoCreateCompanies) {
            // Auto-create the company
            const { data: newCompany, error: createErr } = await adminClient
              .from("companies")
              .insert({
                name: row.company_name.trim(),
                country: row.country.trim(),
                industry: "Sin clasificar",
              })
              .select("id")
              .single();
            if (createErr || !newCompany) {
              errors.push(`Fila ${i + 1}: no se pudo crear empresa "${row.company_name}": ${createErr?.message}`);
              continue;
            }
            companyId = newCompany.id;
            companyMap.set(row.company_name.trim().toLowerCase(), companyId);
          } else {
            errors.push(`Fila ${i + 1}: empresa "${row.company_name}" no encontrada`);
            continue;
          }
        }

        const email = row.email?.trim() || null;
        const existingId = email ? existingByEmail.get(email.toLowerCase()) : null;

        const execData = {
          full_name: row.full_name.trim(),
          position: row.position.trim(),
          country: row.country.trim(),
          company_id: companyId,
          email,
          seniority: row.seniority?.trim() || null,
          linkedin_url: row.linkedin_url?.trim() || null,
        };

        if (existingId) {
          if (duplicateMode === "skip") {
            skipped++;
          } else {
            toUpdate.push({ id: existingId, data: execData });
          }
        } else {
          toInsert.push(execData);
        }
      }

      if (toInsert.length > 0) {
        const CHUNK = 1000;
        for (let i = 0; i < toInsert.length; i += CHUNK) {
          const slice = toInsert.slice(i, i + CHUNK);
          const { error: insertErr, data: insertedData } = await adminClient
            .from("executives")
            .insert(slice)
            .select("id");
          if (insertErr) {
            errors.push(`Error batch insert (chunk ${i / CHUNK + 1}): ${insertErr.message}`);
          } else {
            inserted += insertedData?.length || slice.length;
          }
        }
      }

      for (const u of toUpdate) {
        const { error: updateErr } = await adminClient
          .from("executives")
          .update(u.data)
          .eq("id", u.id);
        if (updateErr) errors.push(`Update error: ${updateErr.message}`);
        else updated++;
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
