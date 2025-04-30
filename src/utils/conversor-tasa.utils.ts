// Tipos y enums
type Periodo =
    | "diario"
    | "semanal"
    | "quincenal"
    | "mensual"
    | "bimestral"
    | "trimestral"
    | "cuatrimestral"
    | "semestral"
    | "anual";

type TipoTasa =
    | "E"    // Efectiva anual
    | "Tnv"  // Tasa nominal vencida
    | "Tna"  // Tasa nominal anticipada
    | "iev"  // Tasa periódica vencida
    | "iea"; // Tasa periódica anticipada

const periodoAM: Record<Periodo, number> = {
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

export default function convertirTasaInteres({
    valor,
    tipoOrigen,
    periodoPagoOrigen,
    periodoCapitalizacionOrigen,
    tipoDestino,
    periodoPagoDestino,
    periodoCapitalizacionDestino,
}: {
    valor: number;
    tipoOrigen: TipoTasa;
    periodoPagoOrigen: Periodo;
    periodoCapitalizacionOrigen?: Periodo;
    tipoDestino: TipoTasa;
    periodoPagoDestino: Periodo;
    periodoCapitalizacionDestino?: Periodo;
}): number {
    console.warn("fn convertirTasaInteres");

    // Si no se proporciona el periodo de capitalización, se asume que es igual al periodo de pago
    const periodoCapOrigen = periodoCapitalizacionOrigen || periodoPagoOrigen;
    const periodoCapDestino = periodoCapitalizacionDestino || periodoPagoDestino;

    console.log("valor:", valor);
    console.log("tipoOrigen:", tipoOrigen);
    console.log("periodoPagoOrigen:", periodoPagoOrigen);
    console.log("periodoCapitalizacionOrigen:", periodoCapOrigen);
    console.log("tipoDestino:", tipoDestino);
    console.log("periodoPagoDestino:", periodoPagoDestino);
    console.log("periodoCapitalizacionDestino:", periodoCapDestino);

    // Valores de m para los períodos
    const mPagoOrigen = periodoAM[periodoPagoOrigen];
    const mCapOrigen = periodoAM[periodoCapOrigen];
    const mPagoDestino = periodoAM[periodoPagoDestino];
    const mCapDestino = periodoAM[periodoCapDestino];

    console.log("mPagoOrigen:", mPagoOrigen);
    console.log("mCapOrigen:", mCapOrigen);
    console.log("mPagoDestino:", mPagoDestino);
    console.log("mCapDestino:", mCapDestino);
    
    // Paso 1: Convertir a tasa efectiva anual (E)
    let tasaEfectivaAnual = convertirAEfectivaAnual(valor, tipoOrigen, mPagoOrigen, mCapOrigen);
    console.log("tasaEfectivaAnual:", tasaEfectivaAnual);
    
    // Paso 2: Convertir desde E al tipo de tasa destino
    let resultado = convertirDesdeEfectivaAnual(tasaEfectivaAnual, tipoDestino, mPagoDestino, mCapDestino);
    console.log("resultado:", resultado);

    return resultado;
}

/**
 * Convierte cualquier tipo de tasa a Efectiva Anual (E)
 */
function convertirAEfectivaAnual(
    valor: number, 
    tipo: TipoTasa, 
    mPago: number, 
    mCap: number
): number {
    console.warn("fn convertirAEfectivaAnual");

    console.log("valor: ", valor);
    console.log("tipo: ", tipo);
    console.log("mPago: ", mPago);
    console.log("mCap: ", mCap);

    switch (tipo) {
        case "E":
            return valor;
            
        case "Tnv": {
            // Tnv -> E
            return Math.pow(1 + (valor / mCap), mCap) - 1;
        }
            
        case "iev": {
            // iev -> Tnv -> E
            const tnv = valor * mPago;
            return Math.pow(1 + (tnv / mCap), mCap) - 1;
        }
            
        case "iea": {
            // iea -> iev -> Tnv -> E
            const iev = valor / (1 - valor);
            const tnv = iev * mPago;
            return Math.pow(1 + (tnv / mCap), mCap) - 1;
        }
            
        case "Tna": {
            // Tna -> iea -> iev -> Tnv -> E
            const iea = valor / mCap;
            const iev = iea / (1 - iea);
            const tnv = iev * mCap;

            return Math.pow(1 + (tnv / mCap), mCap) - 1;
        }
            
        default:
            throw new Error(`Tipo de tasa de origen no soportado: ${tipo}`);
    }
}

/**
 * Convierte desde Efectiva Anual (E) a cualquier otro tipo de tasa
 */
function convertirDesdeEfectivaAnual(
    tasaEfectivaAnual: number, 
    tipoDestino: TipoTasa, 
    mPago: number, 
    mCap: number
): number {
    console.warn("fn convertirDesdeEfectivaAnual");

    console.log("tasaEfectivaAnual: ", tasaEfectivaAnual);
    console.log("tipoDestino: ", tipoDestino);
    console.log("mPago: ", mPago);
    console.log("mCap: ", mCap);

    switch (tipoDestino) {
        case "E":
            return tasaEfectivaAnual;
            
        case "Tnv": {
            // E -> iev -> Tnv
            const iev = Math.pow(1 + tasaEfectivaAnual, 1 / mCap) - 1;
            return iev * mPago;
        }
            
        case "iev": {
            // E -> iev
            const iev = Math.pow(1 + tasaEfectivaAnual, 1 / mCap) - 1;
            console.log("iev: ", iev);
            return iev;
        }
            
        case "iea": {
            // E -> iev -> iea
            const iev = Math.pow(1 + tasaEfectivaAnual, 1 / mCap) - 1;
            return iev / (1 + iev);
        }
            
        case "Tna": {
            // E -> iev -> iea -> Tna
            const iev = Math.pow(1 + tasaEfectivaAnual, 1 / mCap) - 1;
            const iea = iev / (1 + iev);
            return iea * mPago;
        }
            
        default:
            throw new Error(`Tipo de tasa destino no soportado: ${tipoDestino}`);
    }
}