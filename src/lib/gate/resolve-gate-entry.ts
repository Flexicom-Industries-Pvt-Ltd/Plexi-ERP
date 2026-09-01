import { db } from "@/lib/db";

/** Resolve a gate entry from URL param (entry number e.g. GE-… or internal cuid id). */
export async function findGateEntryByIdOrNumber(idOrNumber: string) {
  const byEntryNumber = await db.gateEntry.findUnique({ where: { entryNumber: idOrNumber } });
  if (byEntryNumber) return byEntryNumber;

  return db.gateEntry.findUnique({ where: { id: idOrNumber } });
}

export function gateEntryMatchesRouteParam(
  entry: { id: string; entryNumber: string },
  idOrNumber: string
) {
  return entry.id === idOrNumber || entry.entryNumber === idOrNumber;
}
