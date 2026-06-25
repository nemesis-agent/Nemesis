/**
 * Minimal ambient types for `node:sqlite`, covering only the API surface
 * this package uses. The installed @types/node version at the time this
 * package was written does not yet ship official types for this module
 * (it's still marked experimental upstream). If/when @types/node adds
 * full coverage, this file can be deleted safely — these declarations
 * are intentionally narrow rather than a full re-implementation of the
 * upstream API.
 */
declare module "node:sqlite" {
  export interface StatementResultingChanges {
    changes: number | bigint;
    lastInsertRowid: number | bigint;
  }

  export class StatementSync {
    run(...params: unknown[]): StatementResultingChanges;
    get(...params: unknown[]): Record<string, unknown> | undefined;
    all(...params: unknown[]): Record<string, unknown>[];
  }

  export interface DatabaseSyncOptions {
    open?: boolean;
  }

  export class DatabaseSync {
    constructor(path: string, options?: DatabaseSyncOptions);
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }
}
