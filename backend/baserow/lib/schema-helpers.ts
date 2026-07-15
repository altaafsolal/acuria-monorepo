import { createField, createTable, deleteField, updateField, updateTable } from '../../src/services/baserow/api.js';
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

/** Renames a field if `oldName` exists and `newName` does not. Idempotent. */
export async function renameField(
  tableId: string | number,
  oldName: string,
  newName: string,
  existingNames: Set<string>,
): Promise<void> {
  if (existingNames.has(newName)) {
    console.log(`    · field "${oldName}" already renamed to "${newName}"`);
    return;
  }
  if (!existingNames.has(oldName)) {
    console.log(`    · field "${oldName}" not found, skipping rename`);
    return;
  }
  // Need the field id — re-fetch fields to get it.
  const { listTableFieldsWithJwt } = await import('../../src/services/baserow/api.js');
  const fields = await listTableFieldsWithJwt(tableId);
  const field = fields.find((f) => f.name === oldName);
  if (!field) return;
  await updateField(field.id, { name: newName });
  existingNames.delete(oldName);
  existingNames.add(newName);
  console.log(`    ✓ renamed field "${oldName}" → "${newName}"`);
}

/** Renames a table if `oldName` exists and `newName` does not. Idempotent. */
export async function renameTable(
  databaseId: string,
  oldName: string,
  newName: string,
  existingTables: BaserowTable[],
): Promise<void> {
  const hasNew = existingTables.some((t) => t.name === newName);
  const oldTable = existingTables.find((t) => t.name === oldName);

  if (hasNew && oldTable) {
    console.log(
      `  ⚠ both "${oldName}" and "${newName}" exist in database ${databaseId} — skipping rename. Merge and delete "${oldName}" manually.`,
    );
    return;
  }
  if (hasNew) {
    console.log(`  · table "${oldName}" already renamed to "${newName}"`);
    return;
  }
  if (!oldTable) {
    console.log(`  · table "${oldName}" not found, skipping rename`);
    return;
  }
  await updateTable(oldTable.id, { name: newName });
  oldTable.name = newName;
  console.log(`  ✓ renamed table "${oldName}" → "${newName}"`);
}

/** Deletes a field if it exists. Idempotent. */
export async function deleteFieldIfExists(
  tableId: string | number,
  name: string,
  existingNames: Set<string>,
): Promise<void> {
  if (!existingNames.has(name)) {
    console.log(`    · field "${name}" not found, skipping delete`);
    return;
  }
  const { listTableFieldsWithJwt } = await import('../../src/services/baserow/api.js');
  const fields = await listTableFieldsWithJwt(tableId);
  const field = fields.find((f) => f.name === name);
  if (!field) return;
  await deleteField(field.id);
  existingNames.delete(name);
  console.log(`    ✓ deleted field "${name}"`);
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
