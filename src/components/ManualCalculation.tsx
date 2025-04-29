import React, { useState } from 'react';
import calcular from "@/utils/calculos.utils";
import CashFlowGraph from './CashFlowGraph';

type CalculationType = 'valueAtN' | 'interestRate' | 'periodsForAmount';

interface ManualCalculationProps {
  calculationType: CalculationType;
}

const ManualCalculation: React.FC<ManualCalculationProps> = ({ calculationType }) => {
  // Data selection state
  const [selectedInputs, setSelectedInputs] = useState({
    interestRate: false,
    periods: false,
    cashflows: false
  });
  
  // Data values state
  const [interestRate, setInterestRate] = useState<string>("");
  const [periods, setPeriods] = useState<string>("");
  const [cashflows, setCashflows] = useState<Array<{ n: number; amount: number; sign: "positive" | "negative" }>>([]);

  // * TASA DE INTERES
  const [periodoPago, setPeriodoPago] = useState<string>("anual");
  const [periodoCapitalizacion, setPeriodoCapitalizacion] = useState<string>("anual");
  const [formaPago, setFormaPago] = useState<string>("vencida");
  
  // Additional inputs for specific calculations
  const [targetPeriod, setTargetPeriod] = useState<string>("");
  const [targetAmount, setTargetAmount] = useState<string>("");

  // Result state
  const [resultDescription, setResultDescription] = useState<string>("");
  const [resultValue, setResultValue] = useState<string>("");

  const addCashflow = () => {
    setCashflows([...cashflows, { n: 0, amount: 0, sign: "positive" }]);
  };

  const updateCashflow = (index: number, field: keyof typeof cashflows[0], value: any) => {
    const newCashflows = [...cashflows];
    newCashflows[index] = { ...newCashflows[index], [field]: value };
    setCashflows(newCashflows);
  };

  const removeCashflow = (index: number) => {
    setCashflows(cashflows.filter((_, i) => i !== index));
  };
  
  const handleCheckboxChange = (input: keyof typeof selectedInputs) => {
    setSelectedInputs({
      ...selectedInputs,
      [input]: !selectedInputs[input]
    });
    
    if (input === 'cashflows' && !selectedInputs.cashflows && cashflows.length === 0) {
      addCashflow();
    }
  };
  
  const handleCalculate = () => {
    const calculationData = {
      target: calculationType,
      inputs: {
        interestRate: selectedInputs.interestRate ? parseFloat(interestRate) : undefined,
        periods: selectedInputs.periods ? parseInt(periods) : undefined,
        cashflows: selectedInputs.cashflows ? cashflows : undefined,
        targetPeriod: calculationType === "valueAtN" ? parseInt(targetPeriod) : undefined,
        targetAmount: calculationType === "periodsForAmount" ? parseFloat(targetAmount) : undefined
      }
    };
    
    const result = calcular.resolverEcuacionValor(calculationData);
    setResultDescription(result.description);
    setResultValue(result.value.toString());
  };

  return (
    <div className="space-y-8">
      {/* Gráfica de flujos */}
      {selectedInputs.cashflows && cashflows.length > 0 && (
        <div className="border rounded-lg p-4 bg-white shadow-sm">
          <h3 className="text-lg font-medium text-center mb-4">Gráfica de flujos</h3>
          <CashFlowGraph 
            cashflows={cashflows} 
            periods={selectedInputs.periods ? parseInt(periods) : undefined}
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column - What data we have */}
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-center">Datos disponibles</h3>

          <div className="space-y-4">
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

              <div className="flex space-x-2 ml-7">
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
              <div className="ml-7 space-y-4">
                {cashflows.map((cashflow, index) => (
                  <div key={index} className="p-3 border rounded-md space-y-3 bg-gray-50">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-sm font-medium">n (periodo)</label>
                        <input
                          type="number"
                          value={cashflow.n}
                          onChange={(e) => updateCashflow(index, "n", parseInt(e.target.value) || 0)}
                          className="w-full p-2 border rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium">Signo</label>
                        <select
                          value={cashflow.sign}
                          onChange={(e) => updateCashflow(index, "sign", e.target.value as "positive" | "negative")}
                          className="w-full p-2 border rounded-md"
                        >
                          <option value="positive">Positivo</option>
                          <option value="negative">Negativo</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <label className="block text-sm font-medium">Cantidad</label>
                        <input
                          type="number"
                          step="0.01"
                          value={cashflow.amount}
                          onChange={(e) => updateCashflow(index, "amount", parseFloat(e.target.value) || 0)}
                          className="w-full p-2 border rounded-md"
                        />
                      </div>
                      <button
                        onClick={() => removeCashflow(index)}
                        className="bg-red-500 text-white h-10 px-3 rounded-md hover:bg-red-600"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  onClick={addCashflow}
                  className="w-full px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
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
            {calculationType === "valueAtN" && (
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
            
            {calculationType === "periodsForAmount" && (
              <div className="p-4 border rounded-md bg-gray-50 space-y-3">
                <p className="text-center text-sm font-medium">
                  Calcular la cantidad de periodos para llegar a un monto
                </p>
                <div>
                  <label className="block text-sm font-medium mb-1">Monto objetivo</label>
                  <input
                    type="number"
                    step="0.01"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    className="w-full p-2 border rounded-md"
                    placeholder="Ingrese el monto a alcanzar"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="col-span-2 mt-6">
          <div className="flex justify-center">
            <button
              onClick={handleCalculate}
              disabled={
                !calculationType || 
                (!selectedInputs.interestRate && !selectedInputs.periods && !selectedInputs.cashflows) ||
                (calculationType === "valueAtN" && !targetPeriod) ||
                (calculationType === "periodsForAmount" && !targetAmount)
              }
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