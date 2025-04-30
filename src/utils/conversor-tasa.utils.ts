// Tipos y enums
type Period =
  | "diario"
  | "semanal"
  | "quincenal"
  | "mensual"
  | "bimestral"
  | "trimestral"
  | "cuatrimestral"
  | "semestral"
  | "anual";

type RateType =
  | "E"    // Efectiva anual
  | "Tnv"  // Tasa nominal vencida
  | "iv"   // Tasa periódica vencida
  | "ia"   // Tasa periódica anticipada
  | "Tna"; // Tasa nominal anticipada

const periodToM: Record<Period, number> = {
  diario: 360,
  semanal: 52,
  quincenal: 26,
  mensual: 12,
  bimestral: 6,
  trimestral: 4,
  cuatrimestral: 3,
  semestral: 2,
  anual: 1,
};

// Conversión central
function convertInterestRate({
  value,
  fromType,
  fromPeriod,
  toType,
  toPeriod,
}: {
  value: number;         // En decimal (2.6% → 0.026)
  fromType: RateType;
  fromPeriod: Period;
  toType: RateType;
  toPeriod: Period;
}): number {
  const mFrom = periodToM[fromPeriod];
  const mTo = periodToM[toPeriod];

  let E: number;

  // Paso 1: convertir desde cualquier tipo a Efectiva Anual (E)
  switch (fromType) {
    case "E":
      E = value;
      break;
    case "Tnv": {
      const i = value / mFrom;
      E = Math.pow(1 + i, mFrom) - 1;
      break;
    }
    case "iv": {
      const Tnv = value * mFrom;
      const i = Tnv / mFrom;
      E = Math.pow(1 + i, mFrom) - 1;
      break;
    }
    case "ia": {
      const iv = value / (1 - value);
      const Tnv = iv * mFrom;
      const i = Tnv / mFrom;
      E = Math.pow(1 + i, mFrom) - 1;
      break;
    }
    case "Tna": {
      const ia = value / mFrom;
      const iv = ia / (1 + ia);
      const i = iv;
      E = Math.pow(1 + i, mFrom) - 1;
      break;
    }
  }

  // Paso 2: convertir desde E a tipo destino
  switch (toType) {
    case "E":
      return E;
    case "Tnv": {
      const i = Math.pow(1 + E, 1 / mTo) - 1;
      return i * mTo;
    }
    case "iv": {
      const i = Math.pow(1 + E, 1 / mTo) - 1;
      return i;
    }
    case "ia": {
      const i = Math.pow(1 + E, 1 / mTo) - 1;
      const ia = i / (1 + i);
      return ia;
    }
    case "Tna": {
      const i = Math.pow(1 + E, 1 / mTo) - 1;
      const ia = i / (1 + i);
      return ia * mTo;
    }
  }
}

export default convertInterestRate;
