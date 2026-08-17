/**
 * Finds a name that doesn't collide within the target scope (folder or parent
 * folder), auto-suffixing " (1)", " (2)", ... before the extension — mirrors how
 * Finder/Explorer resolve duplicate names so uploads/renames never hard-fail on
 * a conflict.
 */
export async function resolveConflictFreeName(
  desiredName: string,
  exists: (candidate: string) => Promise<boolean>,
): Promise<string> {
  if (!(await exists(desiredName))) {
    return desiredName;
  }

  const lastDot = desiredName.lastIndexOf('.');
  const hasExtension = lastDot > 0 && lastDot < desiredName.length - 1;
  const base = hasExtension ? desiredName.slice(0, lastDot) : desiredName;
  const extension = hasExtension ? desiredName.slice(lastDot) : '';

  for (let suffix = 1; suffix < 1000; suffix++) {
    const candidate = `${base} (${suffix})${extension}`;
    if (!(await exists(candidate))) {
      return candidate;
    }
  }

  throw new Error(`Could not find a free name for "${desiredName}"`);
}
