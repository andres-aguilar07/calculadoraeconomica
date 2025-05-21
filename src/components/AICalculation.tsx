import React, { useState } from 'react';
import calcular from "@/utils/calculos.utils";
import { ObjetivoCalculo } from "@/utils/calculos.utils";
import CashFlowGraph from './CashFlowGraph';

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
  monto: number | string;
  tipo: "entrada" | "salida";
}

interface ExtractedData {
  // Datos comunes para todos los tipos de cálculo
  interestRate?: number;
  periods?: number;
  cashflows?: CashFlow[];
  
  // Datos específicos para valorEnN
  targetPeriod?: number;
  
  // Datos específicos para periodosParaMonto
  targetAmount?: number;
  
  // Datos específicos para incognitaX
  focalPoint?: number;
  
  // Datos específicos para series uniformes
  annuityType?: "vencida" | "anticipada";
  initialPeriod?: number;
  finalPeriod?: number;
  aValue?: number;
  pValue?: number;
  fValue?: number;
  seriesCalculationType?: "A" | "P" | "F";
}

interface AICalculationProps {
  calculationType: CalculationType;
}

const AICalculation: React.FC<AICalculationProps> = ({ calculationType }) => {
  const [problemDescription, setProblemDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [resultDescription, setResultDescription] = useState("");
  const [resultValue, setResultValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [retryAttempt, setRetryAttempt] = useState(0);

  const getPromptForCalculationType = (type: CalculationType, problemText: string): string => {
    let basePrompt = `Analiza el siguiente problema financiero y extrae los datos relevantes. NO resuelvas el problema, solo extrae los datos en formato JSON. `;
    
    // Instrucciones específicas según el tipo de cálculo
    switch (type) {
      case 'valorEnN':
        basePrompt += `Necesito calcular el valor en un periodo específico.
        El JSON debe incluir:
        {
          "interestRate": número (tasa de interés en decimal),
          "periods": número (número total de periodos),
          "cashflows": [
            {
              "n": número (periodo),
              "monto": número (cantidad),
              "tipo": "entrada" o "salida"
            }
          ],
          "targetPeriod": número (periodo específico en el que se desea calcular el valor)
        }`;
        break;
        
      case 'tasaInteres':
        basePrompt += `Necesito calcular la tasa de interés.
        El JSON debe incluir:
        {
          "periods": número (número total de periodos),
          "cashflows": [
            {
              "n": número (periodo),
              "monto": número (cantidad),
              "tipo": "entrada" o "salida"
            }
          ]
        }`;
        break;
        
      case 'periodosParaMonto':
        basePrompt += `Necesito calcular cuántos periodos se necesitan para alcanzar un monto objetivo.
        El JSON debe incluir:
        {
          "interestRate": número (tasa de interés en decimal),
          "cashflows": [
            {
              "n": número (periodo),
              "monto": número (cantidad),
              "tipo": "entrada" o "salida"
            }
          ],
          "targetAmount": número (monto objetivo a alcanzar)
        }`;
        break;
        
      case 'incognitaX':
        basePrompt += `Necesito encontrar el valor de una incógnita X en flujos de efectivo.
        El JSON debe incluir:
        {
          "interestRate": número (tasa de interés en decimal),
          "cashflows": [
            {
              "n": número (periodo),
              "monto": número o string (puede ser "x", "2x", etc. para representar la incógnita),
              "tipo": "entrada" o "salida"
            }
          ],
          "focalPoint": número (punto focal para el cálculo, generalmente periodo 0)
        }
        Siempre debe haber al menos un flujo que contenga "x" en su monto.`;
        break;
        
      case 'seriesUniformes':
        basePrompt += `Necesito resolver una serie uniforme (anualidad).
        El JSON debe incluir:
        {
          "interestRate": número (tasa de interés en decimal),
          "annuityType": "vencida" o "anticipada" (tipo de anualidad),
          "initialPeriod": número (periodo inicial, generalmente 1),
          "finalPeriod": número (periodo final),
          "seriesCalculationType": "A", "P" o "F" (qué valor calcular: A=anualidad, P=presente, F=futuro),
          "aValue": número (valor de la anualidad A, si se conoce),
          "pValue": número (valor presente P, si se conoce),
          "fValue": número (valor futuro F, si se conoce)
        }
        NOTA: Dependiendo de qué valor se desea calcular, se deben proporcionar los otros valores.
        Para calcular A, se necesita P o F. Para calcular P, se necesita A. Para calcular F, se necesita A.`;
        break;
    }
    
    basePrompt += `
    
    Problema: ${problemText}
    
    Responde SOLO con el JSON, sin texto adicional. Si algún dato no está explícito en el problema, usa valores razonables basados en el contexto. Si no puedes determinar algún valor, omítelo del JSON.`;
    
    return basePrompt;
  };

  const analyzeWithGemini = async (problemText: string, attempt: number = 1): Promise<ExtractedData> => {
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("API key no configurada. Por favor, configura VITE_GEMINI_API_KEY en el archivo .env");
      }

      const promptText = getPromptForCalculationType(calculationType, problemText);
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: promptText
                }
              ]
            }
          ]
        })
      });

      if (!response.ok) {
        const errorDetail = await response.text();
        throw new Error(`Error en la API de Gemini (${response.status}): ${errorDetail}`);
      }

      const data = await response.json();
      
      // Extraer el texto de la respuesta
      const responseText = data.candidates[0].content.parts[0].text;
      
      try {
        // Buscar el JSON en la respuesta
        const jsonMatch = responseText.match(/```json\n([\s\S]*)\n```/) || 
                          responseText.match(/```\n([\s\S]*)\n```/) || 
                          responseText.match(/\{[\s\S]*\}/);
        
        let jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : responseText;
        
        // Limpiar el string JSON de posibles comentarios o texto adicional
        jsonString = jsonString.replace(/```json|```/g, '').trim();
        
        // Parse the JSON response
        const parsedData = JSON.parse(jsonString) as ExtractedData;
        
        // Procesamiento adicional para casos específicos
        if (calculationType === 'incognitaX' && parsedData.cashflows) {
          // Asegurarse de que al menos un flujo tenga 'x' en su monto
          const hasXFlow = parsedData.cashflows.some(flow => 
            typeof flow.monto === 'string' && flow.monto.toLowerCase().includes('x')
          );
          
          if (!hasXFlow) {
            // Si no hay flujos con X, convertir el primer flujo a tener X
            if (parsedData.cashflows.length > 0) {
              parsedData.cashflows[0].monto = "x";
            } else {
              // Si no hay flujos, crear uno con X
              parsedData.cashflows = [
                { n: 0, monto: "x", tipo: "entrada" }
              ];
            }
          }
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
      
      throw error;
    }
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setError(null);
    setRetryAttempt(0);
    
    try {
      // Llamar a la API de Gemini para analizar el texto
      const extractedData = await analyzeWithGemini(problemDescription);
      setExtractedData(extractedData);

      // Realizar el cálculo con los datos extraídos
      calculateResult(extractedData);
      
    } catch (error: any) {
      console.error("Error al analizar el problema:", error);
      let errorMessage = "Error al analizar el problema";
      
      if (error instanceof Error) {
        if (error.message.includes('429') || error.message.includes('RATE_LIMIT')) {
          errorMessage = "Límite de solicitudes excedido. Por favor, intenta más tarde.";
        } else if (error.message.includes('API key')) {
          errorMessage = "Error de configuración: API key no configurada correctamente.";
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const calculateResult = (data: ExtractedData) => {
    try {
      // Preparar los datos según el tipo de cálculo
      let calculationData;
      
      switch(calculationType) {
        case 'valorEnN':
          calculationData = {
            objetivo: calculationType as ObjetivoCalculo,
            entradas: {
              tasaInteres: data.interestRate,
              flujosEfectivo: data.cashflows,
              periodoObjetivo: data.targetPeriod || 0,
              periodos: data.periods
            }
          };
          break;
          
        case 'tasaInteres':
          calculationData = {
            objetivo: calculationType as ObjetivoCalculo,
            entradas: {
              flujosEfectivo: data.cashflows,
              periodos: data.periods || (data.cashflows ? Math.max(...data.cashflows.map(f => f.n)) + 1 : 12)
            }
          };
          break;
          
        case 'periodosParaMonto':
          calculationData = {
            objetivo: calculationType as ObjetivoCalculo,
            entradas: {
              tasaInteres: data.interestRate,
              flujosEfectivo: data.cashflows,
              montoObjetivo: data.targetAmount
            }
          };
          break;
          
        case 'incognitaX':
          calculationData = {
            objetivo: calculationType as ObjetivoCalculo,
            entradas: {
              tasaInteres: data.interestRate,
              flujosEfectivo: data.cashflows,
              puntoFocal: data.focalPoint || 0
            }
          };
          break;
          
        case 'seriesUniformes':
          calculationData = {
            objetivo: calculationType as ObjetivoCalculo,
            entradas: {
              tasaInteres: data.interestRate,
              tipoAnualidad: data.annuityType || 'vencida',
              periodoInicial: data.initialPeriod || 1,
              periodoFinal: data.finalPeriod || 10,
              valorA: data.aValue,
              valorP: data.pValue,
              valorF: data.fValue,
              calcularEnSeries: data.seriesCalculationType || 'A'
            }
          };
          break;
      }
      
      if (calculationData) {
        const result = calcular.resolverEcuacionValor(calculationData);
        setResultDescription(result.descripcion);
        setResultValue(result.valor.toString());
      }
    } catch (error: any) {
      console.error("Error al calcular:", error);
      setError(`Error en el cálculo: ${error.message}`);
    }
  };

  const renderExtractedDataForm = () => {
    if (!extractedData) return null;
    
    const updateCashflow = (index: number, field: keyof CashFlow, value: any) => {
      if (!extractedData || !extractedData.cashflows) return;
      
      const newCashflows = [...extractedData.cashflows];
      newCashflows[index] = { ...newCashflows[index], [field]: value };
      
      setExtractedData({
        ...extractedData,
        cashflows: newCashflows
      });
    };
    
    const addCashflow = () => {
      if (!extractedData) return;
      
      const newCashflows = [...(extractedData.cashflows || [])];
      const lastPeriod = newCashflows.length > 0 ? Math.max(...newCashflows.map(f => f.n)) + 1 : 1;
      
      newCashflows.push({
        n: lastPeriod,
        monto: 100,
        tipo: "entrada"
      });
      
      setExtractedData({
        ...extractedData,
        cashflows: newCashflows
      });
    };
    
    const removeCashflow = (index: number) => {
      if (!extractedData || !extractedData.cashflows) return;
      
      const newCashflows = extractedData.cashflows.filter((_, i) => i !== index);
      
      setExtractedData({
        ...extractedData,
        cashflows: newCashflows
      });
    };
    
    return (
      <div className="p-6 border rounded-lg bg-gray-50">
        <h4 className="text-lg font-medium mb-4">Datos extraídos</h4>
        <div className="space-y-4">
          {/* Campos comunes para todos los tipos de cálculo */}
          {calculationType !== 'tasaInteres' && (
            <div className="flex items-center mb-2">
              <div className="w-1/3">
                <p className="font-medium">Tasa de interés:</p>
              </div>
              <div className="w-2/3">
                <input 
                  type="number" 
                  step="0.01"
                  value={extractedData.interestRate ? extractedData.interestRate * 100 : ''}
                  onChange={(e) => {
                    setExtractedData({
                      ...extractedData,
                      interestRate: parseFloat(e.target.value) / 100
                    });
                  }}
                  className="px-2 py-1 border rounded w-24 text-right"
                  placeholder="0"
                />
                <span className="ml-1">%</span>
              </div>
            </div>
          )}
          
          {/* Campos específicos según el tipo de cálculo */}
          {calculationType === 'valorEnN' && (
            <div className="flex items-center mb-2">
              <div className="w-1/3">
                <p className="font-medium">Periodo objetivo:</p>
              </div>
              <div className="w-2/3">
                <input 
                  type="number"
                  value={extractedData.targetPeriod || ''}
                  onChange={(e) => {
                    setExtractedData({
                      ...extractedData,
                      targetPeriod: parseInt(e.target.value)
                    });
                  }}
                  className="px-2 py-1 border rounded w-24 text-right"
                  placeholder="0"
                />
              </div>
            </div>
          )}
          
          {calculationType === 'periodosParaMonto' && (
            <div className="flex items-center mb-2">
              <div className="w-1/3">
                <p className="font-medium">Monto objetivo:</p>
              </div>
              <div className="w-2/3">
                <input 
                  type="number"
                  value={extractedData.targetAmount || ''}
                  onChange={(e) => {
                    setExtractedData({
                      ...extractedData,
                      targetAmount: parseFloat(e.target.value)
                    });
                  }}
                  className="px-2 py-1 border rounded w-24 text-right"
                  placeholder="0"
                />
              </div>
            </div>
          )}
          
          {calculationType === 'incognitaX' && (
            <div className="flex items-center mb-2">
              <div className="w-1/3">
                <p className="font-medium">Punto focal:</p>
              </div>
              <div className="w-2/3">
                <input 
                  type="number"
                  value={extractedData.focalPoint !== undefined ? extractedData.focalPoint : '0'}
                  onChange={(e) => {
                    setExtractedData({
                      ...extractedData,
                      focalPoint: parseInt(e.target.value)
                    });
                  }}
                  className="px-2 py-1 border rounded w-24 text-right"
                  placeholder="0"
                />
              </div>
            </div>
          )}
          
          {calculationType === 'seriesUniformes' && (
            <>
              <div className="flex items-center mb-2">
                <div className="w-1/3">
                  <p className="font-medium">Tipo de anualidad:</p>
                </div>
                <div className="w-2/3">
                  <select
                    value={extractedData.annuityType || 'vencida'}
                    onChange={(e) => {
                      setExtractedData({
                        ...extractedData,
                        annuityType: e.target.value as "vencida" | "anticipada"
                      });
                    }}
                    className="px-2 py-1 border rounded"
                  >
                    <option value="vencida">Vencida</option>
                    <option value="anticipada">Anticipada</option>
                  </select>
                </div>
              </div>
              
              <div className="flex items-center mb-2">
                <div className="w-1/3">
                  <p className="font-medium">Periodo inicial:</p>
                </div>
                <div className="w-2/3">
                  <input 
                    type="number"
                    value={extractedData.initialPeriod || '1'}
                    onChange={(e) => {
                      setExtractedData({
                        ...extractedData,
                        initialPeriod: parseInt(e.target.value)
                      });
                    }}
                    className="px-2 py-1 border rounded w-24 text-right"
                  />
                </div>
              </div>
              
              <div className="flex items-center mb-2">
                <div className="w-1/3">
                  <p className="font-medium">Periodo final:</p>
                </div>
                <div className="w-2/3">
                  <input 
                    type="number"
                    value={extractedData.finalPeriod || '10'}
                    onChange={(e) => {
                      setExtractedData({
                        ...extractedData,
                        finalPeriod: parseInt(e.target.value)
                      });
                    }}
                    className="px-2 py-1 border rounded w-24 text-right"
                  />
                </div>
              </div>
              
              <div className="flex items-center mb-2">
                <div className="w-1/3">
                  <p className="font-medium">Calcular:</p>
                </div>
                <div className="w-2/3">
                  <select
                    value={extractedData.seriesCalculationType || 'A'}
                    onChange={(e) => {
                      setExtractedData({
                        ...extractedData,
                        seriesCalculationType: e.target.value as "A" | "P" | "F"
                      });
                    }}
                    className="px-2 py-1 border rounded"
                  >
                    <option value="A">Valor de la anualidad (A)</option>
                    <option value="P">Valor presente (P)</option>
                    <option value="F">Valor futuro (F)</option>
                  </select>
                </div>
              </div>
              
              {(extractedData.seriesCalculationType === 'P' || extractedData.seriesCalculationType === 'F' || !extractedData.seriesCalculationType) && (
                <div className="flex items-center mb-2">
                  <div className="w-1/3">
                    <p className="font-medium">Valor de anualidad (A):</p>
                  </div>
                  <div className="w-2/3">
                    <input 
                      type="number"
                      value={extractedData.aValue || ''}
                      onChange={(e) => {
                        setExtractedData({
                          ...extractedData,
                          aValue: parseFloat(e.target.value)
                        });
                      }}
                      className="px-2 py-1 border rounded w-24 text-right"
                      placeholder="0"
                    />
                  </div>
                </div>
              )}
              
              {extractedData.seriesCalculationType === 'A' && (
                <>
                  <div className="flex items-center mb-2">
                    <div className="w-1/3">
                      <p className="font-medium">Valor presente (P):</p>
                    </div>
                    <div className="w-2/3">
                      <input 
                        type="number"
                        value={extractedData.pValue || ''}
                        onChange={(e) => {
                          setExtractedData({
                            ...extractedData,
                            pValue: parseFloat(e.target.value)
                          });
                        }}
                        className="px-2 py-1 border rounded w-24 text-right"
                        placeholder="Opcional si se ingresa F"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center mb-2">
                    <div className="w-1/3">
                      <p className="font-medium">Valor futuro (F):</p>
                    </div>
                    <div className="w-2/3">
                      <input 
                        type="number"
                        value={extractedData.fValue || ''}
                        onChange={(e) => {
                          setExtractedData({
                            ...extractedData,
                            fValue: parseFloat(e.target.value)
                          });
                        }}
                        className="px-2 py-1 border rounded w-24 text-right"
                        placeholder="Opcional si se ingresa P"
                      />
                    </div>
                  </div>
                </>
              )}
            </>
          )}
          
          {/* Flujos de efectivo para todos excepto series uniformes */}
          {calculationType !== 'seriesUniformes' && (
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
                    {extractedData.cashflows && extractedData.cashflows.map((flow, index) => (
                      <tr key={index}>
                        <td className="px-3 py-2 whitespace-nowrap text-sm">
                          <input 
                            type="number" 
                            value={flow.n} 
                            onChange={(e) => updateCashflow(index, "n", parseInt(e.target.value))}
                            className="px-2 py-1 border rounded w-16 text-right"
                          />
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm">
                          <select 
                            value={flow.tipo} 
                            onChange={(e) => updateCashflow(index, "tipo", e.target.value as "entrada" | "salida")}
                            className="px-2 py-1 border rounded"
                          >
                            <option value="entrada">Entrada</option>
                            <option value="salida">Salida</option>
                          </select>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm">
                          <div className="flex items-center">
                            {calculationType !== 'incognitaX' ? (
                              <>
                                <span className="mr-1">$</span>
                                <input 
                                  type="number" 
                                  value={typeof flow.monto === 'number' ? flow.monto : ''}
                                  onChange={(e) => updateCashflow(index, "monto", parseFloat(e.target.value))}
                                  className="px-2 py-1 border rounded w-24 text-right"
                                />
                              </>
                            ) : (
                              <input 
                                type="text" 
                                value={flow.monto.toString()}
                                onChange={(e) => updateCashflow(index, "monto", e.target.value)}
                                className="px-2 py-1 border rounded w-24 text-right"
                                placeholder="Ej: x, 2x, x/5"
                              />
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-right">
                          <button 
                            onClick={() => removeCashflow(index)}
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
                    onClick={addCashflow}
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
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-center">
          Describe tu problema financiero
        </h3>
        
        {error && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Aviso: </strong>
            <span className="block sm:inline">{error}</span>
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
      </div>

      {extractedData && (
        <div className="space-y-6">
          {/* Gráfica de flujos */}
          {extractedData.cashflows && extractedData.cashflows.length > 0 && calculationType !== 'seriesUniformes' && (
            <div className="border rounded-lg p-4 bg-white shadow-sm">
              <h3 className="text-lg font-medium text-center mb-4">Gráfica de flujos</h3>
              <CashFlowGraph 
                cashflows={extractedData.cashflows}
                periods={extractedData.periods}
                targetPeriod={calculationType === "valorEnN" ? extractedData.targetPeriod : undefined}
                focalPoint={calculationType === "incognitaX" ? extractedData.focalPoint : undefined}
              />
            </div>
          )}

          {renderExtractedDataForm()}

          <div className="flex justify-center">
            <button
              onClick={() => calculateResult(extractedData)}
              className="bg-green-600 text-white py-2 px-6 rounded-md font-medium hover:bg-green-700"
            >
              Calcular
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