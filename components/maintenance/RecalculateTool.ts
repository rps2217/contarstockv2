
import { db } from '../../db';
import { recalculateSessionMetadata } from '../../services/sessionService';

export const runFullMetadataRepair = async () => {
    const sessions = await db.sessions.toArray();
    let fixed = 0;
    
    for (const s of sessions) {
        try {
            await recalculateSessionMetadata(s.id);
            fixed++;
        } catch (e) {
            console.error(`Error reparando sesión ${s.id}`, e);
        }
    }
    
    return fixed;
};
