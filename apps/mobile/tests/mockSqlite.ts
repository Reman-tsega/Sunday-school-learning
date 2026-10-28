import initSqlJs from 'sql.js';
import type { ISqliteDb } from '../src/database/sqliteDb';
import { initDatabase } from '../src/database/sqliteDb';

export async function createInMemorySqliteDb(): Promise<ISqliteDb> {
  const SQL = await initSqlJs();
  const db = new SQL.Database();

  const sqliteDb: ISqliteDb = {
    async execAsync(sql: string) {
      db.exec(sql);
    },
    async runAsync(sql: string, params: unknown[] = []) {
      const stmt = db.prepare(sql);
      stmt.run(params as any[]);
      const changes = db.getRowsModified();
      stmt.free();
      return { changes, lastInsertRowId: 1 };
    },
    async getAllAsync<T>(sql: string, params: unknown[] = []): Promise<T[]> {
      const stmt = db.prepare(sql);
      stmt.bind(params as any[]);
      const results: T[] = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject() as T);
      }
      stmt.free();
      return results;
    },
    async getFirstAsync<T>(sql: string, params: unknown[] = []): Promise<T | null> {
      const stmt = db.prepare(sql);
      stmt.bind(params as any[]);
      if (stmt.step()) {
        const obj = stmt.getAsObject() as T;
        stmt.free();
        return obj;
      }
      stmt.free();
      return null;
    },
  };

  await initDatabase(sqliteDb);
  return sqliteDb;
}
