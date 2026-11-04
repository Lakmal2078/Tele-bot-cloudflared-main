type Bucket = { bucket_key: string; count: number; reset_at: number; max_count: number };

export function createMockD1(): any {
  const buckets = new Map<string, Bucket>();

  const createStatement = (sql: string) => {
    let args: any[] = [];
    const statement: any = {
      bind: (...values: any[]) => {
        args = values;
        return statement;
      },
      first: async () => {
        if (sql.includes("INSERT INTO rate_limit_buckets") && sql.includes("RETURNING")) {
          const [key, resetAt, maxCount, now] = args;
          const existing = buckets.get(key);
          const row: Bucket = existing
            ? {
                ...existing,
                count: existing.reset_at <= now ? 1 : existing.count + 1,
                reset_at: existing.reset_at <= now ? resetAt : existing.reset_at,
                max_count: maxCount,
              }
            : { bucket_key: key, count: 1, reset_at: resetAt, max_count: maxCount };
          buckets.set(key, row);
          return { bucket_key: row.bucket_key, count: row.count, reset_at: row.reset_at };
        }
        if (sql.includes("FROM rate_limit_buckets")) {
          const row = buckets.get(String(args[0]));
          return row
            ? { bucket_key: row.bucket_key, count: row.count, reset_at: row.reset_at }
            : null;
        }
        return { c: 0 };
      },
      all: async () => {
        if (!sql.includes("FROM rate_limit_buckets")) return { results: [] };
        const keys = new Set(args.map(String));
        return {
          results: [...buckets.values()]
            .filter((bucket) => keys.has(bucket.bucket_key))
            .map(({ bucket_key, count, reset_at }) => ({ bucket_key, count, reset_at })),
        };
      },
      run: async () => {
        if (sql.includes("DELETE FROM rate_limit_buckets")) {
          if (sql.includes("bucket_key = ?")) {
            return { success: true, meta: { changes: Number(buckets.delete(String(args[0]))) } };
          }
          const before = buckets.size;
          for (const [key, bucket] of buckets) {
            if (bucket.reset_at <= Number(args[0])) buckets.delete(key);
          }
          return { success: true, meta: { changes: before - buckets.size } };
        }
        return { success: true, meta: { changes: 1 } };
      },
      _sql: sql,
      _args: () => args,
    };
    return statement;
  };

  return {
    prepare: (sql: string) => createStatement(sql),
    batch: async (statements: any[]) => {
      const inserts = statements.slice(0, -1);
      for (const statement of inserts) {
        const [key, resetAt, maxCount] = statement._args();
        if (!buckets.has(String(key))) {
          buckets.set(String(key), {
            bucket_key: String(key),
            count: 0,
            reset_at: Number(resetAt),
            max_count: Number(maxCount),
          });
        }
      }

      const update = statements[statements.length - 1];
      const values = update._args();
      const now = Number(values[0]);
      const keys = inserts.map((statement) => String(statement._args()[0]));
      const blocked = keys.some((key) => {
        const bucket = buckets.get(key);
        return !!bucket && bucket.reset_at > now && bucket.count >= bucket.max_count;
      });

      if (!blocked) {
        const resetByKey = new Map<string, number>();
        for (let index = 2; index < 2 + keys.length * 2; index += 2) {
          resetByKey.set(String(values[index]), Number(values[index + 1]));
        }
        for (const key of keys) {
          const bucket = buckets.get(key)!;
          if (bucket.reset_at <= now) {
            bucket.count = 1;
            bucket.reset_at = resetByKey.get(key) ?? bucket.reset_at;
          } else {
            bucket.count += 1;
          }
        }
      }

      return statements.map((_: any, index: number) => ({
        success: true,
        meta: { changes: index === statements.length - 1 ? (blocked ? 0 : keys.length) : 1 },
      }));
    },
    exec: async () => ({ count: 0, duration: 0 }),
  };
}
