const PAGE_SIZE = 1000;

/**
 * Supabase/PostgREST caps a single response at the project's configured
 * max-rows setting (1000 here) regardless of any .limit() passed to the
 * client — a query scanning a whole account (not bounded by a workout,
 * exercise, or time range) silently truncates past that with no error.
 * Pages through with .range() until a short page confirms the end.
 */
export async function fetchAllRows<T>(
  queryPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await queryPage(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;

    all.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return all;
}
