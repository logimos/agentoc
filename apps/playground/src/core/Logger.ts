import * as fs from 'fs';
import * as path from 'path';

export interface LogEntry {
  timestamp: string;
  traceId: string;
  direction: 'send' | 'receive';
  from: string;
  to: string;
  content: string;
}

export interface LogSink {
  write(entry: LogEntry): void;
}

export class FileLogSink implements LogSink {
  private baseDir = path.join(process.cwd(), 'logs');

  constructor() {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  write(entry: LogEntry): void {
    const filePath = path.join(this.baseDir, `${entry.traceId}.log`);
    const line = `[${entry.timestamp}] ${entry.direction.toUpperCase()} ${entry.from} → ${entry.to} :: ${entry.content.replace(/\n/g, ' ')}`;
    fs.appendFileSync(filePath, line + '\n');
  }
}

export class Logger {
  private sink: LogSink;

  constructor(sink?: LogSink) {
    this.sink = sink ?? new FileLogSink();
  }

  logSend(traceId: string, from: string, to: string, content: string) {
    this.sink.write({
      timestamp: new Date().toISOString(),
      traceId,
      direction: 'send',
      from,
      to,
      content,
    });
  }

  logReceive(traceId: string, from: string, to: string, content: string) {
    this.sink.write({
      timestamp: new Date().toISOString(),
      traceId,
      direction: 'receive',
      from,
      to,
      content,
    });
  }
}
