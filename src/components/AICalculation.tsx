import React, { useState } from 'react';
import calcular from "@/utils/calculos.utils";
import CashFlowGraph from './CashFlowGraph';

type CalculationType = 'valorEnN' | 'tasaInteres' | 'periodosParaMonto' | 'incognitaX';

interface AICalculationProps {
  calculationType: CalculationType;
}

const AICalculation: React.FC<AICalculationProps> = ({ calculationType }) => {
  const [problemDescription, setProblemDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [resultDescription, setResultDescription] = useState("");
  const [resultValue, setResultValue] = useState("");

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      // TODO: Aquí iría la llamada a la API de IA para analizar el texto
      // Por ahora, simularemos una respuesta
      const mockExtractedData = {
        interestRate: 0.05,
        periods: 12,
        cashflows: [
          { n: 0, monto: 1000, tipo: "salida" as const },
          { n: 12, monto: 1200, tipo: "entrada" as const }
        ]
      };

      // Para incognitaX, simular un flujo con monto 0 para la incógnita
      if (calculationType === 'incognitaX') {
        mockExtractedData.cashflows.push({ n: 6, monto: 0, tipo: "entrada" as const });
      }

      setExtractedData(mockExtractedData);

      // Realizar el cálculo con los datos extraídos
      const calculationData = {
        objetivo: calculationType,
        entradas: {
          tasaInteres: mockExtractedData.interestRate,
          periodos: mockExtractedData.periods,
          flujosEfectivo: mockExtractedData.cashflows,
          periodoObjetivo: calculationType === "valorEnN" ? 12 : undefined,
          montoObjetivo: calculationType === "periodosParaMonto" ? 1500 : undefined
        }
      };

      const result = calcular.resolverEcuacionValor(calculationData);
      setResultDescription(result.descripcion);
      setResultValue(result.valor.toString());
    } catch (error) {
      console.error("Error al analizar el problema:", error);
      setResultDescription("Error al analizar el problema");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-center">
          Describe tu problema financiero
        </h3>
        <textarea
          value={problemDescription}
          onChange={(e) => setProblemDescription(e.target.value)}
          className="w-full h-40 p-4 border rounded-lg"
          placeholder="Describe tu problema aquí. Por ejemplo: 'Necesito calcular cuánto tiempo me tomará ahorrar $10,000 si invierto $500 mensuales con una tasa de interés del 5% anual.'"
        />
        <div className="flex justify-center">
          <button
            onClick={handleAnalyze}
            disabled={!problemDescription.trim() || isAnalyzing}
            className="bg-blue-600 text-white py-3 px-10 rounded-md font-medium hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isAnalyzing ? "Analizando..." : "Analizar problema"}
          </button>
        </div>
      </div>

      {extractedData && (
        <div className="space-y-6">
          {/* Gráfica de flujos */}
          {extractedData.cashflows && extractedData.cashflows.length > 0 && (
            <div className="border rounded-lg p-4 bg-white shadow-sm">
              <h3 className="text-lg font-medium text-center mb-4">Gráfica de flujos</h3>
              <CashFlowGraph 
                cashflows={extractedData.cashflows}
                periods={extractedData.periods}
              />
            </div>
          )}

          <div className="p-6 border rounded-lg bg-gray-50">
            <h4 className="text-lg font-medium mb-4">Datos extraídos</h4>
            <div className="space-y-2">
              {extractedData.interestRate && (
                <p>Tasa de interés: {extractedData.interestRate * 100}%</p>
              )}
              {extractedData.periods && (
                <p>Periodos: {extractedData.periods}</p>
              )}
              {extractedData.cashflows && (
                <div>
                  <p className="font-medium">Flujos de efectivo:</p>
                  <ul className="list-disc pl-5">
                    {extractedData.cashflows.map((flow: any, index: number) => (
                      <li key={index} className="text-sm">
                        Periodo {flow.n}: {flow.tipo === "entrada" ? "+" : "-"}${flow.monto}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {(resultDescription || resultValue) && (
            <div className="p-6 border rounded-lg bg-gray-50">
              <h4 className="text-lg font-medium mb-4">Resultado</h4>
              {resultDescription && (
                <p className="mb-2">{resultDescription}</p>
              )}
              {resultValue && (
                <p className="text-xl font-bold">{resultValue}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AICalculation; 