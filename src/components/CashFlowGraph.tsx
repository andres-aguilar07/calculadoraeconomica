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
  const data = Array.from({ length: maxPeriod + 1 }, (_, i) => {
    const flujoEnPeriodo = cashflows.find(f => f.n === i);
    return {
      periodo: i,
      valor: flujoEnPeriodo 
        ? (typeof flujoEnPeriodo.monto === 'number' 
            ? (flujoEnPeriodo.tipo === "entrada" ? flujoEnPeriodo.monto : -flujoEnPeriodo.monto)
            : 0) 
        : 0
    };
  });

  // Determinar el rango de periodos
  const minPeriod = Math.min(...cashflows.map(flow => flow.n));
  const totalPeriods = maxPeriod - minPeriod + 1;

  // Encontrar el monto máximo para escalar las flechas, solo considerando valores numéricos
  const montosFlujos = cashflows
    .filter(flow => typeof flow.monto === 'number')
    .map(flow => Math.abs(flow.monto as number));
  
  const maxAmount = montosFlujos.length > 0 ? Math.max(...montosFlujos) : 1;

  // Crear un array con todos los periodos
  const allPeriods = Array.from({ length: totalPeriods }, (_, i) => i + minPeriod);

  // Calcular la altura máxima para las flechas (60% del contenedor)
  const MAX_ARROW_HEIGHT = 60;

  // Función para formatear el monto para mostrar
  const formatMonto = (monto: number | string): string => {
    if (typeof monto === 'number') {
      return monto.toLocaleString();
    }
    // Si es una expresión con X, la mostramos directamente
    return monto;
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

            {allPeriods.map((period) => {
              const flow = cashflows.find(f => f.n === period);
              // Ajustar la escala de la altura para que sea más manejable
              // Para flujos con X, usamos una altura fija
              const arrowHeight = flow 
                ? (typeof flow.monto === 'number' 
                    ? (Math.abs(flow.monto) / maxAmount) * MAX_ARROW_HEIGHT 
                    : 40) // Altura fija para expresiones con X
                : 0;

              return (
                <div key={period} className="flex flex-col items-center justify-center relative" style={{ flex: 1 }}>
                  {/* Número de periodo - Ahora con más espacio */}
                  <div className="absolute bottom-0 text-sm font-medium" style={{ bottom: '-2rem' }}>
                    {period}
                  </div>

                  {/* Marca vertical en la línea de tiempo */}
                  <div className="absolute h-3 w-0.5 bg-gray-300 top-1/2 transform -translate-y-1/2" />

                  {/* Flecha si hay flujo */}
                  {flow && (
                    <div 
                      className="absolute top-1/2 transform -translate-y-1/2 flex flex-col items-center"
                      style={{ 
                        height: `${arrowHeight}%`,
                        minHeight: '30px',
                        maxHeight: '80%', // Limitar la altura máxima
                        transition: 'all 0.3s ease'
                      }}
                    >
                      {flow.tipo === "entrada" ? (
                        <>
                          <BsArrowUpCircleFill className={`${typeof flow.monto === 'string' ? 'text-purple-500' : 'text-green-500'} text-2xl`} />
                          <div className={`h-full w-0.5 ${typeof flow.monto === 'string' ? 'bg-purple-500' : 'bg-green-500'} -mt-1`} />
                          <span className={`text-sm font-medium ${typeof flow.monto === 'string' ? 'text-purple-600' : 'text-green-600'} mt-1 whitespace-nowrap`}>
                            +{typeof flow.monto === 'number' ? '$' : ''}{formatMonto(flow.monto)}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className={`text-sm font-medium ${typeof flow.monto === 'string' ? 'text-purple-600' : 'text-red-600'} mb-1 whitespace-nowrap`}>
                            -{typeof flow.monto === 'number' ? '$' : ''}{formatMonto(flow.monto)}
                          </span>
                          <div className={`h-full w-0.5 ${typeof flow.monto === 'string' ? 'bg-purple-500' : 'bg-red-500'} -mb-1`} />
                          <BsArrowDownCircleFill className={`${typeof flow.monto === 'string' ? 'text-purple-500' : 'text-red-500'} text-2xl`} />
                        </>
                      )}
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