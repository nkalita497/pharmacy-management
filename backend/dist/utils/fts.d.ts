export declare function initFts(): Promise<void>;
export declare function rebuildFtsIndex(): Promise<void>;
export interface FtsHit {
    entity_type: string;
    entity_id: number;
    title: string;
    body: string;
    rank: number;
}
export declare function searchFts(query: string, limit?: number): Promise<FtsHit[]>;
//# sourceMappingURL=fts.d.ts.map