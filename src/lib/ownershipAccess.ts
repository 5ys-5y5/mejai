export type OwnershipRow = {
  created_by?: string | null;
  owner_user_ids?: string[] | null;
  allowed_user_ids?: string[] | null;
  is_public?: boolean | null;
};

function normalizeId(value?: string | null) {
  const id = String(value || "").trim();
  return id.length > 0 ? id : null;
}

function normalizeIdSet(ids?: string[] | null) {
  if (!Array.isArray(ids)) return new Set<string>();
  const set = new Set<string>();
  for (const raw of ids) {
    const value = String(raw || "").trim();
    if (value) set.add(value);
  }
  return set;
}

export function canRead(row: OwnershipRow | null | undefined, userId?: string | null) {
  if (!row) return false;
  if (row.is_public === true) return true;
  const normalizedUserId = normalizeId(userId);
  if (!normalizedUserId) return false;
  if (normalizeId(row.created_by) === normalizedUserId) return true;
  const owners = normalizeIdSet(row.owner_user_ids);
  if (owners.has(normalizedUserId)) return true;
  const allowed = normalizeIdSet(row.allowed_user_ids);
  return allowed.has(normalizedUserId);
}

export function canWrite(row: OwnershipRow | null | undefined, userId?: string | null) {
  if (!row) return false;
  const normalizedUserId = normalizeId(userId);
  if (!normalizedUserId) return false;
  if (normalizeId(row.created_by) === normalizedUserId) return true;
  const owners = normalizeIdSet(row.owner_user_ids);
  return owners.has(normalizedUserId);
}

export function filterReadable<T extends OwnershipRow>(rows: T[], userId?: string | null) {
  return rows.filter((row) => canRead(row, userId));
}
