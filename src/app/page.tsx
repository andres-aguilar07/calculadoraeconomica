import React from 'react';
import CalculationSelector from '@/components/CalculationSelector';
import ManualCalculation from '@/components/ManualCalculation';
import AICalculation from '@/components/AICalculation';

type CalculationType = 'valorEnN' | 'tasaInteres' | 'periodosParaMonto' | 'incognitaX';

export default function HomePage() {
  const [calculationType, setCalculationType] = React.useState<CalculationType>('valorEnN');
  const [calculationMode, setCalculationMode] = React.useState<'manual' | 'ai'>('manual');

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-center mb-0">
          Calculadora Financiera
        </h1>

        <p className="text-center text-gray-600 mb-1">
          Ecuaciones de valor
        </p>

        <small className="text-center block text-gray-600 mb-2">
          Andrés Aguilar y Sheyla Daza
        </small>

        <hr className="border-t border-gray-200" />

        <p className="text-center text-gray-600 mb-1">
          Modo de cálculo
        </p>

        {/* Selector de modo de cálculo */}
        <div className="flex justify-center space-x-4 mb-8">
          <button
            onClick={() => setCalculationMode('manual')}
            className={`px-6 py-2 rounded-md font-medium cursor-pointer ${
              calculationMode === 'manual'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Manual ✍️
          </button>
          <button
            onClick={() => setCalculationMode('ai')}
            className={`px-6 py-2 rounded-md font-medium cursor-pointer ${
              calculationMode === 'ai'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            IA ✨
          </button>
        </div>

        <p className="text-center text-gray-600 mb-1">
          ¿Qué desea hallar?
        </p>

        {/* Selector de tipo de cálculo */}
        <CalculationSelector
          calculationType={calculationType}
          onCalculationTypeChange={setCalculationType}
        />

        {/* Componente de cálculo según el modo seleccionado */}
        {calculationMode === 'manual' ? (
          <ManualCalculation calculationType={calculationType} />
        ) : (
          <AICalculation calculationType={calculationType} />
        )}
      </div>
    </main>
  );
} 