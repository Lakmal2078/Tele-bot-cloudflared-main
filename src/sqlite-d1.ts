import type { D1Database, D1PreparedStatement } from "./types";

export function createD1Database(_dbPath?: string): D1Database {
  return {
    prepare(query: string): D1PreparedStatement {
      return {
        bind(...values: any[]): D1PreparedStatement {
          return this;
        },
        async first<T = unknown>(): Promise<T | null> {
          return null;
        },
        async all<T = unknown>(): Promise<{ results: T[]; success: boolean }> {
          return { results: [], success: true };
        },
        async run(): Promise<{ success: boolean; meta?: any }> {
          return { success: true };
        },
      };
    },
    exec() {},
    async batch(): Promise<any[]> {
      return [];
    },
  };
}

