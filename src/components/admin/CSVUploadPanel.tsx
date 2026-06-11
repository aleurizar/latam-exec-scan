import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

interface ParsedRow {
  empresa_nombre: string;
  empresa_country: string;
  empresa_industry: string;
  empresa_website?: string;
  empresa_size?: string;
  empresa_revenue_usd?: number;
  empresa_description?: string;
  empresa_email_corporate?: string;
  empresa_phone?: string;
  empresa_whatsapp?: string;
  empresa_linkedin_url?: string;
  empresa_instagram_url?: string;
  empresa_facebook_url?: string;
  empresa_twitter_url?: string;
  empresa_confidence_level?: string;
  empresa_ml_seller_id?: string;
  empresa_ml_status?: string;
  empresa_ml_sales_total?: number;
  empresa_ml_merchant_level?: string;
  contacto_nombre: string;
  contacto_apellido: string;
  contacto_email: string;
  contacto_position?: string;
  contacto_seniority?: string;
  contacto_linkedin_url?: string;
  contacto_phone?: string;
  contacto_whatsapp?: string;
  contacto_confidence_level?: string;
  contacto_email_type?: string;
}

interface ImportAudit {
  timestamp: string;
  totalRows: number;
  companiesInserted: number;
  contactsInserted: number;
  duplicates: number;
  errors: string[];
}

export function CSVUploadPanel() {
  const [activeTab, setActiveTab] = useState('upload');
  const [csvText, setCsvText] = useState('');
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [auditHistory, setAuditHistory] = useState<ImportAudit[]>(() => {
    const saved = localStorage.getItem('csvAuditHistory');
    return saved ? JSON.parse(saved) : [];
  });
  const [loading, setLoading] = useState(false);
  const [importStats, setImportStats] = useState({
    total: 0,
    empresas: 0,
    contactos: 0,
    duplicados: 0,
  });

  // Parse CSV
  const handleParseCSV = () => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
      setErrors(['CSV debe tener al menos header + 1 fila de datos']);
      return;
    }

    const headers = lines[0].split(',').map((h) => h.trim());
    const rows: ParsedRow[] = [];
    const parseErrors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim());
      const row: Partial<ParsedRow> = {};

      headers.forEach((header, idx) => {
        const value = values[idx] || '';
        if (header.includes('revenue') || header.includes('sales_total')) {
          (row as Record<string, unknown>)[header] = value ? parseInt(value, 10) : undefined;
        } else {
          (row as Record<string, unknown>)[header] = value || undefined;
        }
      });

      // Validar obligatorios
      if (
        !row.empresa_nombre ||
        !row.contacto_nombre ||
        !row.contacto_apellido ||
        !row.contacto_email
      ) {
        parseErrors.push(
          `Fila ${i + 1}: Faltan campos obligatorios (empresa_nombre, contacto_nombre, contacto_apellido, contacto_email)`
        );
        continue;
      }

      rows.push(row as ParsedRow);
    }

    setParsedData(rows);
    setErrors(parseErrors);
    setImportStats({
      total: rows.length,
      empresas: new Set(rows.map((r) => r.empresa_nombre)).size,
      contactos: rows.length,
      duplicados: 0,
    });
    setActiveTab('preview');
  };

  // Insert data to Supabase
  const handleInsertData = async () => {
    setLoading(true);
    const newErrors: string[] = [];
    let companiesInserted = 0;
    let contactsInserted = 0;
    const duplicates = new Set<string>();

    try {
      // Agrupar por empresa
      const companiesByName = new Map<string, ParsedRow[]>();
      parsedData.forEach((row) => {
        if (!companiesByName.has(row.empresa_nombre)) {
          companiesByName.set(row.empresa_nombre, []);
        }
        companiesByName.get(row.empresa_nombre)!.push(row);
      });

      // Insertar empresas y contactos
      for (const [empresaNombre, rows] of companiesByName) {
        const firstRow = rows[0];
        const empresaId = uuidv4();

        try {
          // Insertar empresa
          const { error: companyError } = await supabase.from('companies').insert({
            id: empresaId,
            name: firstRow.empresa_nombre,
            country: firstRow.empresa_country,
            industry: firstRow.empresa_industry,
            website: firstRow.empresa_website || null,
            size: firstRow.empresa_size || null,
            revenue_usd: firstRow.empresa_revenue_usd || null,
            description: firstRow.empresa_description || null,
            email_corporate: firstRow.empresa_email_corporate || null,
            phone: firstRow.empresa_phone || null,
            whatsapp: firstRow.empresa_whatsapp || null,
            linkedin_url: firstRow.empresa_linkedin_url || null,
            instagram_url: firstRow.empresa_instagram_url || null,
            facebook_url: firstRow.empresa_facebook_url || null,
            twitter_url: firstRow.empresa_twitter_url || null,
            confidence_level: firstRow.empresa_confidence_level || 'Media',
            ml_seller_id: firstRow.empresa_ml_seller_id || null,
            ml_status: firstRow.empresa_ml_status || null,
            ml_sales_total: firstRow.empresa_ml_sales_total || null,
            ml_merchant_level: firstRow.empresa_ml_merchant_level || null,
          });

          if (companyError) {
            console.error('Error insertando empresa:', companyError);
            newErrors.push(`${empresaNombre}: ${companyError.message}`);
            continue;
          }

          companiesInserted++;

          // Insertar contactos
          for (const row of rows) {
            const contactEmail = row.contacto_email.toLowerCase();

            // Verificar duplicado
            const { data: existing } = await supabase
              .from('executives')
              .select('id')
              .eq('email', contactEmail)
              .single();

            if (existing) {
              duplicates.add(contactEmail);
              continue;
            }

            try {
              const { error: contactError } = await supabase.from('executives').insert({
                id: uuidv4(),
                company_id: empresaId,
                full_name: `${row.contacto_nombre} ${row.contacto_apellido}`,
                position: row.contacto_position || null,
                seniority: row.contacto_seniority || null,
                email: contactEmail,
                linkedin_url: row.contacto_linkedin_url || null,
                country: firstRow.empresa_country,
                email_verified: true,
                email_type: row.contacto_email_type || 'corporativo',
                phone: row.contacto_phone || null,
                whatsapp: row.contacto_whatsapp || null,
                confidence_level: row.contacto_confidence_level || 'Media',
              });

              if (contactError) {
                console.error('Error insertando contacto:', contactError);
                newErrors.push(
                  `${empresaNombre} / ${row.contacto_nombre} ${row.contacto_apellido}: ${contactError.message}`
                );
              } else {
                contactsInserted++;
              }
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : String(error);
              console.error('Error insertando contacto:', error);
              newErrors.push(
                `${empresaNombre} / ${row.contacto_nombre} ${row.contacto_apellido}: ${errorMsg}`
              );
            }
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error('Error insertando empresa:', error);
          newErrors.push(`${empresaNombre}: ${errorMsg}`);
        }
      }

      // Guardar en audit history
      const audit: ImportAudit = {
        timestamp: new Date().toLocaleString(),
        totalRows: parsedData.length,
        companiesInserted,
        contactsInserted,
        duplicates: duplicates.size,
        errors: newErrors,
      };

      const updatedHistory = [audit, ...auditHistory].slice(0, 10);
      setAuditHistory(updatedHistory);
      localStorage.setItem('csvAuditHistory', JSON.stringify(updatedHistory));

      setErrors(newErrors);
      setImportStats({
        total: parsedData.length,
        empresas: companiesInserted,
        contactos: contactsInserted,
        duplicados: duplicates.size,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Error general:', error);
      setErrors([...newErrors, `Error general: ${errorMsg}`]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>📤 Admin Panel - Upload CSV</CardTitle>
        <CardDescription>Importa empresas y contactos desde CSV con mapping automático</CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload">1. Upload</TabsTrigger>
            <TabsTrigger value="preview">2. Preview</TabsTrigger>
            <TabsTrigger value="auditoria">3. Auditoría</TabsTrigger>
          </TabsList>

          {/* TAB 1: UPLOAD */}
          <TabsContent value="upload" className="space-y-4">
            <div className="p-4 bg-blue-50 rounded border border-blue-200">
              <p className="text-sm text-blue-800 font-semibold mb-2">📋 Formato esperado:</p>
              <code className="text-xs text-blue-700 block overflow-x-auto whitespace-pre-wrap break-words">
                {`empresa_nombre, empresa_country, empresa_industry, empresa_website, empresa_size, empresa_revenue_usd, empresa_description, empresa_email_corporate, empresa_phone, empresa_whatsapp, empresa_linkedin_url, empresa_instagram_url, empresa_facebook_url, empresa_twitter_url, empresa_confidence_level, empresa_ml_seller_id, empresa_ml_status, empresa_ml_sales_total, empresa_ml_merchant_level, contacto_nombre, contacto_apellido, contacto_email, contacto_position, contacto_seniority, contacto_linkedin_url, contacto_phone, contacto_whatsapp, contacto_confidence_level, contacto_email_type`}
              </code>
              <p className="text-xs text-blue-700 mt-2">
                <strong>Obligatorios:</strong> empresa_nombre, contacto_nombre, contacto_apellido, contacto_email
              </p>
            </div>

            <div>
              <label className="text-sm font-semibold mb-2 block">Pegá tu CSV aquí:</label>
              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="Pegá el contenido del CSV..."
                className="w-full h-48 p-3 border rounded font-mono text-xs"
              />
            </div>

            <Button onClick={handleParseCSV} className="w-full">
              Parsear CSV
            </Button>
          </TabsContent>

          {/* TAB 2: PREVIEW */}
          <TabsContent value="preview" className="space-y-4">
            <div className="flex gap-4 text-sm">
              <div className="bg-gray-100 p-3 rounded">
                <p className="font-semibold text-gray-700">Total</p>
                <p className="text-2xl font-bold text-gray-900">{importStats.total}</p>
              </div>
              <div className="bg-green-100 p-3 rounded">
                <p className="font-semibold text-green-700">Empresas</p>
                <p className="text-2xl font-bold text-green-900">{importStats.empresas}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded">
                <p className="font-semibold text-blue-700">Contactos</p>
                <p className="text-2xl font-bold text-blue-900">{importStats.contactos}</p>
              </div>
              <div className="bg-yellow-100 p-3 rounded">
                <p className="font-semibold text-yellow-700">Duplicados</p>
                <p className="text-2xl font-bold text-yellow-900">{importStats.duplicados}</p>
              </div>
            </div>

            {errors.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded">
                <p className="font-semibold text-red-800 mb-2">⚠️ Errores de parseo ({errors.length}):</p>
                <ul className="text-xs text-red-700 space-y-1">
                  {errors.slice(0, 10).map((err, i) => (
                    <li key={i}>• {err}</li>
                  ))}
                  {errors.length > 10 && <li className="text-gray-600">... y {errors.length - 10} más</li>}
                </ul>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border p-2 text-left">Empresa</th>
                    <th className="border p-2 text-left">País</th>
                    <th className="border p-2 text-left">Contacto</th>
                    <th className="border p-2 text-left">Email</th>
                    <th className="border p-2 text-left">Cargo</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedData.slice(0, 10).map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border p-2">{row.empresa_nombre}</td>
                      <td className="border p-2">{row.empresa_country}</td>
                      <td className="border p-2">{`${row.contacto_nombre} ${row.contacto_apellido}`}</td>
                      <td className="border p-2 text-blue-600">{row.contacto_email}</td>
                      <td className="border p-2">{row.contacto_position || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedData.length > 10 && (
                <p className="text-xs text-gray-600 mt-2">
                  ... y {parsedData.length - 10} filas más
                </p>
              )}
            </div>

            <Button
              onClick={handleInsertData}
              disabled={loading || parsedData.length === 0}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {loading ? '⏳ Insertando...' : '✅ Insertar en Supabase'}
            </Button>
          </TabsContent>

          {/* TAB 3: AUDITORÍA */}
          <TabsContent value="auditoria" className="space-y-4">
            <div className="p-4 bg-gray-50 rounded border">
              <h3 className="font-semibold mb-3">📋 Historial de importaciones:</h3>

              {auditHistory.length === 0 ? (
                <p className="text-sm text-gray-600">Sin importaciones aún</p>
              ) : (
                <div className="space-y-4">
                  {auditHistory.map((audit, i) => (
                    <div key={i} className="p-3 bg-white border rounded">
                      <p className="font-semibold text-sm">{audit.timestamp}</p>
                      <div className="grid grid-cols-4 gap-2 mt-2 text-xs">
                        <div>
                          <p className="text-gray-600">Total</p>
                          <p className="font-bold">{audit.totalRows}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Empresas</p>
                          <p className="font-bold text-green-600">{audit.companiesInserted}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Contactos</p>
                          <p className="font-bold text-blue-600">{audit.contactsInserted}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Duplicados</p>
                          <p className="font-bold text-yellow-600">{audit.duplicates}</p>
                        </div>
                      </div>

                      {audit.errors.length > 0 && (
                        <div className="mt-3 p-2 bg-red-50 rounded">
                          <p className="text-xs font-semibold text-red-700 mb-1">
                            ⚠️ Errores ({audit.errors.length}):
                          </p>
                          <ul className="text-xs text-red-600 space-y-1">
                            {audit.errors.slice(0, 5).map((err, j) => (
                              <li key={j}>• {err}</li>
                            ))}
                            {audit.errors.length > 5 && (
                              <li className="text-gray-600">... y {audit.errors.length - 5} más</li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}