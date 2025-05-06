import React from 'react';
import { BsArrowUpCircleFill, BsArrowDownCircleFill } from 'react-icons/bs';

interface CashFlowGraphProps {
  cashflows: Array<{
    n: number;
    monto: number | string;
    tipo: "entrada" | "salida";
  }>;
  periods?: number;
}

const CashFlowGraph: React.FC<CashFlowGraphProps> = ({ cashflows, periods }) => {
  const maxPeriod = periods || Math.max(...cashflows.map(f => f.n));
  const minPeriod = Math.min(...cashflows.map(flow => flow.n));
  const totalPeriods = maxPeriod - minPeriod + 1;

  // Crear un array con todos los periodos
  const allPeriods = Array.from({ length: totalPeriods }, (_, i) => i + minPeriod);

  // Calcular la altura máxima para las flechas (60% del contenedor)
  const MAX_ARROW_HEIGHT = 60;

  // Procesar los flujos para agruparlos por período y tipo
  const processedFlows = allPeriods.map(period => {
    const flowsInPeriod = cashflows.filter(f => f.n === period);
    
    // Agrupar y sumar los flujos de entrada
    const entradas = flowsInPeriod.filter(f => f.tipo === "entrada");
    let montoEntrada: number | string = 0;
    
    for (const flow of entradas) {
      if (typeof flow.monto === 'number' && typeof montoEntrada === 'number') {
        montoEntrada += flow.monto;
      } else {
        // Si hay al menos un string, usamos el string para mostrar (e.g. "X")
        montoEntrada = typeof montoEntrada === 'string' ? montoEntrada : flow.monto;
      }
    }
    
    // Agrupar y sumar los flujos de salida
    const salidas = flowsInPeriod.filter(f => f.tipo === "salida");
    let montoSalida: number | string = 0;
    
    for (const flow of salidas) {
      if (typeof flow.monto === 'number' && typeof montoSalida === 'number') {
        montoSalida += flow.monto;
      } else {
        montoSalida = typeof montoSalida === 'string' ? montoSalida : flow.monto;
      }
    }

    return {
      period,
      entrada: entradas.length > 0 ? { monto: montoEntrada } : null,
      salida: salidas.length > 0 ? { monto: montoSalida } : null
    };
  });

  // Encontrar el monto máximo para escalar las flechas, solo considerando valores numéricos
  const montosEntrada = processedFlows
    .filter(flow => flow.entrada !== null && typeof flow.entrada.monto === 'number')
    .map(flow => Math.abs(flow.entrada!.monto as number));
  
  const montosSalida = processedFlows
    .filter(flow => flow.salida !== null && typeof flow.salida.monto === 'number')
    .map(flow => Math.abs(flow.salida!.monto as number));
  
  const montosFlujos = [...montosEntrada, ...montosSalida];
  const maxAmount = montosFlujos.length > 0 ? Math.max(...montosFlujos) : 1;

  // Función para formatear el monto para mostrar
  const formatMonto = (monto: number | string): string => {
    if (typeof monto === 'number') {
      return monto.toLocaleString();
    }
    // Si es una expresión con X, la mostramos directamente
    return monto.toString();
  };

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[600px] p-6">
        {/* Línea de tiempo */}
        <div className="relative">
          {/* Contenedor para periodos y flechas con padding extra arriba y abajo */}
          <div className="flex justify-between relative py-16" style={{ minHeight: '250px' }}>
            {/* Línea horizontal - Ahora dentro del contenedor flex */}
            <div className="absolute left-0 right-0 h-0.5 bg-gray-300 top-1/2 transform -translate-y-1/2" />

            {processedFlows.map(({ period, entrada, salida }) => {
              // Calcular alturas de flechas
              const entradaHeight = entrada 
                ? (typeof entrada.monto === 'number' 
                    ? (Math.abs(entrada.monto) / maxAmount) * MAX_ARROW_HEIGHT 
                    : 40) 
                : 0;
              
              const salidaHeight = salida 
                ? (typeof salida.monto === 'number' 
                    ? (Math.abs(salida.monto) / maxAmount) * MAX_ARROW_HEIGHT 
                    : 40) 
                : 0;

              return (
                <div key={period} className="flex flex-col items-center justify-center relative" style={{ flex: 1 }}>
                  {/* Número de periodo */}
                  <div className="absolute bottom-0 text-sm font-medium" style={{ bottom: '-2rem' }}>
                    {period}
                  </div>

                  {/* Marca vertical en la línea de tiempo */}
                  <div className="absolute h-3 w-0.5 bg-gray-300 top-1/2 transform -translate-y-1/2" />

                  {/* Flecha de entrada si hay flujo de entrada */}
                  {entrada && (
                    <div 
                      className="absolute top-[calc(50%-5px)] transform -translate-y-full flex flex-col items-center"
                      style={{ 
                        height: `${entradaHeight}%`,
                        minHeight: '30px',
                        maxHeight: '80%',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <BsArrowUpCircleFill className={`${typeof entrada.monto === 'string' ? 'text-purple-500' : 'text-green-500'} text-2xl`} />
                      <div className={`h-full w-0.5 ${typeof entrada.monto === 'string' ? 'bg-purple-500' : 'bg-green-500'} -mt-1`} />
                      <span className={`text-sm font-medium ${typeof entrada.monto === 'string' ? 'text-purple-600' : 'text-green-600'} mt-1 whitespace-nowrap`}>
                        +{typeof entrada.monto === 'number' ? '$' : ''}{formatMonto(entrada.monto)}
                      </span>
                    </div>
                  )}

                  {/* Flecha de salida si hay flujo de salida */}
                  {salida && (
                    <div 
                      className="absolute top-[calc(50%+5px)] flex flex-col items-center"
                      style={{ 
                        height: `${salidaHeight}%`,
                        minHeight: '30px',
                        maxHeight: '80%',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <span className={`text-sm font-medium ${typeof salida.monto === 'string' ? 'text-purple-600' : 'text-red-600'} mb-1 whitespace-nowrap`}>
                        -{typeof salida.monto === 'number' ? '$' : ''}{formatMonto(salida.monto)}
                      </span>
                      <div className={`h-full w-0.5 ${typeof salida.monto === 'string' ? 'bg-purple-500' : 'bg-red-500'} -mb-1`} />
                      <BsArrowDownCircleFill className={`${typeof salida.monto === 'string' ? 'text-purple-500' : 'text-red-500'} text-2xl`} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CashFlowGraph; 