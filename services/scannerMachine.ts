
export type ScannerState = 
    | 'IDLE' 
    | 'LOOKING_UP' 
    | 'AWAITING_PHARMA' 
    | 'COMMITTING' 
    | 'FEEDBACK_SUCCESS' 
    | 'FEEDBACK_ERROR' 
    | 'MANUAL_ENTRY' 
    | 'CONFIRMING_CLOSE';

export type ScannerEvent = 
    | { type: 'SCAN_INBOUND'; barcode: string }
    | { type: 'PRODUCT_RESOLVED'; needsPharma: boolean }
    | { type: 'PHARMA_COMPLETE'; mm?: number; yyyy?: number; batch?: string }
    | { type: 'COMMIT_COMPLETE' }
    | { type: 'ERROR_OCCURRED' }
    | { type: 'OPEN_MANUAL' }
    | { type: 'CLOSE_MANUAL' }
    | { type: 'TRIGGER_CLOSE' }
    | { type: 'CANCEL_CLOSE' }
    | { type: 'RESET' };

/**
 * MOTOR DE ESTADOS DETERMINISTA v1.0
 * Define las transiciones legales del escáner para evitar race conditions.
 */
export const scannerReducer = (state: ScannerState, event: ScannerEvent): ScannerState => {
    switch (state) {
        case 'IDLE':
            if (event.type === 'SCAN_INBOUND') return 'LOOKING_UP';
            if (event.type === 'OPEN_MANUAL') return 'MANUAL_ENTRY';
            if (event.type === 'TRIGGER_CLOSE') return 'CONFIRMING_CLOSE';
            break;

        case 'LOOKING_UP':
            if (event.type === 'PRODUCT_RESOLVED') {
                return event.needsPharma ? 'AWAITING_PHARMA' : 'COMMITTING';
            }
            if (event.type === 'ERROR_OCCURRED') return 'FEEDBACK_ERROR';
            break;

        case 'AWAITING_PHARMA':
            if (event.type === 'PHARMA_COMPLETE') return 'COMMITTING';
            if (event.type === 'RESET') return 'IDLE';
            break;

        case 'COMMITTING':
            if (event.type === 'COMMIT_COMPLETE') return 'FEEDBACK_SUCCESS';
            if (event.type === 'ERROR_OCCURRED') return 'FEEDBACK_ERROR';
            break;

        case 'FEEDBACK_SUCCESS':
        case 'FEEDBACK_ERROR':
            if (event.type === 'RESET') return 'IDLE';
            break;

        case 'MANUAL_ENTRY':
            if (event.type === 'CLOSE_MANUAL') return 'IDLE';
            if (event.type === 'SCAN_INBOUND') return 'LOOKING_UP';
            break;

        case 'CONFIRMING_CLOSE':
            if (event.type === 'CANCEL_CLOSE') return 'IDLE';
            break;
    }

    // Si el evento no es válido para el estado actual, mantenemos el estado (Protección)
    return state;
};
