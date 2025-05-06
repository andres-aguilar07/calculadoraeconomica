// Tipos de cálculo
type ObjetivoCalculo = 'valorEnN' | 'tasaInteres' | 'periodosParaMonto' | 'incognitaX';

// Datos de entrada para el cálculo
interface EntradasCalculo {
    tasaInteres?: number;             // Tasa de interés
    flujosEfectivo?: Array<{            // Array de flujos de efectivo
        n: number;                    // Número de periodo
        monto: number | string;       // Monto del flujo (puede ser un número o una expresión con 'x')
        tipo: "entrada" | "salida"    // Tipo del flujo (entrada o salida)
    }>;
    periodoObjetivo?: number;         // Periodo objetivo para el cálculo
    periodos?: number;                // Número de periodos
    montoObjetivo?: number;           // Monto objetivo a alcanzar
    puntoFocal?: number;              // Punto focal para calcular incógnita X
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
    monto: number | string;   // Monto del flujo (puede ser un número o una expresión con 'x')
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
            case 'incognitaX':
                return calcularIncognitaX(datos.entradas);
            default:
                throw new Error('Tipo de cálculo no válido');
        }
    }
};

// ! CASO 1: Calcular el valor en un periodo específico
function calcularValorEnN(entradas: EntradasCalculo): ResultadoCalculo {
    console.log("Función: calcularValorEnN");
    console.log("Entradas: ", entradas);

    const { tasaInteres, flujosEfectivo, periodoObjetivo } = entradas;

    // * Validaciones
    if (!tasaInteres || !flujosEfectivo) {
        throw new Error('Faltan datos necesarios para el cálculo');
    }

    if (flujosEfectivo.length === 0) {
        throw new Error('No hay flujos de efectivo para calcular');
    }

    if (periodoObjetivo === undefined || periodoObjetivo === null) {
        throw new Error('Falta especificar el periodo objetivo');
    }

    // Verificar que no hay flujos con expresiones X
    if (flujosEfectivo.some(flujo => typeof flujo.monto === 'string' && String(flujo.monto).toLowerCase().includes('x'))) {
        throw new Error('No se puede calcular valorEnN con flujos que contienen expresiones con X. Use calcularIncognitaX para resolver la incógnita X primero.');
    }

    // Determinar si hay flujos anteriores al periodo objetivo
    const existenFlujosAnteriores = flujosEfectivo.some(flujo => flujo.n <= periodoObjetivo);
    
    // * Cálculo del valor total
    let valorTotal = 0;
    
    // Si estamos calculando el valor presente o un periodo anterior a todos los flujos,
    // o no hay flujos anteriores al periodo objetivo, considerar todos
    const flujosRelevantes = (periodoObjetivo === 0 || !existenFlujosAnteriores) 
        ? flujosEfectivo 
        : flujosEfectivo.filter(flujo => flujo.n <= periodoObjetivo);
    
    for (const flujo of flujosRelevantes) {
        // Asegurarse de que el monto sea un número
        if (typeof flujo.monto === 'string') {
            flujo.monto = parseFloat(flujo.monto);
            if (isNaN(flujo.monto)) {
                throw new Error(`Valor de monto inválido: ${flujo.monto}. Debe ser un número o una expresión con X.`);
            }
        }
        
        const valor_calculado = calcularValorFlujoEnN(flujo, periodoObjetivo, tasaInteres);
        console.log("Valor calculado para el flujo: ", flujo, " es: ", valor_calculado);
        valorTotal += valor_calculado;
    }

    console.log("Valor total calculado: ", valorTotal);

    const valorRedondeado = Math.abs(Math.round(valorTotal * 100) / 100);

    console.log("Valor redondeado: ", valorRedondeado);

    return {
        valor: valorRedondeado,
        descripcion: `Valor calculado en el periodo ${periodoObjetivo}`
    };
}

// * funcion auxiliar para calcular el valor de un flujo en el periodo objetivo
// Función auxiliar para calcular el valor de un flujo en el periodo objetivo
function calcularValorFlujoEnN(
    flujo: Flujo,
    targetPeriod: number,
    interestRate: number): number {

    // Si el flujo tiene una expresión con X, no calculamos aquí
    if (typeof flujo.monto === 'string') {
        throw new Error('No se puede calcular un flujo con expresión X en calcularValorFlujoEnN');
    }

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
    // Verificar que no hay flujos con expresiones X
    if (flujos.some(flujo => typeof flujo.monto === 'string' && String(flujo.monto).toLowerCase().includes('x'))) {
        throw new Error('No se puede calcular TIR con flujos que contienen expresiones con X. Use calcularIncognitaX para resolver la incógnita X primero.');
    }

    // Convertir todos los montos a números si son cadenas válidas
    const flujosNumericos = flujos.map(flujo => {
        if (typeof flujo.monto === 'string') {
            const montoNumerico = parseFloat(flujo.monto);
            if (isNaN(montoNumerico)) {
                throw new Error(`Valor de monto inválido: ${flujo.monto}. Debe ser un número para calcular TIR.`);
            }
            return { ...flujo, monto: montoNumerico };
        }
        return flujo;
    });

    let lower = -0.99; // Para permitir tasas negativas (pero no -1 o menor)
    let upper = 1.0;   // Supongamos que la tasa no es mayor al 100%

    // * Funcion auxiliar para calcular el valor presente neto
    const calcularVPN = (rate: number) => {
        return flujosNumericos.reduce((total, flujo) => {
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

    // Verificar que no hay flujos con expresiones X
    if (flujosEfectivo.some(flujo => typeof flujo.monto === 'string' && String(flujo.monto).toLowerCase().includes('x'))) {
        throw new Error('No se puede calcular periodosParaMonto con flujos que contienen expresiones con X. Use calcularIncognitaX para resolver la incógnita X primero.');
    }

    // Convertir todos los montos a números si son cadenas válidas
    const flujosNumericos = flujosEfectivo.map(flujo => {
        if (typeof flujo.monto === 'string') {
            const montoNumerico = parseFloat(flujo.monto);
            if (isNaN(montoNumerico)) {
                throw new Error(`Valor de monto inválido: ${flujo.monto}. Debe ser un número para calcular periodos.`);
            }
            return { ...flujo, monto: montoNumerico };
        }
        return flujo;
    });

    // Encontrar el periodo más grande entre los flujos
    const ultimoPeriodo = Math.max(...flujosNumericos.map(flujo => flujo.n));
    console.log(`Último periodo de los flujos: ${ultimoPeriodo}`);
    
    // Función para calcular el valor en un periodo específico
    const calcularValorEnPeriodo = (periodo: number): number => {
        return flujosNumericos.reduce((acumulado, flujo) => {
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

// ! CASO 4: Calcular incógnita X en flujos de transacciones
function calcularIncognitaX(entradas: EntradasCalculo): ResultadoCalculo {
    console.log("Función: calcularIncognitaX");
    console.log("Entradas: ", entradas);

    const { tasaInteres, flujosEfectivo, puntoFocal } = entradas;

    // * Validaciones
    if (!tasaInteres || !flujosEfectivo) {
        throw new Error('Faltan datos necesarios para el cálculo');
    }

    if (flujosEfectivo.length === 0) {
        throw new Error('No hay flujos de efectivo para calcular');
    }

    // Identificar los flujos que contienen X y los que son solo numéricos
    const flujosConX: Array<{flujo: Flujo, coeficiente: number}> = [];
    const flujosNumericos: Array<Flujo> = [];

    // Regex para buscar expresiones con X y extraer su coeficiente
    const regexX = /^([-+]?\s*(?:\d*\.\d+|\d+)?)\s*[xX](?:\s*\/\s*(\d+(?:\.\d+)?))?$/;
    
    for (const flujo of flujosEfectivo) {
        if (typeof flujo.monto === 'string') {
            const montoStr = flujo.monto.trim().toLowerCase();
            
            // Verificar si contiene X
            if (montoStr.includes('x')) {
                const match = montoStr.match(regexX);
                
                if (match) {
                    let coeficiente = 1; // Por defecto, si solo se escribe 'x'
                    
                    // Si hay un coeficiente antes de X (ej: 2x, 0.5x, -3x)
                    if (match[1] && match[1].trim() !== '' && match[1].trim() !== '+') {
                        coeficiente = match[1].trim() === '-' ? -1 : parseFloat(match[1]);
                    }
                    
                    // Si X está dividida (ej: x/5, x/3)
                    if (match[2]) {
                        coeficiente /= parseFloat(match[2]);
                    }
                    
                    flujosConX.push({
                        flujo,
                        coeficiente
                    });
                    continue;
                }
            }
            
            // Si no se detectó una expresión válida con X, intentar convertir a número
            try {
                const montoNumerico = parseFloat(montoStr);
                if (!isNaN(montoNumerico)) {
                    // Crear una copia del flujo con el monto como número
                    flujosNumericos.push({
                        ...flujo,
                        monto: montoNumerico
                    });
                } else {
                    throw new Error(`No se pudo interpretar el monto: "${flujo.monto}"`);
                }
            } catch (error) {
                throw new Error(`No se pudo interpretar el monto: "${flujo.monto}"`);
            }
        } else {
            // Si ya es un número, solo lo añadimos a los flujos numéricos
            flujosNumericos.push(flujo);
        }
    }

    // Verificar que al menos hay un flujo con X
    if (flujosConX.length === 0) {
        throw new Error('No se encontró ningún flujo que contenga la incógnita X');
    }

    // Calcular el valor de los flujos numéricos
    // Para cada flujo con X, obtener su coeficiente y llevarlo al mismo período
    // mediante tasas de interés, igual que en el cálculo normal
    let coeficientesX = 0;
    let terminosIndependientes = 0;

    // Determinar el periodo de referencia (punto focal)
    // Si se proporciona un punto focal, usarlo; de lo contrario, usar el periodo del primer flujo con X
    const periodoReferencia = puntoFocal !== undefined ? puntoFocal : flujosConX[0].flujo.n;
    
    // Calcular los coeficientes de X
    for (const { flujo, coeficiente } of flujosConX) {
        let coeficienteAjustado = coeficiente;
        
        // Ajustar el coeficiente según la posición temporal respecto al período de referencia
        if (flujo.n !== periodoReferencia) {
            const distanciaPeriodos = Math.abs(flujo.n - periodoReferencia);
            
            if (flujo.n < periodoReferencia) {
                // Si el flujo es anterior al período de referencia, llevarlo al futuro
                coeficienteAjustado *= Math.pow(1 + tasaInteres, distanciaPeriodos);
            } else {
                // Si el flujo es posterior al período de referencia, traerlo al presente
                coeficienteAjustado /= Math.pow(1 + tasaInteres, distanciaPeriodos);
            }
        }
        
        // El signo depende del tipo de flujo
        const signo = flujo.tipo === "entrada" ? 1 : -1;
        coeficientesX += coeficienteAjustado * signo;
    }

    // Calcular los términos independientes (flujos numéricos)
    for (const flujo of flujosNumericos) {
        const valorEnPeriodoReferencia = calcularValorFlujoEnN(flujo, periodoReferencia, tasaInteres);
        
        // Los sumamos pero con signo negativo porque pasarán al otro lado de la ecuación
        terminosIndependientes -= valorEnPeriodoReferencia;
    }

    // La ecuación queda: coeficientesX * X = terminosIndependientes
    // Por lo tanto: X = terminosIndependientes / coeficientesX
    
    if (coeficientesX === 0) {
        throw new Error('El coeficiente de X es 0, no se puede despejar la ecuación');
    }
    
    const valorX = terminosIndependientes / coeficientesX;
    
    // Redondear a 2 decimales preservando el signo
    const valorRedondeado = Math.round(valorX * 100) / 100;
    
    // Preparar una descripción detallada de la resolución
    const ecuacion = `${coeficientesX.toFixed(2)}X = ${terminosIndependientes.toFixed(2)}`;
    const calculo = `X = ${terminosIndependientes.toFixed(2)} / ${coeficientesX.toFixed(2)}`;
    
    return {
        valor: valorRedondeado,
        descripcion: `Valor de X en el periodo ${periodoReferencia}: ${ecuacion}, por lo tanto ${calculo} = ${valorRedondeado}`
    };
}

export default calcular;