import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { CSVUploadPanel } from './CSVUploadPanel';

interface ScoringConfig {
  // Pesos Empresa
  peso_relevancia_empresa: number;
  peso_confianza_empresa: number;
  peso_contactabilidad_empresa: number;

  // Pesos Contacto
  peso_seniority_contacto: number;
  peso_relevancia_rol_contacto: number;
  peso_contactabilidad_contacto: number;

  // Gates
  gate_contactabilidad_baja: boolean;
  gate_no_canales: boolean;
  gate_baja_relevancia: boolean;
  gate_email_generico: boolean;

  // Umbrales
  umbral_alto: number;
  umbral_medio: number;
  umbral_bajo: number;
}

const defaultConfig: ScoringConfig = {
  peso_relevancia_empresa: 35,
  peso_confianza_empresa: 30,
  peso_contactabilidad_empresa: 35,
  peso_seniority_contacto: 40,
  peso_relevancia_rol_contacto: 35,
  peso_contactabilidad_contacto: 25,
  gate_contactabilidad_baja: true,
  gate_no_canales: true,
  gate_baja_relevancia: true,
  gate_email_generico: true,
  umbral_alto: 80,
  umbral_medio: 60,
  umbral_bajo: 40,
};

export function ScoringAdminPanel() {
  const [activeTab, setActiveTab] = useState('pesos');
  const [config, setConfig] = useState<ScoringConfig>(defaultConfig);

  const handleWeightChange = (key: keyof ScoringConfig, value: number) => {
    setConfig({ ...config, [key]: value });
  };

  const handleGateChange = (key: keyof ScoringConfig, value: boolean) => {
    setConfig({ ...config, [key]: value });
  };

  const handleThresholdChange = (key: keyof ScoringConfig, value: number) => {
    setConfig({ ...config, [key]: value });
  };

  const empresaTotalPeso =
    config.peso_relevancia_empresa +
    config.peso_confianza_empresa +
    config.peso_contactabilidad_empresa;

  const contactoTotalPeso =
    config.peso_seniority_contacto +
    config.peso_relevancia_rol_contacto +
    config.peso_contactabilidad_contacto;

  return (
    <div className="w-full max-w-7xl mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>⚙️ Motor de Calificación - Admin Panel</CardTitle>
          <CardDescription>Configura pesos, gates, umbrales y carga datos</CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="pesos">1. Pesos</TabsTrigger>
              <TabsTrigger value="gates">2. Gates</TabsTrigger>
              <TabsTrigger value="umbrales">3. Umbrales</TabsTrigger>
              <TabsTrigger value="simulacion">4. Simulación</TabsTrigger>
              <TabsTrigger value="historial">5. Historial</TabsTrigger>
              <TabsTrigger value="csv">📤 CSV Upload</TabsTrigger>
            </TabsList>

            {/* TAB 1: PESOS */}
            <TabsContent value="pesos" className="space-y-6">
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-4">Pesos Dimensionales - EMPRESA</h3>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-semibold flex justify-between">
                        <span>Relevancia: {config.peso_relevancia_empresa}%</span>
                      </label>
                      <Slider
                        value={[config.peso_relevancia_empresa]}
                        onValueChange={(value) => handleWeightChange('peso_relevancia_empresa', value[0])}
                        min={0}
                        max={100}
                        step={1}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold flex justify-between">
                        <span>Confianza: {config.peso_confianza_empresa}%</span>
                      </label>
                      <Slider
                        value={[config.peso_confianza_empresa]}
                        onValueChange={(value) => handleWeightChange('peso_confianza_empresa', value[0])}
                        min={0}
                        max={100}
                        step={1}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold flex justify-between">
                        <span>Contactabilidad: {config.peso_contactabilidad_empresa}%</span>
                      </label>
                      <Slider
                        value={[config.peso_contactabilidad_empresa]}
                        onValueChange={(value) => handleWeightChange('peso_contactabilidad_empresa', value[0])}
                        min={0}
                        max={100}
                        step={1}
                        className="w-full"
                      />
                    </div>

                    <p className="text-sm text-gray-600">
                      Total: {empresaTotalPeso}%
                      {empresaTotalPeso !== 100 && (
                        <span className="text-red-600 ml-2">⚠️ Debe ser 100%</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-semibold mb-4">Pesos Dimensionales - CONTACTO</h3>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-semibold flex justify-between">
                        <span>Seniority: {config.peso_seniority_contacto}%</span>
                      </label>
                      <Slider
                        value={[config.peso_seniority_contacto]}
                        onValueChange={(value) => handleWeightChange('peso_seniority_contacto', value[0])}
                        min={0}
                        max={100}
                        step={1}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold flex justify-between">
                        <span>Relevancia Rol: {config.peso_relevancia_rol_contacto}%</span>
                      </label>
                      <Slider
                        value={[config.peso_relevancia_rol_contacto]}
                        onValueChange={(value) => handleWeightChange('peso_relevancia_rol_contacto', value[0])}
                        min={0}
                        max={100}
                        step={1}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold flex justify-between">
                        <span>Contactabilidad: {config.peso_contactabilidad_contacto}%</span>
                      </label>
                      <Slider
                        value={[config.peso_contactabilidad_contacto]}
                        onValueChange={(value) => handleWeightChange('peso_contactabilidad_contacto', value[0])}
                        min={0}
                        max={100}
                        step={1}
                        className="w-full"
                      />
                    </div>

                    <p className="text-sm text-gray-600">
                      Total: {contactoTotalPeso}%
                      {contactoTotalPeso !== 100 && (
                        <span className="text-red-600 ml-2">⚠️ Debe ser 100%</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: GATES */}
            <TabsContent value="gates" className="space-y-4">
              <h3 className="font-semibold mb-4">Reglas de Negocio (Gates)</h3>

              <div className="space-y-4">
                <div className="flex items-center space-x-2 p-3 border rounded">
                  <Checkbox
                    checked={config.gate_contactabilidad_baja}
                    onCheckedChange={(value) =>
                      handleGateChange('gate_contactabilidad_baja', value as boolean)
                    }
                  />
                  <label className="text-sm">
                    <strong>Gate Contactabilidad Baja:</strong> Si score contacto &lt; 60 AND empresa score = 80
                    → máx MEDIO
                  </label>
                </div>

                <div className="flex items-center space-x-2 p-3 border rounded">
                  <Checkbox
                    checked={config.gate_no_canales}
                    onCheckedChange={(value) => handleGateChange('gate_no_canales', value as boolean)}
                  />
                  <label className="text-sm">
                    <strong>Gate Sin Canales:</strong> Si no hay email verificado → máx BAJO
                  </label>
                </div>

                <div className="flex items-center space-x-2 p-3 border rounded">
                  <Checkbox
                    checked={config.gate_baja_relevancia}
                    onCheckedChange={(value) => handleGateChange('gate_baja_relevancia', value as boolean)}
                  />
                  <label className="text-sm">
                    <strong>Gate Baja Relevancia:</strong> Si relevancia empresa &lt; 30 → máx BAJO
                  </label>
                </div>

                <div className="flex items-center space-x-2 p-3 border rounded">
                  <Checkbox
                    checked={config.gate_email_generico}
                    onCheckedChange={(value) => handleGateChange('gate_email_generico', value as boolean)}
                  />
                  <label className="text-sm">
                    <strong>Gate Email Genérico:</strong> Si email genérico + sin website + sin LinkedIn →
                    máx BAJO
                  </label>
                </div>
              </div>
            </TabsContent>

            {/* TAB 3: UMBRALES */}
            <TabsContent value="umbrales" className="space-y-4">
              <h3 className="font-semibold mb-4">Umbrales de Clasificación (Read-Only)</h3>

              <div className="space-y-4 bg-gray-50 p-4 rounded">
                <div>
                  <label className="text-sm font-semibold">
                    ALTO: ≥ {config.umbral_alto} puntos
                  </label>
                  <p className="text-xs text-gray-600">Registro validado, relevante y listo para acción</p>
                </div>

                <div>
                  <label className="text-sm font-semibold">
                    MEDIO: {config.umbral_medio} - {config.umbral_alto - 1} puntos
                  </label>
                  <p className="text-xs text-gray-600">Potencial comercial con información parcial</p>
                </div>

                <div>
                  <label className="text-sm font-semibold">
                    BAJO: {config.umbral_bajo} - {config.umbral_medio - 1} puntos
                  </label>
                  <p className="text-xs text-gray-600">Baja capacidad de contacto o información insuficiente</p>
                </div>

                <div>
                  <label className="text-sm font-semibold">
                    BÁSICO: &lt; {config.umbral_bajo} puntos
                  </label>
                  <p className="text-xs text-gray-600">Información mínima disponible</p>
                </div>
              </div>
            </TabsContent>

            {/* TAB 4: SIMULACIÓN */}
            <TabsContent value="simulacion" className="space-y-4">
              <div className="p-4 bg-blue-50 rounded border border-blue-200">
                <p className="text-sm text-blue-800">
                  Sube un CSV de test para simular el scoring con la configuración actual
                </p>
              </div>
            </TabsContent>

            {/* TAB 5: HISTORIAL */}
            <TabsContent value="historial" className="space-y-4">
              <div className="p-4 bg-gray-50 rounded">
                <p className="text-sm text-gray-600">
                  Historial de cambios de configuración (próximamente)
                </p>
              </div>
            </TabsContent>

            {/* TAB 6: CSV UPLOAD */}
            <TabsContent value="csv" className="space-y-4">
              <CSVUploadPanel />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}