import React from 'react';

type CalculationType = 'valorEnN' | 'tasaInteres' | 'periodosParaMonto';

interface CalculationSelectorProps {
  calculationType: CalculationType;
  onCalculationTypeChange: (type: CalculationType) => void;
}

const CalculationSelector: React.FC<CalculationSelectorProps> = ({
  calculationType,
  onCalculationTypeChange,
}) => {
  return (
    <div className="flex justify-center space-x-6 mb-8">
      <div>
        <input
          type="radio"
          id="valorEnN"
          name="calculationType"
          value="valorEnN"
          checked={calculationType === 'valorEnN'}
          onChange={(e) => onCalculationTypeChange(e.target.value as CalculationType)}
          className="mr-2"
        />
        <label htmlFor="valorEnN">Valor en un periodo específico (n)</label>
      </div>
      <div>
        <input
          type="radio"
          id="tasaInteres"
          name="calculationType"
          value="tasaInteres"
          checked={calculationType === 'tasaInteres'}
          onChange={(e) => onCalculationTypeChange(e.target.value as CalculationType)}
          className="mr-2"
        />
        <label htmlFor="tasaInteres">Tasa de interés (i)</label>
      </div>
      <div>
        <input
          type="radio"
          id="periodosParaMonto"
          name="calculationType"
          value="periodosParaMonto"
          checked={calculationType === 'periodosParaMonto'}
          onChange={(e) => onCalculationTypeChange(e.target.value as CalculationType)}
          className="mr-2"
        />
        <label htmlFor="periodosParaMonto">Periodos para alcanzar un monto</label>
      </div>
    </div>
  );
};

export default CalculationSelector; 