import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/lib/supabase';

interface OutreachRecord {
  id: string;
  empresa_id: string;
  contacto_id_primario?: string;
  score_final_outreach: number;
  clasificacion_final: 'ALTO' | 'MEDIO' | 'BAJO' | 'BÁSICO';
  channel_recomendado: 'email' | 'whatsapp' | 'linkedin' | 'phone';
  ready_to_outreach: boolean;
  priority_rank?: number;
  company_name?: string;
  executive_name?: string;
}

export function ScoringCommercialPanel() {
  const [activeTab, setActiveTab] = useState('outreach');
  const [filtroClasificacion, setFiltroClasificacion] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [outreachData, setOutreachData] = useState<OutreachRecord[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    alto: 0,
    medio: 0,
    bajo: 0,
    basicico: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Query con JOINs a companies y executives
      const { data: outreach, error: outreachError } = await supabase
        .from('registro_final_outreach')
        .select(`
          id,
          empresa_id,
          contacto_id_primario,
          score_final_outreach,
          clasificacion_final,
          channel_recomendado,
          ready_to_outreach,
          priority_rank,
          companies!empresa_id(name),
          executives!contacto_id_primario(full_name)
        `)
        .limit(100);

      if (outreachError) throw outreachError;

      // Mapear datos con nombres
      const enriched = (outreach as any[]).map((record) => ({
        ...record,
        company_name: record.companies?.name || 'N/A',
        executive_name: record.executives?.full_name || 'N/A',
      }));

      setOutreachData(enriched);

      // Calcular stats
      const clasificaciones = enriched.map((r) => r.clasificacion_final);
      setStats({
        total: enriched.length,
        alto: clasificaciones.filter((c) => c === 'ALTO').length,
        medio: clasificaciones.filter((c) => c === 'MEDIO').length,
        bajo: clasificaciones.filter((c) => c === 'BAJO').length,
        basicico: clasificaciones.filter((c) => c === 'BÁSICO').length,
      });
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const getClasificacionColor = (clasificacion: string) => {
    switch (clasificacion) {
      case 'ALTO':
        return 'bg-green-100 text-green-800';
      case 'MEDIO':
        return 'bg-yellow-100 text-yellow-800';
      case 'BAJO':
        return 'bg-orange-100 text-orange-800';
      case 'BÁSICO':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCanalIcon = (canal: string) => {
    switch (canal) {
      case 'email':
        return '✉️';
      case 'whatsapp':
        return '💬';
      case 'linkedin':
        return '🔗';
      case 'phone':
        return '☎️';
      default:
        return '📧';
    }
  };

  const filteredOutreach = outreachData.filter((record) => {
    if (filtroClasificacion === 'all') return true;
    return record.clasificacion_final === filtroClasificacion;
  });

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto p-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-600">Cargando datos de Supabase...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-7xl mx-auto p-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-red-600">Error: {error}</p>
            <div className="mt-4 text-center">
              <Button onClick={loadData}>Reintentar</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>📊 Panel Comercial - Datos en Vivo desde Supabase</CardTitle>
          <CardDescription>
            {filteredOutreach.length} registros encontrados (Total: {outreachData.length})
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-1">
              <TabsTrigger value="outreach">📤 Registro Final (Outreach)</TabsTrigger>
            </TabsList>

            <TabsContent value="outreach" className="space-y-4">
              <div className="flex gap-2 mb-4">
                <Select value={filtroClasificacion} onValueChange={setFiltroClasificacion}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filtrar por clasificación" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="ALTO">ALTO</SelectItem>
                    <SelectItem value="MEDIO">MEDIO</SelectItem>
                    <SelectItem value="BAJO">BAJO</SelectItem>
                    <SelectItem value="BÁSICO">BÁSICO</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={loadData}>🔄 Recargar</Button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Contacto</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Clasificación</TableHead>
                      <TableHead>Canal</TableHead>
                      <TableHead>Ready?</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOutreach.length > 0 ? (
                      filteredOutreach.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-semibold">{row.company_name}</TableCell>
                          <TableCell>{row.executive_name}</TableCell>
                          <TableCell>{row.score_final_outreach.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge className={getClasificacionColor(row.clasificacion_final)}>
                              {row.clasificacion_final}
                            </Badge>
                          </TableCell>
                          <TableCell>{getCanalIcon(row.channel_recomendado)}</TableCell>
                          <TableCell>
                            {row.ready_to_outreach ? (
                              <Badge className="bg-green-100 text-green-800">✓ Sí</Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-800">✗ No</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-gray-500">
                          No hay datos - Inserta registros en Supabase primero
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="grid grid-cols-5 gap-4 mt-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-3xl font-bold">{stats.total}</p>
                      <p className="text-sm text-gray-600">TOTAL</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-green-600">{stats.alto}</p>
                      <p className="text-sm text-gray-600">ALTO</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-yellow-600">{stats.medio}</p>
                      <p className="text-sm text-gray-600">MEDIO</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-orange-600">{stats.bajo}</p>
                      <p className="text-sm text-gray-600">BAJO</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-gray-600">{stats.basicico}</p>
                      <p className="text-sm text-gray-600">BÁSICO</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}