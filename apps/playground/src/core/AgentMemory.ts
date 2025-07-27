import fs from 'fs';
import path from 'path';

import { MemoryEntry } from './AgentProtocol';

export interface MemoryStore {
  record(traceId: string, entry: MemoryEntry): void;
  recall(traceId: string): MemoryEntry[];
}

export class FileMemoryStore implements MemoryStore {
  private baseDir = path.join(process.cwd(), 'memory');

  constructor() {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  private getFilePath(traceId: string): string {
    return path.join(this.baseDir, `${traceId}.json`);
  }

  record(traceId: string, entry: MemoryEntry) {
    const filePath = this.getFilePath(traceId);
    let data: MemoryEntry[] = [];

    if (fs.existsSync(filePath)) {
      data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }

    data.push(entry);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  recall(traceId: string): MemoryEntry[] {
    const filePath = this.getFilePath(traceId);
    if (!fs.existsSync(filePath)) return [];
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }
}

export class AgentMemory {
  private store: MemoryStore;

  constructor(store?: MemoryStore) {
    this.store = store || new FileMemoryStore();
  }

  record(traceId: string, entry: MemoryEntry) {
    this.store.record(traceId, entry);
  }

  recall(traceId: string): MemoryEntry[] {
    return this.store.recall(traceId);
  }
}
