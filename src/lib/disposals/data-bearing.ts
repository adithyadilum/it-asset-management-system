/**
 * Whether a disposed asset needs its data-sanitisation confirmed.
 *
 * Categories are free-form master data -- `categorySchema` accepts any trimmed
 * name -- so there is no authoritative flag to read. Until one exists (see the
 * note below) this module is the single place that decides, and both the
 * dialog and `executeAssetDisposal` import it rather than each carrying their
 * own copy of the rule.
 *
 * The rule is deliberately inverted from the obvious one. Matching a list of
 * data-bearing names (`laptop`, `phone`, ...) fails open: every name the list
 * does not anticipate -- a plural like `Laptops`, a rename like `Smartphone`,
 * `PC`, or `Notebook`, or a category that simply did not exist when the list
 * was written -- silently skips the confirmation and is filed as "not wiped".
 * So instead we match the names we can positively say hold no user data and
 * require confirmation for everything else, including anything unrecognised.
 * The cost of a false positive is one extra checkbox on a chair; the cost of a
 * false negative is a laptop leaving the building with its disk intact and a
 * compliance record saying otherwise.
 *
 * TODO: this still reads a display name. The durable fix is a `dataBearing`
 * column on `categories`, set when the category is created and edited in
 * master data, which would make the classification explicit rather than
 * inferred. That is a schema change and deliberately out of scope here.
 */

/**
 * Categories that positively hold no user data.
 *
 * Furniture and fittings, plus the electronics whose storage is either absent
 * or not user data: a monitor, cable, or UPS is electronic but carries nothing
 * to wipe. Printers, scanners and copiers are intentionally NOT here -- they
 * spool documents to internal storage.
 */
const NON_DATA_BEARING =
  /\b(chair|desk|table|cabinet|shelf|shelving|sofa|couch|bed|drawer|wardrobe|cupboard|locker|rack|stand|filing|bookcase|partition|whiteboard|furniture|monitor|display|screen|projector|cable|adapter|charger|battery|ups|power|surge|speaker|headset|headphone|microphone|mouse|keyboard|mousepad|docking|dock|stationery|consumable|toner|cartridge|paper)\b/;

/**
 * True when disposing this category must record a wipe confirmation.
 *
 * An empty or unknown name returns true: callers that cannot resolve a
 * category (the pending-disposals grid has no category on its rows) must ask
 * rather than assume.
 */
export function requiresDataWipeConfirmation(
  categoryName: string | null | undefined
): boolean {
  const name = (categoryName ?? '').toLowerCase().trim();
  if (!name) return true;
  return !NON_DATA_BEARING.test(name);
}

/**
 * True when any category in the batch needs the confirmation.
 *
 * Bulk disposals are the case the first version of this feature got wrong: it
 * treated "more than one asset" as evidence of a mixed batch and waived the
 * requirement entirely, so a trolley of laptops could be retired with no
 * sanitisation record at all. A batch is only exempt when every asset in it is
 * exempt.
 */
export function batchRequiresDataWipeConfirmation(
  categoryNames: readonly (string | null | undefined)[]
): boolean {
  if (categoryNames.length === 0) return true;
  return categoryNames.some(requiresDataWipeConfirmation);
}
