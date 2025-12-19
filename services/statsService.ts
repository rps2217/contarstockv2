
import { db } from '../db';
import { startOfDay, subDays, format, eachHourOfInterval, endOfHour, startOfHour } from 'date-fns';

export interface ProductivityPoint {
    time: string;
    items: number;
}

export const getHourlyProductivity = async (days: number = 1): Promise<ProductivityPoint[]> => {
    const now = Date.now();
    const start = startOfDay(subDays(now, days - 1)).getTime();
    
    const scans = await db.scans
        .where('timestamp')
        .aboveOrEqual(start)
        .toArray();

    const hours = eachHourOfInterval({
        start: startOfHour(start),
        end: startOfHour(now)
    });

    return hours.map(hour => {
        const hStart = hour.getTime();
        const hEnd = endOfHour(hour).getTime();
        const count = scans
            .filter(s => s.timestamp >= hStart && s.timestamp <= hEnd)
            .reduce((acc, s) => acc + s.quantity, 0);
        
        return {
            time: format(hour, 'HH:mm'),
            items: count
        };
    });
};

export const getOverallEfficiency = async () => {
    const totalScans = await db.scans.count();
    const sessions = await db.sessions.count();
    const products = await db.products.count();
    return { totalScans, sessions, products };
};
