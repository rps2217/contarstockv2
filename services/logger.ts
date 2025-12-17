
import { db, SystemLog } from '../db';

const MAX_LOGS = 1000; // Rotate logs to save space

const writeLog = async (level: SystemLog['level'], module: string, message: string, details?: any) => {
    try {
        // Console mirror
        const style = level === 'error' ? 'color: red' : level === 'success' ? 'color: green' : 'color: blue';
        console.log(`%c[${module}] ${message}`, style, details || '');

        await db.logs.add({
            level,
            module,
            message,
            details: details ? JSON.stringify(details) : undefined,
            timestamp: Date.now()
        });

        // Rotation Logic (Lazy cleanup)
        // Only run cleanup occasionally (e.g. 10% chance) to avoid blocking main thread often
        if (Math.random() < 0.1) {
            const count = await db.logs.count();
            if (count > MAX_LOGS) {
                const limit = count - MAX_LOGS;
                const keys = await db.logs.orderBy('timestamp').limit(limit).primaryKeys();
                await db.logs.bulkDelete(keys);
            }
        }
    } catch (e) {
        console.error("Logger failed", e);
    }
};

export const logger = {
    info: (module: string, message: string, details?: any) => writeLog('info', module, message, details),
    warn: (module: string, message: string, details?: any) => writeLog('warn', module, message, details),
    error: (module: string, message: string, details?: any) => writeLog('error', module, message, details),
    success: (module: string, message: string, details?: any) => writeLog('success', module, message, details),
    
    getRecent: async (limit = 100) => {
        return await db.logs.orderBy('timestamp').reverse().limit(limit).toArray();
    },
    
    clear: async () => {
        await db.logs.clear();
    }
};
