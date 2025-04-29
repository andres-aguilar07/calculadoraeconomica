import React from 'react';

type CalculationType = 'valueAtN' | 'interestRate' | 'periodsForAmount';

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
          id="valueAtN"
          name="calculationType"
          value="valueAtN"
          checked={calculationType === 'valueAtN'}
          onChange={(e) => onCalculationTypeChange(e.target.value as CalculationType)}
          className="mr-2"
        />
        <label htmlFor="valueAtN">Valor en un periodo específico (n)</label>
      </div>
      <div>
        <input
          type="radio"
          id="interestRate"
          name="calculationType"
          value="interestRate"
          checked={calculationType === 'interestRate'}
          onChange={(e) => onCalculationTypeChange(e.target.value as CalculationType)}
          className="mr-2"
        />
        <label htmlFor="interestRate">Tasa de interés (i)</label>
      </div>
      <div>
        <input
          type="radio"
          id="periodsForAmount"
          name="calculationType"
          value="periodsForAmount"
          checked={calculationType === 'periodsForAmount'}
          onChange={(e) => onCalculationTypeChange(e.target.value as CalculationType)}
          className="mr-2"
        />
        <label htmlFor="periodsForAmount">Periodos para alcanzar un monto</label>
      </div>
    </div>
  );
};

export default CalculationSelector; 