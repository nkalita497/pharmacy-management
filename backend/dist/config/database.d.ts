import sqlite3 from 'sqlite3';
export declare function getDb(): sqlite3.Database;
export declare function reopenDatabase(): Promise<void>;
declare const dbProxy: sqlite3.Database;
export default dbProxy;
//# sourceMappingURL=database.d.ts.map