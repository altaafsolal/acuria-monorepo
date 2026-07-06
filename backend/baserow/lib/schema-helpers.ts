import { createField, createTable } from '../../src/services/baserow/api.js';
import type { BaserowTable } from '../types/baserow.js';
import type { FieldDef } from '../types/baserow.js';

export async function ensureField(
  tableId: string | number,
  fieldDef: FieldDef,
  existingNames: Set<string>,
): Promise<void> {
  if (existingNames.has(fieldDef.name)) {
    console.log(`    · field "${fieldDef.name}" already exists`);
    return;
  }
  await createField(tableId, fieldDef);
  existingNames.add(fieldDef.name);
  console.log(`    ✓ created field "${fieldDef.name}"`);
}

export async function ensureTable(
  databaseId: string,
  tableName: string,
  existingTables: BaserowTable[],
): Promise<BaserowTable> {
  let table = existingTables.find((t) => t.name === tableName);
  if (!table) {
    table = await createTable(databaseId, tableName);
    console.log(`  ✓ created table "${tableName}" (id: ${table.id})`);
  } else {
    console.log(`  · table "${tableName}" already exists (id: ${table.id})`);
  }
  return table;
}

export async function ensureTextFields(
  tableId: string | number,
  names: string[],
  existing: Set<string>,
): Promise<void> {
  for (const name of names) {
    await ensureField(tableId, { name, type: 'text' }, existing);
  }
}
