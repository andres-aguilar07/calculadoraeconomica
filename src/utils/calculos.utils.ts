// Tipos de cálculo
type CalculationTarget = 'valueAtN' | 'interestRate' | 'periodsForAmount';

// Datos de entrada para el cálculo
interface CalculationInputs {
    interestRate?: number;
    periods?: number;
    cashflows?: Array<{ n: number; amount: number; sign: "positive" | "negative" }>;
    targetPeriod?: number;
    targetAmount?: number;
}

// Estructura completa de datos para cálculo
interface CalculationData {
    target: CalculationTarget;
    inputs: CalculationInputs;
}

// Resultados posibles
interface CalculationResult {
    value: number;
    description: string;
}

type Flujo = {
    n: number;
    amount: number;
    sign: "positive" | "negative";
};

// Objeto con todas las funciones de cálculo
const calcular = {
    resolverEcuacionValor: (data: CalculationData): CalculationResult => {
        switch (data.target) {
            case 'valueAtN':
                return calcularValorEnN(data.inputs);
            case 'interestRate':
                return calcularTasaInteres(data.inputs);
            case 'periodsForAmount':
                return calcularPeriodosParaMonto(data.inputs);
            default:
                throw new Error('Tipo de cálculo no válido');
        }
    }
};

// ! CASO 1: Valor en un periodo
function calcularValorEnN(inputs: CalculationInputs): CalculationResult {
    console.log("fn calcularValorEnN");
    console.log("inputs: ", inputs);

    const { interestRate, periods, cashflows, targetPeriod } = inputs;

    // * Validaciones
    if (!interestRate || !periods || !cashflows) {
        throw new Error('Faltan datos necesarios para el cálculo');
    }

    if (cashflows.length === 0) {
        throw new Error('Faltan datos necesarios para el cálculo');
    }

    if (targetPeriod === undefined || targetPeriod === null) {
        throw new Error('Faltan datos necesarios para el cálculo');
    }

    // * Calculo
    // Calcular el valor total en el periodo objetivo sumando todos los flujos
    const valorTotal = cashflows.reduce((acumulado, flujo) => {
        return acumulado + calcularValorFlujoEnN(flujo, targetPeriod, interestRate);
    }, 0);

    console.log("valorTotal: ", valorTotal);

    const valorRedondeado = Math.round(valorTotal * 100) / 100;

    return {
        value: valorRedondeado,
        description: `Valor calculado en el periodo ${targetPeriod}`
    };
}

// * funcion auxiliar para calcular el valor de un flujo en el periodo objetivo
// Función auxiliar para calcular el valor de un flujo en el periodo objetivo
function calcularValorFlujoEnN(
    flujo: { n: number; amount: number; sign: "positive" | "negative" },
    targetPeriod: number,
    interestRate: number): number {
    // Si el flujo está en el mismo periodo objetivo, retornar la cantidad directamente
    if (flujo.n === targetPeriod) {
        return flujo.amount * (flujo.sign === "positive" ? 1 : -1);
    }

    const distanciaPeriodos = Math.abs(flujo.n - targetPeriod);

    if (flujo.n < targetPeriod) {
        // Flujo está antes del periodo objetivo - multiplicar
        return flujo.amount * Math.pow(1 + interestRate, distanciaPeriodos) *
            (flujo.sign === "positive" ? 1 : -1);
    } else {
        if (flujo.sign === "positive") {
            return 0;
        }
        // Flujo está después del periodo objetivo - dividir
        return flujo.amount / Math.pow(1 + interestRate, distanciaPeriodos) *
            (flujo.sign === "negative" ? -1 : 1);
    }
}

// ! CASO 2: Tasa de interés
function calcularTasaInteres(inputs: CalculationInputs): CalculationResult {
    console.log("fn calcularTasaInteres");

    console.log("inputs: ", inputs);
    
    const { cashflows, periods } = inputs;

    if (!cashflows || !periods) {
        throw new Error('Faltan datos necesarios para el cálculo');
    }

    if (cashflows.length === 0) {
        throw new Error('Faltan datos necesarios para el cálculo');
    }

    const tasaInteres = calcularTIR(cashflows, periods);

    console.log("tasaInteres: ", tasaInteres);

    // const valorRedondeado = Math.round((tasaInteres || 0) * 10000000) / 10000000;

    return {
        value: tasaInteres || 0,
        description: 'Tasa de interés calculada (en forma decimal)'
    };
}

// * Funcion auxiliar para calcular la tasa de interés
function calcularTIR(
    flujos: Flujo[],
    targetPeriod: number = 0,
    precision: number = 1e-6
): number | null {
    let lower = -0.99; // Para permitir tasas negativas (pero no -1 o menor)
    let upper = 1.0;   // Supongamos que la tasa no es mayor al 100%

    // * Funcion auxiliar para calcular el valor presente neto
    const calcularVPN = (rate: number) => {
        return flujos.reduce((total, flujo) => {
            return total + calcularValorFlujoEnN(flujo, targetPeriod, rate);
        }, 0);
    };

    let mid: number;
    let attempts = 0;
    const maxAttempts = 100;

    while (attempts < maxAttempts) {
        mid = (lower + upper) / 2;
        const vpn = calcularVPN(mid);

        if (Math.abs(vpn) < precision) {
            return mid;
        }

        const vpnLower = calcularVPN(lower);

        if (vpnLower * vpn < 0) {
            upper = mid;
        } else {
            lower = mid;
        }

        attempts++;
    }

    return null; // No convergió
}

// ! CASO 3: Periodos para alcanzar un monto
function calcularPeriodosParaMonto(inputs: CalculationInputs): CalculationResult {
    console.log("fn calcularPeriodosParaMonto");
    
    console.log("inputs: ", inputs);
    
    const { interestRate, cashflows, targetAmount } = inputs;

    // * Validaciones
    if (!interestRate || !cashflows || !targetAmount) {
        throw new Error('Faltan datos necesarios para el cálculo');
    }

    if (cashflows.length === 0) {
        throw new Error('Faltan datos necesarios para el cálculo');
    }

    // Encontrar el periodo más grande entre los flujos
    const ultimoPeriodo = Math.max(...cashflows.map(flujo => flujo.n));
    console.log(`Último periodo de los flujos: ${ultimoPeriodo}`);
    
    // Función para calcular el valor en un periodo específico
    const calcularValorEnPeriodo = (periodo: number): number => {
        return cashflows.reduce((acumulado, flujo) => {
            return acumulado + calcularValorFlujoEnN(flujo, periodo, interestRate);
        }, 0);
    };

    // Determinamos un límite superior razonable para la búsqueda
    const MAX_PERIODOS = ultimoPeriodo + 1000;
    
    // Búsqueda binaria para encontrar el periodo exacto (posiblemente decimal)
    let periodoInferior = ultimoPeriodo;
    let periodoSuperior = MAX_PERIODOS;
    
    // Verificar si el valor en el último periodo ya alcanza o supera el monto objetivo
    const valorUltimoPeriodo = calcularValorEnPeriodo(ultimoPeriodo);
    console.log(`Valor en periodo ${ultimoPeriodo}: ${valorUltimoPeriodo}, Target: ${targetAmount}`);
    
    if (valorUltimoPeriodo >= targetAmount) {
        // Si ya se alcanza el objetivo, buscar hacia atrás (interpolación)
        if (ultimoPeriodo > 0) {
            const valorPeriodoAnterior = calcularValorEnPeriodo(ultimoPeriodo - 1);
            // Interpolación lineal para encontrar el periodo exacto
            const diferencia = valorUltimoPeriodo - valorPeriodoAnterior;
            const fraccion = (targetAmount - valorPeriodoAnterior) / diferencia;
            const periodoExacto = ultimoPeriodo - 1 + fraccion;
            
            return {
                value: Math.round(periodoExacto * 1000) / 1000, // Redondear a 3 decimales
                description: `Periodos necesarios para alcanzar exactamente el monto de ${targetAmount}`
            };
        }
        return {
            value: ultimoPeriodo,
            description: `El monto objetivo ${targetAmount} ya se alcanza en el periodo ${ultimoPeriodo}`
        };
    }
    
    // Búsqueda lineal para aproximar el periodo entero
    let periodoEntero = ultimoPeriodo + 1;
    while (periodoEntero <= MAX_PERIODOS) {
        const valor = calcularValorEnPeriodo(periodoEntero);
        console.log(`Periodo ${periodoEntero}: Valor ${valor}, Target: ${targetAmount}`);
        
        if (valor >= targetAmount) {
            break; // Encontramos el periodo entero donde se supera el monto
        }
        
        periodoEntero++;
    }
    
    if (periodoEntero > MAX_PERIODOS) {
        return {
            value: -1,
            description: 'No se encontró un periodo que alcance el monto deseado dentro del límite de periodos considerados'
        };
    }
    
    // Interpolación lineal para encontrar el periodo exacto
    const valorPeriodoAnterior = calcularValorEnPeriodo(periodoEntero - 1);
    const valorPeriodoActual = calcularValorEnPeriodo(periodoEntero);
    const diferencia = valorPeriodoActual - valorPeriodoAnterior;
    const fraccion = (targetAmount - valorPeriodoAnterior) / diferencia;
    const periodoExacto = periodoEntero - 1 + fraccion;
    
    return {
        value: Math.round(periodoExacto * 1000) / 1000, // Redondear a 3 decimales
        description: `Periodos necesarios para alcanzar exactamente el monto de ${targetAmount}`
    };
}

export default calcular;