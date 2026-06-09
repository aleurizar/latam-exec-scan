// ============================================================================
// MAIN DASHBOARD - Scoring Motor Control Center
// ============================================================================
// Archivo: src/pages/ScoringDashboard.tsx

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScoringAdminPanel } from '@/components/admin/ScoringAdminPanel';
import { ScoringCommercialPanel } from '@/components/commercial/ScoringCommercialPanel';

export function ScoringDashboard() {
  const [activeTab, setActiveTab] = useState('commercial');
  const [motorStatus, setMotorStatus] = useState({
    isRunning: false,
    lastRun: '2026-06-08 14:30:00',
    nextScheduled: '2026-06-09 02:00:00',
    recordsProcessed: 245,
    recordsReady: 89,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* HEADER */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">⚡ Motor de Calificación</h1>
              <p className="text-sm text-slate-600 mt-1">
                Pipeline de enriquecimiento y scoring para sellers MercadoLibre
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-700">Estado Motor</p>
                <Badge className={motorStatus.isRunning ? 'bg-green-500' : 'bg-blue-500'}>
                  {motorStatus.isRunning ? '🟢 Ejecutando' : '🔵 Inactivo'}
                </Badge>
              </div>

              <Button
                onClick={() => setMotorStatus({ ...motorStatus, isRunning: !motorStatus.isRunning })}
              >
                {motorStatus.isRunning ? '⏸️ Pausar' : '▶️ Ejecutar'}
              </Button>
            </div>
          </div>

          {/* STATS */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
              <p className="text-xs text-blue-600 font-semibold">REGISTROS PROCESADOS</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">{motorStatus.recordsProcessed}</p>
              <p className="text-xs text-blue-600 mt-2">en esta corrida</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
              <p className="text-xs text-green-600 font-semibold">READY TO OUTREACH</p>
              <p className="text-2xl font-bold text-green-900 mt-1">{motorStatus.recordsReady}</p>
              <p className="text-xs text-green-600 mt-2">ALTO + MEDIO</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg">
              <p className="text-xs text-purple-600 font-semibold">ÚLTIMA EJECUCIÓN</p>
              <p className="text-sm font-bold text-purple-900 mt-1">{motorStatus.lastRun}</p>
              <p className="text-xs text-purple-600 mt-2">UTC-3</p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg">
              <p className="text-xs text-orange-600 font-semibold">PRÓXIMA EJECUCIÓN</p>
              <p className="text-sm font-bold text-orange-900 mt-1">{motorStatus.nextScheduled}</p>
              <p className="text-xs text-orange-600 mt-2">automática</p>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-white shadow-sm">
            <TabsTrigger value="commercial" className="text-base">
              📊 Panel Comercial
            </TabsTrigger>
            <TabsTrigger value="admin" className="text-base">
              ⚙️ Admin (Config)
            </TabsTrigger>
            <TabsTrigger value="logs" className="text-base">
              📋 Logs & Auditoría
            </TabsTrigger>
          </TabsList>

          {/* COMMERCIAL TAB */}
          <TabsContent value="commercial" className="mt-6">
            <ScoringCommercialPanel />
          </TabsContent>

          {/* ADMIN TAB */}
          <TabsContent value="admin" className="mt-6">
            <ScoringAdminPanel />
          </TabsContent>

          {/* LOGS TAB */}
          <TabsContent value="logs" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>📋 Logs de Ejecución</CardTitle>
                <CardDescription>Auditoría de corridas y cambios de configuración</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-green-50 border border-green-200 rounded">
                    <p className="text-sm font-semibold">✓ Motor ejecutado exitosamente</p>
                    <p className="text-xs text-gray-600">
                      2026-06-08 14:30:00 - 245 registros procesados, 89 ALTO/MEDIO
                    </p>
                  </div>

                  <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-sm font-semibold">⚙️ Config actualizada: v1 → v2</p>
                    <p className="text-xs text-gray-600">
                      2026-06-08 12:15:00 - Pesos ajustados: Contactabilidad 35% → 40%
                    </p>
                  </div>

                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-sm font-semibold">⚠️ Gate ejecutado: GATE_BAJA_RELEVANCIA</p>
                    <p className="text-xs text-gray-600">
                      2026-06-08 14:30:45 - 12 registros bajados a BAJO
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* FOOTER */}
      <div className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <p>Motor de Calificación v1 | Foxie Project</p>
            <p>
              Última sincronización: 2026-06-08 14:30:00 |{' '}
              <a href="#" className="text-blue-600 hover:underline">
                Ver documentación
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
