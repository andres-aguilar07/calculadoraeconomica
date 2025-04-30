// Tipos de cálculo
type ObjetivoCalculo = 'valorEnN' | 'tasaInteres' | 'periodosParaMonto';

// Datos de entrada para el cálculo
interface EntradasCalculo {
    tasaInteres?: number;             // Tasa de interés
    flujosEfectivo?: Array<{            // Array de flujos de efectivo
        n: number;                    // Número de periodo
        monto: number;                  // Monto del flujo
        tipo: "entrada" | "salida"    // Tipo del flujo (entrada o salida)
    }>;
    periodoObjetivo?: number;         // Periodo objetivo para el cálculo
    periodos?: number;                // Número de periodos
    montoObjetivo?: number;           // Monto objetivo a alcanzar
}

// Estructura completa de datos para cálculo
interface DatosCalculo {
    objetivo: ObjetivoCalculo;
    entradas: EntradasCalculo;
}

// Resultados del cálculo
interface ResultadoCalculo {
    valor: number;
    descripcion: string;
}

// Tipo para representar un flujo de efectivo
type Flujo = {
    n: number;                // Número de periodo
    monto: number;           // Monto del flujo
    tipo: "entrada" | "salida";  // Tipo: entrada (positivo) o salida (negativo)
};

// Objeto principal con todas las funciones de cálculo
const calcular = {
    resolverEcuacionValor: (datos: DatosCalculo): ResultadoCalculo => {
        switch (datos.objetivo) {
            case 'valorEnN':
                return calcularValorEnN(datos.entradas);
            case 'tasaInteres':
                return calcularTasaInteres(datos.entradas);
            case 'periodosParaMonto':
                return calcularPeriodosParaMonto(datos.entradas);
            default:
                throw new Error('Tipo de cálculo no válido');
        }
    }
};

// ! CASO 1: Calcular el valor en un periodo específico
function calcularValorEnN(entradas: EntradasCalculo): ResultadoCalculo {

    console.warn("fn calcularValorEnN");
    
    console.log("entradas: ", entradas);
    

    const { tasaInteres, flujosEfectivo, periodoObjetivo } = entradas;

    if (tasaInteres === undefined || !flujosEfectivo || periodoObjetivo === undefined) {
        throw new Error('Faltan datos necesarios para el cálculo');
    }

    let sumaEntradas = 0;
    let sumaSalidas = 0;

    for (const flujo of flujosEfectivo) {
        const t = Math.abs(flujo.n - periodoObjetivo);

        let factorAjuste = 1;

        if (t !== 0) {
            factorAjuste = Math.pow(1 + tasaInteres, -t); // si t > 0, descontamos; si t < 0, capitalizamos
        }

        const valorEquivalente = flujo.monto * factorAjuste;

        if (flujo.tipo === "entrada") {
            sumaEntradas += valorEquivalente;
        } else if (flujo.tipo === "salida") {
            sumaSalidas += valorEquivalente;
        } else {
            throw new Error(`Tipo de flujo inválido: ${flujo.tipo}`);
        }
    }

    console.log("sumaEntradas: ", sumaEntradas);
    console.log("sumaSalidas: ", sumaSalidas);
    

    const valorTotal = sumaEntradas - sumaSalidas;

    return {
        valor: Math.abs(Math.round(valorTotal * 100) / 100),
        descripcion: `Valor equivalente de los flujos en el periodo ${periodoObjetivo}`
    };
}



// function calcularValorEnN(entradas: EntradasCalculo): ResultadoCalculo {
//     console.log("Función: calcularValorEnN");
//     console.log("Entradas: ", entradas);

//     const { tasaInteres, flujosEfectivo, periodoObjetivo } = entradas;

//     // * Validaciones
//     if (!tasaInteres || !flujosEfectivo) {
//         throw new Error('Faltan datos necesarios para el cálculo');
//     }

//     if (flujosEfectivo.length === 0) {
//         throw new Error('No hay flujos de efectivo para calcular');
//     }

//     if (periodoObjetivo === undefined || periodoObjetivo === null) {
//         throw new Error('Falta especificar el periodo objetivo');
//     }

//     // Determinar si hay flujos anteriores al periodo objetivo
//     const existenFlujosAnteriores = flujosEfectivo.some(flujo => flujo.n <= periodoObjetivo);
    
//     // * Cálculo del valor total
//     let valorTotal = 0;
    
//     // Si estamos calculando el valor presente o un periodo anterior a todos los flujos,
//     // o no hay flujos anteriores al periodo objetivo, considerar todos
//     const flujosRelevantes = (periodoObjetivo === 0 || !existenFlujosAnteriores) 
//         ? flujosEfectivo 
//         : flujosEfectivo.filter(flujo => flujo.n <= periodoObjetivo);
    
//     for (const flujo of flujosRelevantes) {
//         const valor_calculado = calcularValorFlujoEnN(flujo, periodoObjetivo, tasaInteres);
//         console.log("Valor calculado para el flujo: ", flujo, " es: ", valor_calculado);
//         valorTotal += valor_calculado;
//     }

//     console.log("Valor total calculado: ", valorTotal);

//     const valorRedondeado = Math.round(valorTotal * 100) / 100;

//     return {
//         valor: valorRedondeado,
//         descripcion: `Valor calculado en el periodo ${periodoObjetivo}`
//     };
// }

// * funcion auxiliar para calcular el valor de un flujo en el periodo objetivo
// Función auxiliar para calcular el valor de un flujo en el periodo objetivo
function calcularValorFlujoEnN(
    flujo: Flujo,
    targetPeriod: number,
    interestRate: number): number {

    // Si el flujo está en el mismo periodo objetivo, retornar la cantidad directamente
    if (flujo.n === targetPeriod) {
        return flujo.monto * (flujo.tipo === "entrada" ? 1 : -1);
    }

    const distanciaPeriodos = Math.abs(flujo.n - targetPeriod);
    const factor = flujo.tipo === "entrada" ? 1 : -1;

    // Si el periodo objetivo es anterior al flujo, traer el valor al presente
    if (targetPeriod < flujo.n) {
        return flujo.monto / Math.pow(1 + interestRate, distanciaPeriodos) * factor;
    } else {
        // Si el periodo objetivo es posterior al flujo, llevar el valor a futuro
        return flujo.monto * Math.pow(1 + interestRate, distanciaPeriodos) * factor;
    }
}

// ! CASO 2: Calcular la tasa de interés
function calcularTasaInteres(entradas: EntradasCalculo): ResultadoCalculo {
    console.log("Función: calcularTasaInteres");
    console.log("Entradas: ", entradas);
    
    const { flujosEfectivo, periodos } = entradas;

    if (!flujosEfectivo || !periodos) {
        throw new Error('Faltan datos necesarios para el cálculo');
    }

    if (flujosEfectivo.length === 0) {
        throw new Error('No hay flujos de efectivo para calcular');
    }

    const tasaInteres = calcularTIR(flujosEfectivo, periodos);

    console.log("Tasa de interés calculada: ", tasaInteres);

    return {
        valor: tasaInteres || 0,
        descripcion: 'Tasa de interés calculada (en forma decimal)'
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

// ! CASO 3: Calcular periodos necesarios para alcanzar un monto
function calcularPeriodosParaMonto(entradas: EntradasCalculo): ResultadoCalculo {
    console.log("Función: calcularPeriodosParaMonto");
    console.log("Entradas: ", entradas);
    
    const { tasaInteres, flujosEfectivo, montoObjetivo } = entradas;

    // * Validaciones
    if (!tasaInteres || !flujosEfectivo || !montoObjetivo) {
        throw new Error('Faltan datos necesarios para el cálculo');
    }

    if (flujosEfectivo.length === 0) {
        throw new Error('No hay flujos de efectivo para calcular');
    }

    // Encontrar el periodo más grande entre los flujos
    const ultimoPeriodo = Math.max(...flujosEfectivo.map(flujo => flujo.n));
    console.log(`Último periodo de los flujos: ${ultimoPeriodo}`);
    
    // Función para calcular el valor en un periodo específico
    const calcularValorEnPeriodo = (periodo: number): number => {
        return flujosEfectivo.reduce((acumulado, flujo) => {
            return acumulado + calcularValorFlujoEnN(flujo, periodo, tasaInteres);
        }, 0);
    };

    // Determinamos un límite superior razonable para la búsqueda
    const MAX_PERIODOS = ultimoPeriodo + 1000;
    
    // Búsqueda binaria para encontrar el periodo exacto (posiblemente decimal)
    let periodoInferior = ultimoPeriodo;
    let periodoSuperior = MAX_PERIODOS;
    
    // Verificar si el valor en el último periodo ya alcanza o supera el monto objetivo
    const valorUltimoPeriodo = calcularValorEnPeriodo(ultimoPeriodo);
    console.log(`Valor en periodo ${ultimoPeriodo}: ${valorUltimoPeriodo}, Target: ${montoObjetivo}`);
    
    if (valorUltimoPeriodo >= montoObjetivo) {
        // Si ya se alcanza el objetivo, buscar hacia atrás (interpolación)
        if (ultimoPeriodo > 0) {
            const valorPeriodoAnterior = calcularValorEnPeriodo(ultimoPeriodo - 1);
            // Interpolación lineal para encontrar el periodo exacto
            const diferencia = valorUltimoPeriodo - valorPeriodoAnterior;
            const fraccion = (montoObjetivo - valorPeriodoAnterior) / diferencia;
            const periodoExacto = ultimoPeriodo - 1 + fraccion;
            
            return {
                valor: Math.round(periodoExacto * 1000) / 1000, // Redondear a 3 decimales
                descripcion: `Periodos necesarios para alcanzar exactamente el monto de ${montoObjetivo}`
            };
        }
        return {
            valor: ultimoPeriodo,
            descripcion: `El monto objetivo ${montoObjetivo} ya se alcanza en el periodo ${ultimoPeriodo}`
        };
    }
    
    // Búsqueda lineal para aproximar el periodo entero
    let periodoEntero = ultimoPeriodo + 1;
    while (periodoEntero <= MAX_PERIODOS) {
        const valor = calcularValorEnPeriodo(periodoEntero);
        console.log(`Periodo ${periodoEntero}: Valor ${valor}, Target: ${montoObjetivo}`);
        
        if (valor >= montoObjetivo) {
            break; // Encontramos el periodo entero donde se supera el monto
        }
        
        periodoEntero++;
    }
    
    if (periodoEntero > MAX_PERIODOS) {
        return {
            valor: -1,
            descripcion: 'No se encontró un periodo que alcance el monto deseado dentro del límite de periodos considerados'
        };
    }
    
    // Interpolación lineal para encontrar el periodo exacto
    const valorPeriodoAnterior = calcularValorEnPeriodo(periodoEntero - 1);
    const valorPeriodoActual = calcularValorEnPeriodo(periodoEntero);
    const diferencia = valorPeriodoActual - valorPeriodoAnterior;
    const fraccion = (montoObjetivo - valorPeriodoAnterior) / diferencia;
    const periodoExacto = periodoEntero - 1 + fraccion;
    
    return {
        valor: Math.round(periodoExacto * 1000) / 1000, // Redondear a 3 decimales
        descripcion: `Periodos necesarios para alcanzar exactamente el monto de ${montoObjetivo}`
    };
}

export default calcular;