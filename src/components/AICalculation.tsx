import React, { useState, useEffect } from 'react';
import calcular from "@/utils/calculos.utils";
import { ObjetivoCalculo } from "@/utils/calculos.utils";
import CashFlowGraph from './CashFlowGraph';
import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

// Función de espera
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Configuración de reintentos
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 5000; // 5 segundos
const MAX_RETRY_DELAY = 30000; // 30 segundos
const BACKOFF_FACTOR = 2;

// Función para calcular el tiempo de espera exponencial con jitter
const getRetryDelay = (attempt: number): number => {
  const baseDelay = Math.min(
    INITIAL_RETRY_DELAY * Math.pow(BACKOFF_FACTOR, attempt - 1),
    MAX_RETRY_DELAY
  );
  // Añadir jitter (variación aleatoria) para evitar sincronización de reintentos
  const jitter = Math.random() * 0.3 * baseDelay;
  return baseDelay + jitter;
};

type CalculationType = 'valorEnN' | 'tasaInteres' | 'periodosParaMonto' | 'incognitaX' | 'seriesUniformes';

interface CashFlow {
  n: number;
  monto: number;
  tipo: "entrada" | "salida";
}

interface ExtractedData {
  interestRate: number;
  periods: number;
  cashflows: CashFlow[];
}

interface AICalculationProps {
  calculationType: CalculationType;
}

// Fallback para análisis local (sin API)
const analyzeLocalFallback = (problemText: string): ExtractedData => {
  // Implementación básica para extraer datos del texto
  // Esta es una implementación simple que intenta extraer patrones comunes
  
  let interestRate = 0.05; // Default: 5%
  let periods = 12; // Default: 12 meses
  let cashflows: CashFlow[] = [];
  
  // Buscar porcentajes
  const percentMatch = problemText.match(/(\d+(\.\d+)?)(\s*)(%)/);
  if (percentMatch) {
    interestRate = parseFloat(percentMatch[1]) / 100;
  }
  
  // Buscar periodos/meses/años
  const periodMatch = 
    problemText.match(/(\d+)(\s*)(meses|mes|años|año|periodos|periodo)/i) || 
    problemText.match(/durante(\s*)(\d+)(\s*)(meses|mes|años|año|periodos|periodo)/i);
  
  if (periodMatch) {
    periods = parseInt(periodMatch[1] || periodMatch[2]);
    // Convertir años a meses si es necesario
    if (periodMatch[0].toLowerCase().includes('año')) {
      periods *= 12;
    }
  }
  
  // Buscar montos/flujos
  const montoMatches = problemText.match(/\$(\d+([,\.]\d+)?)/g);
  if (montoMatches && montoMatches.length > 0) {
    // Asumir que el primer monto es una entrada
    cashflows.push({
      n: 0,
      monto: parseFloat(montoMatches[0].replace(/[\$,]/g, '')),
      tipo: "entrada"
    });
    
    // Si hay otro monto, asumirlo como objetivo o flujo recurrente
    if (montoMatches.length > 1) {
      const secondAmount = parseFloat(montoMatches[1].replace(/[\$,]/g, ''));
      // Si es mayor que el primer monto, probablemente sea un objetivo
      if (secondAmount > cashflows[0].monto) {
        // No añadir flujo
      } else {
        // Probablemente sea un flujo recurrente
        for (let i = 1; i <= periods; i++) {
          cashflows.push({
            n: i,
            monto: secondAmount,
            tipo: "entrada"
          });
        }
      }
    }
  }
  
  return {
    interestRate,
    periods,
    cashflows
  };
};

const AICalculation: React.FC<AICalculationProps> = ({ calculationType }) => {
  const [problemDescription, setProblemDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [resultDescription, setResultDescription] = useState("");
  const [resultValue, setResultValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [currentApiMode, setCurrentApiMode] = useState<'gemini' | 'fallback'>('gemini');
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [useLocalFallback, setUseLocalFallback] = useState(false);
  
  const analyzeWithGemini = async (problemText: string, attempt: number = 1): Promise<ExtractedData> => {
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("API key no configurada. Por favor, configura VITE_GEMINI_API_KEY en el archivo .env");
      }

      const model: GenerativeModel = genAI.getGenerativeModel({ model: "gemini-" });
      
      const promptText = `Analiza el siguiente problema financiero y extrae los datos relevantes en formato JSON. 
      El JSON debe tener la siguiente estructura:
      {
        "interestRate": número (tasa de interés en decimal),
        "periods": número (número de periodos),
        "cashflows": [
          {
            "n": número (periodo),
            "monto": número (cantidad),
            "tipo": "entrada" o "salida"
          }
        ]
      }
      
      Problema: ${problemText}
      
      Responde SOLO con el JSON, sin texto adicional. Si algún dato no está explícito en el problema, usa valores razonables por defecto.`;

      const result = await model.generateContent(promptText);
      const response = await result.response;
      const responseText = response.text();
      
      try {
        // Parse the JSON response
        const parsedData = JSON.parse(responseText) as ExtractedData;
        
        // Validar la estructura de los datos
        if (!parsedData.interestRate || !parsedData.periods || !Array.isArray(parsedData.cashflows)) {
          throw new Error("Formato de respuesta inválido");
        }
        
        return parsedData;
      } catch (parseError) {
        console.error("Error al analizar JSON:", responseText);
        throw new Error("Formato de respuesta inválido del modelo");
      }
    } catch (error: any) {
      console.error(`Intento ${attempt} fallido:`, error);
      
      // Si es un error de límite de cuota y no hemos excedido los reintentos
      if (error instanceof Error && 
          (error.message.includes('429') || error.message.includes('RATE_LIMIT')) && 
          attempt < MAX_RETRIES) {
        
        setRetryAttempt(attempt);
        
        const delay = getRetryDelay(attempt);
        console.log(`Esperando ${Math.round(delay/1000)} segundos antes del siguiente intento...`);
        await sleep(delay);
        return analyzeWithGemini(problemText, attempt + 1);
      }
      
      // Si se agotaron los reintentos o hay otro tipo de error, usar el fallback local
      if (useLocalFallback) {
        console.log("Usando análisis local fallback");
        return analyzeLocalFallback(problemText);
      }
      
      throw error;
    }
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setError(null);
    setRetryAttempt(0);
    setCurrentApiMode('gemini');
    
    try {
      // Llamar a la API de Gemini para analizar el texto o usar fallback
      let extractedData: ExtractedData;
      
      if (useLocalFallback) {
        extractedData = analyzeLocalFallback(problemDescription);
        setCurrentApiMode('fallback');
      } else {
        try {
          extractedData = await analyzeWithGemini(problemDescription);
        } catch (error) {
          console.error("Error con Gemini API, usando fallback:", error);
          extractedData = analyzeLocalFallback(problemDescription);
          setCurrentApiMode('fallback');
        }
      }
      
      setExtractedData(extractedData);

      // Realizar el cálculo con los datos extraídos
      const calculationData = {
        objetivo: calculationType as ObjetivoCalculo,
        entradas: {
          tasaInteres: extractedData.interestRate,
          periodos: extractedData.periods,
          flujosEfectivo: extractedData.cashflows,
          periodoObjetivo: calculationType === "valorEnN" ? 12 : undefined,
          montoObjetivo: calculationType === "periodosParaMonto" ? 1500 : undefined,
          tipoAnualidad: calculationType === "seriesUniformes" ? ("vencida" as "vencida" | "anticipada") : undefined,
          periodoInicial: calculationType === "seriesUniformes" ? 1 : undefined,
          periodoFinal: calculationType === "seriesUniformes" ? 10 : undefined,
          valorA: calculationType === "seriesUniformes" ? 1000 : undefined,
          calcularEnSeries: calculationType === "seriesUniformes" ? ("P" as "A" | "P" | "F") : undefined
        }
      };

      const result = calcular.resolverEcuacionValor(calculationData);
      setResultDescription(result.descripcion);
      setResultValue(result.valor.toString());
    } catch (error: any) {
      console.error("Error al analizar el problema:", error);
      let errorMessage = "Error al analizar el problema";
      
      if (error instanceof Error) {
        if (error.message.includes('429') || error.message.includes('RATE_LIMIT')) {
          errorMessage = "Límite de solicitudes excedido. Hemos cambiado automáticamente al modo de análisis local. Los datos extraídos pueden ser menos precisos.";
          
          // Intentar con fallback local
          try {
            const fallbackData = analyzeLocalFallback(problemDescription);
            setExtractedData(fallbackData);
            setCurrentApiMode('fallback');
            
            // Realizar el cálculo con los datos extraídos
            const calculationData = {
              objetivo: calculationType as ObjetivoCalculo,
              entradas: {
                tasaInteres: fallbackData.interestRate,
                periodos: fallbackData.periods,
                flujosEfectivo: fallbackData.cashflows,
                periodoObjetivo: calculationType === "valorEnN" ? 12 : undefined,
                montoObjetivo: calculationType === "periodosParaMonto" ? 1500 : undefined,
                tipoAnualidad: calculationType === "seriesUniformes" ? ("vencida" as "vencida" | "anticipada") : undefined,
                periodoInicial: calculationType === "seriesUniformes" ? 1 : undefined,
                periodoFinal: calculationType === "seriesUniformes" ? 10 : undefined,
                valorA: calculationType === "seriesUniformes" ? 1000 : undefined,
                calcularEnSeries: calculationType === "seriesUniformes" ? ("P" as "A" | "P" | "F") : undefined
              }
            };

            const result = calcular.resolverEcuacionValor(calculationData);
            setResultDescription(result.descripcion);
            setResultValue(result.valor.toString());
            
            // Actualizar mensaje de error para reflejar que se usó fallback
            errorMessage = "Límite de API excedido. Se han usado técnicas de análisis local para estimar los datos. Por favor, verifica que los valores sean correctos.";
          } catch (fallbackError) {
            errorMessage = "No se pudo analizar el problema ni con API ni con análisis local. Por favor, intenta con una descripción más clara.";
          }
        } else if (error.message.includes('API key')) {
          errorMessage = "Error de configuración: API key no configurada correctamente.";
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }
      
      setError(errorMessage);
      
      if (!extractedData) {
        setResultDescription("Error al analizar el problema");
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleLocalMode = () => {
    setUseLocalFallback(!useLocalFallback);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-center">
          Describe tu problema financiero
        </h3>
        
        <div className="flex justify-end">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Modo de análisis:</span>
            <button 
              onClick={toggleLocalMode}
              className={`px-3 py-1 text-sm rounded-md ${useLocalFallback 
                ? 'bg-gray-200 text-gray-700' 
                : 'bg-blue-100 text-blue-700'}`}
            >
              {useLocalFallback ? 'Local (sin API)' : 'API Gemini'}
            </button>
          </div>
        </div>
        
        {error && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Aviso: </strong>
            <span className="block sm:inline">{error}</span>
            {error.includes('API excedido') && (
              <div className="mt-2 text-sm">
                <p>Para mejorar los resultados:</p>
                <ul className="list-disc pl-5 mt-1">
                  <li>Verifica que los datos extraídos son correctos</li>
                  <li>Ajusta manualmente los valores si es necesario</li>
                  <li>Intenta más tarde cuando los límites de API se restablezcan</li>
                </ul>
              </div>
            )}
          </div>
        )}
        
        <textarea
          value={problemDescription}
          onChange={(e) => setProblemDescription(e.target.value)}
          className="w-full h-40 p-4 border rounded-lg"
          placeholder="Describe tu problema aquí. Por ejemplo: 'Necesito calcular cuánto tiempo me tomará ahorrar $10,000 si invierto $500 mensuales con una tasa de interés del 5% anual.'"
        />
        
        <div className="flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-4">
          <button
            onClick={handleAnalyze}
            disabled={!problemDescription.trim() || isAnalyzing}
            className="bg-blue-600 text-white py-3 px-10 rounded-md font-medium hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center"
          >
            {isAnalyzing ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {retryAttempt > 0 ? `Reintentando (${retryAttempt}/${MAX_RETRIES})...` : "Analizando..."}
              </>
            ) : (
              "Analizar problema"
            )}
          </button>
        </div>
        
        {currentApiMode === 'fallback' && extractedData && (
          <div className="text-center text-sm text-amber-600">
            Análisis realizado en modo local. Los datos pueden requerir ajustes manuales.
          </div>
        )}
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
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-medium">Datos extraídos</h4>
              
              {currentApiMode === 'fallback' && (
                <span className="text-xs px-2 py-1 bg-amber-100 text-amber-800 rounded-full">
                  Análisis local
                </span>
              )}
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center mb-2">
                <div className="w-1/3">
                  <p className="font-medium">Tasa de interés:</p>
                </div>
                <div className="w-2/3">
                  <input 
                    type="number" 
                    step="0.01"
                    value={extractedData.interestRate * 100} 
                    onChange={(e) => {
                      const newData = {...extractedData};
                      newData.interestRate = parseFloat(e.target.value) / 100;
                      setExtractedData(newData);
                    }}
                    className="px-2 py-1 border rounded w-24 text-right"
                  />
                  <span className="ml-1">%</span>
                </div>
              </div>
              
              <div className="flex items-center mb-2">
                <div className="w-1/3">
                  <p className="font-medium">Periodos:</p>
                </div>
                <div className="w-2/3">
                  <input 
                    type="number" 
                    value={extractedData.periods} 
                    onChange={(e) => {
                      const newData = {...extractedData};
                      newData.periods = parseInt(e.target.value);
                      setExtractedData(newData);
                    }}
                    className="px-2 py-1 border rounded w-24 text-right"
                  />
                </div>
              </div>
              
              {extractedData.cashflows && (
                <div>
                  <p className="font-medium mb-2">Flujos de efectivo:</p>
                  <div className="max-h-60 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Periodo</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                          <th className="px-3 py-2"></th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {extractedData.cashflows.map((flow, index) => (
                          <tr key={index}>
                            <td className="px-3 py-2 whitespace-nowrap text-sm">
                              <input 
                                type="number" 
                                value={flow.n} 
                                onChange={(e) => {
                                  const newFlows = [...extractedData.cashflows];
                                  newFlows[index].n = parseInt(e.target.value);
                                  const newData = {...extractedData, cashflows: newFlows};
                                  setExtractedData(newData);
                                }}
                                className="px-2 py-1 border rounded w-16 text-right"
                              />
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm">
                              <select 
                                value={flow.tipo} 
                                onChange={(e) => {
                                  const newFlows = [...extractedData.cashflows];
                                  newFlows[index].tipo = e.target.value as "entrada" | "salida";
                                  const newData = {...extractedData, cashflows: newFlows};
                                  setExtractedData(newData);
                                }}
                                className="px-2 py-1 border rounded"
                              >
                                <option value="entrada">Entrada</option>
                                <option value="salida">Salida</option>
                              </select>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm">
                              <div className="flex items-center">
                                <span className="mr-1">$</span>
                                <input 
                                  type="number" 
                                  value={flow.monto} 
                                  onChange={(e) => {
                                    const newFlows = [...extractedData.cashflows];
                                    newFlows[index].monto = parseFloat(e.target.value);
                                    const newData = {...extractedData, cashflows: newFlows};
                                    setExtractedData(newData);
                                  }}
                                  className="px-2 py-1 border rounded w-24 text-right"
                                />
                              </div>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-right">
                              <button 
                                onClick={() => {
                                  const newFlows = extractedData.cashflows.filter((_, i) => i !== index);
                                  const newData = {...extractedData, cashflows: newFlows};
                                  setExtractedData(newData);
                                }}
                                className="text-red-600 hover:text-red-800"
                              >
                                Eliminar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    
                    <div className="mt-2">
                      <button
                        onClick={() => {
                          const newFlows = [...extractedData.cashflows];
                          const lastPeriod = newFlows.length > 0 ? Math.max(...newFlows.map(f => f.n)) + 1 : 1;
                          newFlows.push({
                            n: lastPeriod,
                            monto: 100,
                            tipo: "entrada"
                          });
                          const newData = {...extractedData, cashflows: newFlows};
                          setExtractedData(newData);
                        }}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        + Añadir flujo
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={() => {
                // Recalcular con los datos actualizados
                const calculationData = {
                  objetivo: calculationType as ObjetivoCalculo,
                  entradas: {
                    tasaInteres: extractedData.interestRate,
                    periodos: extractedData.periods,
                    flujosEfectivo: extractedData.cashflows,
                    periodoObjetivo: calculationType === "valorEnN" ? 12 : undefined,
                    montoObjetivo: calculationType === "periodosParaMonto" ? 1500 : undefined,
                    tipoAnualidad: calculationType === "seriesUniformes" ? ("vencida" as "vencida" | "anticipada") : undefined,
                    periodoInicial: calculationType === "seriesUniformes" ? 1 : undefined,
                    periodoFinal: calculationType === "seriesUniformes" ? 10 : undefined,
                    valorA: calculationType === "seriesUniformes" ? 1000 : undefined,
                    calcularEnSeries: calculationType === "seriesUniformes" ? ("P" as "A" | "P" | "F") : undefined
                  }
                };
                
                const result = calcular.resolverEcuacionValor(calculationData);
                setResultDescription(result.descripcion);
                setResultValue(result.valor.toString());
              }}
              className="bg-green-600 text-white py-2 px-6 rounded-md font-medium hover:bg-green-700"
            >
              Recalcular
            </button>
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