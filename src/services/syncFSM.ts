
import { db } from '../db';
import { firebaseSyncService } from './firebaseSyncService';
import { logger } from './logger';

export type SyncState = 'IDLE' | 'SYNCING' | 'ERROR' | 'SUCCESS';

export interface SyncStatus {
  state: SyncState;
  lastSync?: number;
  error?: string;
  pendingCount: number;
}

class SyncStateMachine {
  private state: SyncState = 'IDLE';
  private lastSync: number = 0;
  private error?: string;
  private listeners: ((status: SyncStatus) => void)[] = [];

  constructor() {
    // Initial check for pending data
    this.updateStatus();
  }

  public subscribe(listener: (status: SyncStatus) => void) {
    this.listeners.push(listener);
    this.notify();
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    const status: SyncStatus = {
      state: this.state,
      lastSync: this.lastSync,
      error: this.error,
      pendingCount: 0 // Will be updated by updateStatus
    };
    
    this.getPendingCount().then(count => {
      status.pendingCount = count;
      this.listeners.forEach(l => l(status));
    });
  }

  private async getPendingCount(): Promise<number> {
    const pendingScans = await db.scans.where('synced').equals(0).count();
    const pendingDynamic = await db.dynamic_data.where('syncStatus').equals('pending').count();
    return pendingScans + pendingDynamic;
  }

  private async updateStatus() {
    this.notify();
  }

  public async transition(action: 'START' | 'FAIL' | 'RESOLVE') {
    const oldState = this.state;

    switch (action) {
      case 'START':
        this.state = 'SYNCING';
        this.error = undefined;
        break;
      case 'FAIL':
        this.state = 'ERROR';
        break;
      case 'RESOLVE':
        this.state = 'SUCCESS';
        this.lastSync = Date.now();
        this.error = undefined;
        // Back to IDLE after a delay
        setTimeout(() => {
          if (this.state === 'SUCCESS') {
            this.state = 'IDLE';
            this.notify();
          }
        }, 3000);
        break;
    }

    if (oldState !== this.state) {
      logger.info('SYNC_FSM', `Transition: ${oldState} -> ${this.state}`);
      this.notify();
    }
  }

  public async runSync() {
    if (this.state === 'SYNCING') return;

    await this.transition('START');

    try {
      // 1. Sync Scans
      const pendingScans = await db.scans.where('synced').equals(0).toArray();
      if (pendingScans.length > 0) {
        const result = await firebaseSyncService.pushBatch('scans', pendingScans);
        if (result.success) {
          await db.scans.where('id').anyOf(pendingScans.map(s => s.id)).modify({ synced: 1 });
        } else {
          throw new Error(result.error);
        }
      }

      // 2. Sync Dynamic Data
      const pendingDynamic = await db.dynamic_data.where('syncStatus').equals('pending').toArray();
      for (const record of pendingDynamic) {
        const result = await firebaseSyncService.pushChange(record.tableName, record.id, record.data);
        // pushChange doesn't return success, it throws on error
        await db.dynamic_data.update(record.id, { syncStatus: 'synced' });
      }

      await this.transition('RESOLVE');
    } catch (err: any) {
      this.error = err.message;
      await this.transition('FAIL');
      logger.error('SYNC_FSM_ERROR', err.message);
    }
  }

  public getState() {
    return this.state;
  }
}

export const syncFSM = new SyncStateMachine();

// Forced GitHub sync
