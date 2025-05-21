import React from 'react';

interface CashFlowProps {
  cashflows: Array<{
    n: number;
    monto: number | string;
    tipo: "entrada" | "salida";
  }>;
  periods?: number;
  targetPeriod?: number;
  focalPoint?: number;
}

const CashFlowGraph: React.FC<CashFlowProps> = ({ 
  cashflows, 
  periods = 12,
  targetPeriod,
  focalPoint
}) => {
  // Encontrar el periodo máximo
  const maxPeriod = Math.max(
    periods || 0,
    ...cashflows.map(flow => flow.n),
    targetPeriod !== undefined ? targetPeriod : 0,
    focalPoint !== undefined ? focalPoint : 0
  );
  
  // Crear un array de periodos desde 0 hasta el máximo
  const timeline = Array.from({ length: maxPeriod + 1 }, (_, i) => i);
  
  // Función para determinar la altura de la barra
  const getBarHeight = (monto: number | string): number => {
    if (typeof monto === 'string') {
      // Si es una expresión con x, mostrar una altura fija para representación
      return 50; // Altura fija para flujos con incógnita X
    }
    return Math.min(Math.abs(monto) / 10, 150); // Limitar la altura máxima
  };
  
  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-fit" style={{ minWidth: `${Math.max(800, (maxPeriod + 1) * 60)}px` }}>
        
        {/* Eje X - Línea del tiempo */}
        <div className="flex items-center border-t border-gray-300 relative h-6 mb-4">
          {timeline.map(n => (
            <div 
              key={n} 
              className={`flex-1 text-center text-xs ${
                (targetPeriod === n || focalPoint === n) ? 'font-bold text-blue-600' : ''
              }`}
            >
              {n}
              {targetPeriod === n && <span className="block text-[10px] text-blue-600">Objetivo</span>}
              {focalPoint === n && <span className="block text-[10px] text-blue-600">Punto focal</span>}
            </div>
          ))}
        </div>
        
        {/* Flujos de efectivo */}
        <div className="h-[200px] relative flex">
          {/* Línea central */}
          <div className="absolute left-0 right-0 top-1/2 border-b border-gray-300"></div>
          
          {/* Líneas verticales para cada periodo */}
          {timeline.map(n => (
            <div 
              key={n} 
              className={`flex-1 relative ${
                (targetPeriod === n || focalPoint === n) ? 'bg-blue-50' : ''
              }`}
            >
              {/* Línea vertical */}
              <div className="absolute h-full w-px bg-gray-200 left-1/2"></div>
              
              {/* Flujos en este periodo */}
              {cashflows
                .filter(flow => flow.n === n)
                .map((flow, idx) => {
                  const isEntranceFlow = flow.tipo === 'entrada';
                  const isXFlow = typeof flow.monto === 'string';
                  
                  return (
                    <div 
                      key={idx}
                      className={`absolute left-0 right-0 mx-auto w-8 flex flex-col items-center ${
                        isEntranceFlow ? 'bottom-1/2' : 'top-1/2'
                      }`}
                      style={{ 
                        transform: `translateY(${isEntranceFlow ? '' : ''}8px)` 
                      }}
                    >
                      {/* Barra de flujo */}
                      <div 
                        className={`w-8 ${
                          isXFlow 
                            ? 'bg-purple-400 bg-opacity-70 border border-purple-500' 
                            : isEntranceFlow 
                              ? 'bg-green-400 bg-opacity-70 border border-green-500' 
                              : 'bg-red-400 bg-opacity-70 border border-red-500'
                        } rounded-sm`}
                        style={{ 
                          height: `${getBarHeight(flow.monto)}px`,
                          marginBottom: isEntranceFlow ? '0' : '', 
                          marginTop: isEntranceFlow ? '' : '0'
                        }}
                      ></div>
                      
                      {/* Etiqueta del monto */}
                      <div className={`text-xs font-medium mt-1 whitespace-nowrap ${
                        isXFlow ? 'text-purple-700' : isEntranceFlow ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {isXFlow ? `${flow.monto}` : `$${typeof flow.monto === 'number' ? flow.monto.toLocaleString() : flow.monto}`}
                      </div>
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
        
        {/* Leyenda */}
        <div className="flex justify-center space-x-4 mt-4 text-xs">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-400 border border-green-500 mr-1"></div>
            <span>Entrada</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-400 border border-red-500 mr-1"></div>
            <span>Salida</span>
          </div>
          {cashflows.some(flow => typeof flow.monto === 'string') && (
            <div className="flex items-center">
              <div className="w-3 h-3 bg-purple-400 border border-purple-500 mr-1"></div>
              <span>Incógnita X</span>
            </div>
          )}
          {(targetPeriod !== undefined || focalPoint !== undefined) && (
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-50 border border-blue-200 mr-1"></div>
              <span>{targetPeriod !== undefined ? 'Periodo objetivo' : 'Punto focal'}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CashFlowGraph; 