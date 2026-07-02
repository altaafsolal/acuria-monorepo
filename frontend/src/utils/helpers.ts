export function slugifyName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function textIncludes(value: string, query: string): boolean {
  return value.toLowerCase().includes(query.toLowerCase());
}

export function filterBySearch<T>(
  items: T[],
  query: string,
  getSearchableValues: (item: T) => string[],
): T[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return items;

  return items.filter((item) =>
    getSearchableValues(item).some((value) => textIncludes(value, normalizedQuery)),
  );
}
