import React, { useState } from 'react';
import calcular from "@/utils/calculos.utils";
import CashFlowGraph from './CashFlowGraph';
import convertInterestRate from '@/utils/conversor-tasa.utils';

type ObjetivoCalculo = 'valorEnN' | 'tasaInteres' | 'periodosParaMonto' | 'incognitaX';

interface ManualCalculationProps {
  calculationType: ObjetivoCalculo;
}

const ManualCalculation: React.FC<ManualCalculationProps> = ({ calculationType }) => {
  // Data selection state
  const [selectedInputs, setSelectedInputs] = useState({
    interestRate: false,
    periods: false,
    cashflows: false,
    montoObjetivo: false
  });
  
  // Data values state
  const [interestRate, setInterestRate] = useState<string>("");
  const [periods, setPeriods] = useState<string>("");
  const [flujos, setFlujos] = useState<Array<{ n: number; monto: number | string; tipo: "entrada" | "salida" }>>([]);

  // * TASA DE INTERES
  const [periodoPago, setPeriodoPago] = useState<string>("anual");
  const [periodoCapitalizacion, setPeriodoCapitalizacion] = useState<string>("anual");
  const [formaPago, setFormaPago] = useState<string>("vencida");

  // * PERIODOS
  const [periodicidad, setPeriodicidad] = useState<string>("mensual");
  
  // Additional inputs for specific calculations
  const [targetPeriod, setTargetPeriod] = useState<string>("");
  const [montoObjetivo, setMontoObjetivo] = useState<string>("");
  const [puntoFocal, setPuntoFocal] = useState<string>("0");

  // Result state
  const [resultDescription, setResultDescription] = useState<string>("");
  const [resultValue, setResultValue] = useState<string>("");

  const agregarFlujo = () => {
    // Add new cash flow without sorting
    setFlujos([...flujos, { n: 0, monto: 0, tipo: "entrada" as "entrada" | "salida" }]);
  };

  const actualizarFlujo = (index: number, field: keyof typeof flujos[0], value: any) => {
    const newFlujos = [...flujos];
    
    // Para el campo monto, si estamos en el modo incognitaX y el valor es una cadena,
    // permitimos que sea una expresión como "x", "2x", "x/5", etc.
    if (field === "monto" && calculationType === "incognitaX" && typeof value === "string") {
      // Actualizamos directamente sin convertir a número
      newFlujos[index] = { ...newFlujos[index], [field]: value };
    } else {
      // Comportamiento normal para otros campos o modos
      newFlujos[index] = { ...newFlujos[index], [field]: value };
    }
    
    setFlujos(newFlujos);
  };

  const eliminarFlujo = (index: number) => {
    setFlujos(flujos.filter((_, i) => i !== index));
  };
  
  const agregarFlujoIncognita = () => {
    // Add a new cash flow with "x" to represent the X incognita
    setFlujos([...flujos, { n: 0, monto: "x", tipo: "entrada" as "entrada" | "salida" }]);
    // Also make sure cashflows are selected
    if (!selectedInputs.cashflows) {
      setSelectedInputs({
        ...selectedInputs,
        cashflows: true
      });
    }
  };
  
  const handleCheckboxChange = (input: keyof typeof selectedInputs) => {
    setSelectedInputs({
      ...selectedInputs,
      [input]: !selectedInputs[input]
    });
    
    if (input === 'cashflows' && !selectedInputs.cashflows && flujos.length === 0) {
      agregarFlujo();
    }
  };
  
  const containsXExpression = (str: string | number): boolean => {
    if (typeof str !== 'string') return false;
    return str.toLowerCase().includes('x');
  };

  const hasFlujosConX = (): boolean => {
    return flujos.some(flujo => {
      return typeof flujo.monto === 'string' && containsXExpression(flujo.monto);
    });
  };
  
  const handleCalculate = () => {
    // Sort the cash flows by period before calculation
    if (selectedInputs.cashflows && flujos.length > 0) {
      const sortedFlujos = [...flujos].sort((a, b) => a.n - b.n);
      setFlujos(sortedFlujos);
    }
    
    let tasaInteresCalculos = selectedInputs.interestRate ? parseFloat(interestRate) : undefined;
    
    // Si tenemos tasa de interés y períodos seleccionados, convertimos la tasa
    if (selectedInputs.interestRate && selectedInputs.periods) {
      // Convertir la tasa a tasa periódica vencida según la periodicidad de n
      const fromType = formaPago === "vencida" ? 
        (periodoPago === periodoCapitalizacion ? "iev" : "Tnv") : 
        (periodoPago === periodoCapitalizacion ? "iea" : "Tna");
      
      // Convertir a tasa periódica vencida según periodicidad de n
      tasaInteresCalculos = convertInterestRate({
        valor: parseFloat(interestRate),
        tipoOrigen: fromType as any,
        periodoPagoOrigen: periodoPago as any,
        periodoCapitalizacionOrigen: periodoCapitalizacion as any,
        tipoDestino: "iev" as any, // Siempre queremos tasa periódica vencida
        periodoPagoDestino: periodicidad as any,
        periodoCapitalizacionDestino: periodicidad as any // Igualamos PC con PP en destino para tasa periódica
      });

      console.log("tasaInteresCalculos: ", tasaInteresCalculos);
    }
    
    const datosCalculo = {
      objetivo: calculationType,
      entradas: {
        tasaInteres: tasaInteresCalculos,
        periodos: selectedInputs.periods ? parseInt(periods) : undefined,
        flujosEfectivo: selectedInputs.cashflows ? flujos.map(f => ({
          n: f.n,
          monto: f.monto,
          tipo: f.tipo
        })) : undefined,
        periodoObjetivo: calculationType === "valorEnN" ? parseInt(targetPeriod) : undefined,
        montoObjetivo: calculationType === "periodosParaMonto" ? parseFloat(montoObjetivo) : undefined,
        puntoFocal: calculationType === "incognitaX" ? parseInt(puntoFocal) : undefined
      }
    };
    
    const resultado = calcular.resolverEcuacionValor(datosCalculo);

    console.log("resultado: ", resultado);

    setResultDescription(resultado.descripcion);
    setResultValue(resultado.valor.toString());
  };

  const botonCalcularDisabled =
    // !selectedInputs.interestRate ||
    !selectedInputs.cashflows ||
    flujos.length === 0 ||
    (calculationType === "valorEnN" && !targetPeriod) ||
    (calculationType === "periodosParaMonto" && !montoObjetivo) ||
    (calculationType === "incognitaX" && !hasFlujosConX());

  return (
    <div className="space-y-8">
      {/* Gráfica de flujos */}
      {selectedInputs.cashflows && flujos.length > 0 && (
        <div className="border rounded-lg p-4 bg-white shadow-sm">
          <h3 className="text-lg font-medium text-center mb-4">Gráfica de flujos</h3>
          <CashFlowGraph 
            cashflows={flujos} 
            periods={selectedInputs.periods ? parseInt(periods) : undefined}
            targetPeriod={calculationType === "valorEnN" && targetPeriod ? parseInt(targetPeriod) : undefined}
            focalPoint={calculationType === "incognitaX" && puntoFocal ? parseInt(puntoFocal) : undefined}
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-center">Datos disponibles</h3>

          <div className="space-y-4">
            {/* TASA DE INTERES */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="interestRateCheck"
                checked={selectedInputs.interestRate}
                onChange={() => handleCheckboxChange('interestRate')}
                className="h-5 w-5"
              />
              <label htmlFor="interestRateCheck" className="text-md">
                i (tasa de interés)
              </label>

              {selectedInputs.interestRate && (
                <div className="flex space-x-2 ml-7">
                  <div className="flex flex-col">
                    <label className="text-sm text-gray-600 mb-1"><small>Periodo de Pago</small></label>
                    <select
                      className="p-2 border rounded-md text-sm"
                      value={periodoPago}
                      onChange={(e) => setPeriodoPago(e.target.value)}
                      title="Periodo de Pago"
                    >
                      <option value="diaria">Diaria</option>
                      <option value="semanal">Semanal</option>
                      <option value="quincenal">Quincenal</option>
                      <option value="mensual">Mensual</option>
                      <option value="bimestral">Bimestral</option>
                      <option value="trimestral">Trimestral</option>
                      <option value="cuatrimestral">Cuatrimestral</option>
                      <option value="semestral">Semestral</option>
                      <option value="anual">Anual</option>
                    </select>
                  </div>

                  <div className="flex flex-col">
                    <label className="text-sm text-gray-600 mb-1"><small>Periodo de Capitalización</small></label>
                    <select
                      className="p-2 border rounded-md text-sm"
                      value={periodoCapitalizacion}
                      onChange={(e) => setPeriodoCapitalizacion(e.target.value)}
                      title="Periodo de Capitalización"
                    >
                      <option value="diaria">Diaria</option>
                      <option value="semanal">Semanal</option>
                      <option value="quincenal">Quincenal</option>
                      <option value="mensual">Mensual</option>
                      <option value="bimestral">Bimestral</option>
                      <option value="trimestral">Trimestral</option>
                      <option value="cuatrimestral">Cuatrimestral</option>
                      <option value="semestral">Semestral</option>
                      <option value="anual">Anual</option>
                    </select>
                  </div>

                  <div className="flex flex-col">
                    <label className="text-sm text-gray-600 mb-1"><small>Forma de Pago</small></label>
                    <select
                      className="p-2 border rounded-md text-sm"
                      value={formaPago}
                      onChange={(e) => setFormaPago(e.target.value)}
                      title="Forma de Pago"
                    >
                      <option value="vencida">Vencida</option>
                      <option value="anticipada">Anticipada</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
            
            {selectedInputs.interestRate && (
              <div className="ml-7">
                <input
                  type="number"
                  step="0.01"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  className="w-full p-2 border rounded-md"
                  placeholder="Ej: 0.05 para 5%"
                />
                <p className="text-sm text-gray-500 mt-1">Forma decimal (ej: 0.05 para 5%)</p>
              </div>
            )}
            
            {/* PERIODOS */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="periodsCheck"
                checked={selectedInputs.periods}
                onChange={() => handleCheckboxChange('periods')}
                className="h-5 w-5"
              />
              <label htmlFor="periodsCheck" className="text-md">
                n (periodos)
              </label>

              {selectedInputs.periods && (
                <div className="flex flex-col ml-2">
                  <label className="text-sm text-gray-600 mb-1"><small>Periodicidad</small></label>
                  <select
                    className="p-2 border rounded-md text-sm"
                    value={periodicidad}
                    onChange={(e) => setPeriodicidad(e.target.value)}
                    title="Periodicidad"
                  >
                    <option value="diaria">Diaria</option>
                    <option value="semanal">Semanal</option>
                    <option value="quincenal">Quincenal</option>
                    <option value="mensual">Mensual</option>
                    <option value="bimestral">Bimestral</option>
                    <option value="trimestral">Trimestral</option>
                    <option value="cuatrimestral">Cuatrimestral</option>
                    <option value="semestral">Semestral</option>
                    <option value="anual">Anual</option>
                  </select>
                </div>
              )}
            </div>
            
            {selectedInputs.periods && (
              <div className="ml-7">
                <input
                  type="number"
                  value={periods}
                  onChange={(e) => setPeriods(e.target.value)}
                  className="w-full p-2 border rounded-md"
                  placeholder="Ej: 12"
                />
              </div>
            )}
            
            {/* FLUJOS DE TRANSACCIONES */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="cashflowsCheck"
                checked={selectedInputs.cashflows}
                onChange={() => handleCheckboxChange('cashflows')}
                className="h-5 w-5"
              />
              <label htmlFor="cashflowsCheck" className="text-md">
                Flujos de transacciones
              </label>
            </div>
            
            {selectedInputs.cashflows && (
              <div className="mb-6">
                <h2 className="text-xl font-bold">Flujos de transacciones</h2>
                <p className="text-sm text-gray-500 mb-4">(Siempre se mantendrán ordenados)</p>
                
                <div className="space-y-4">
                  {flujos.map((flujo, index) => (
                    <div key={index} className="flex gap-4 items-end">
                      <div>
                        <label className="block text-sm font-medium">Periodo</label>
                        <input
                          type="number"
                          className="mt-1 block p-2 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          value={flujo.n}
                          onChange={(e) => actualizarFlujo(index, "n", parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium">Tipo</label>
                        <select
                          className="mt-1 block p-2 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          value={flujo.tipo}
                          onChange={(e) => actualizarFlujo(index, "tipo", e.target.value as "entrada" | "salida")}
                        >
                          <option value="entrada">Entrada</option>
                          <option value="salida">Salida</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium">Monto</label>
                        <input
                          type={calculationType === "incognitaX" ? "text" : "number"}
                          className="mt-1 block p-2 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          value={flujo.monto}
                          onChange={(e) => {
                            if (calculationType === "incognitaX") {
                              // Para modo incógnita, permitir valores de texto
                              actualizarFlujo(index, "monto", e.target.value);
                            } else {
                              // Para otros modos, convertir a número
                              actualizarFlujo(index, "monto", parseFloat(e.target.value) || 0);
                            }
                          }}
                          placeholder={calculationType === "incognitaX" ? "Ej: x, 2x, x/5" : "0"}
                        />
                      </div>
                      <button
                        type="button"
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        onClick={() => eliminarFlujo(index)}
                      >
                        Eliminar
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  onClick={agregarFlujo}
                >
                  + Añadir flujo
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Right Column - Additional Inputs */}
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-center">Datos adicionales</h3>
          <div className="space-y-4">
            {calculationType === "valorEnN" && (
              <div className="p-4 border rounded-md bg-gray-50 space-y-3">
                <p className="text-center text-sm font-medium">
                  Calcular el valor en un periodo específico
                </p>
                <div>
                  <label className="block text-sm font-medium mb-1">Periodo específico (n)</label>
                  <input
                    type="number"
                    value={targetPeriod}
                    onChange={(e) => setTargetPeriod(e.target.value)}
                    className="w-full p-2 border rounded-md"
                    placeholder="Ingrese el periodo para calcular el valor"
                  />
                </div>
              </div>
            )}
            
            {calculationType === "periodosParaMonto" && (
              <div className="p-4 border rounded-md bg-gray-50 space-y-3">
                <p className="text-center text-sm font-medium">
                  Calcular la cantidad de periodos para llegar a un monto
                </p>
                <div>
                  <label className="block text-sm font-medium mb-1">Monto objetivo</label>
                  <input
                    type="number"
                    className="mt-1 block w-full p-2 bg-white rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    value={montoObjetivo}
                    onChange={(e) => setMontoObjetivo(e.target.value)}
                  />
                </div>
              </div>
            )}

            {calculationType === "incognitaX" && (
              <div className="p-4 border rounded-md bg-gray-50 space-y-3">
                <p className="text-center text-sm font-medium">
                  Calcular la incógnita X en flujos de transacciones
                </p>
                <div>
                  <label className="block text-sm font-medium mb-1">Punto Focal (n)</label>
                  <input
                    type="number"
                    value={puntoFocal}
                    onChange={(e) => setPuntoFocal(e.target.value)}
                    className="w-full p-2 border rounded-md"
                    placeholder="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">Período de referencia para calcular el valor de X</p>
                </div>
                <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    <strong>Instrucciones:</strong> Para representar la incógnita X, incluya al menos un flujo 
                    que contenga "x" en su monto. Puede usar expresiones como:
                  </p>
                  <ul className="list-disc pl-5 text-sm text-yellow-800 mt-1">
                    <li>x (sólo la variable)</li>
                    <li>2x (un número multiplicando a x)</li>
                    <li>0.5x (decimal multiplicando a x)</li>
                    <li>-x (x con signo negativo)</li>
                    <li>x/5 (x dividida entre un número)</li>
                  </ul>
                </div>
                {!hasFlujosConX() && selectedInputs.cashflows && (
                  <div className="mt-3">
                    <p className="text-sm text-red-600 mb-2">
                      No se ha incluido ningún flujo con la incógnita X.
                    </p>
                    <button
                      onClick={agregarFlujoIncognita}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-md text-sm"
                    >
                      Añadir flujo con incógnita X
                    </button>
                  </div>
                )}
                {!selectedInputs.cashflows && (
                  <div className="mt-3">
                    <p className="text-sm text-red-600 mb-2">
                      Primero active la opción de "Flujos de transacciones" en los datos disponibles.
                    </p>
                    <button
                      onClick={() => handleCheckboxChange('cashflows')}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-md text-sm"
                    >
                      Activar flujos de transacciones
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="col-span-2 mt-6">
          <div className="flex justify-center">
            <button
              onClick={handleCalculate}
              disabled={botonCalcularDisabled}
              className="bg-green-600 text-white py-3 px-10 rounded-md font-medium hover:bg-green-700 disabled:bg-gray-400"
            >
              Calcular
            </button>
          </div>

          {(resultDescription || resultValue) && (
            <div className="mt-6 flex justify-center">
              <div className="p-6 border rounded-md bg-gray-50 w-1/2">
                {resultDescription && (
                  <p className="text-center text-sm font-medium mb-2">
                    {resultDescription}
                  </p>
                )}
                {resultValue && (
                  <p className="text-center text-sm font-medium">
                    {resultValue}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManualCalculation; 