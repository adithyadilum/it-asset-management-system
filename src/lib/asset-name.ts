/**
 * How a person refers to the thing: "Dell Latitude 5540", not "Latitude 5540".
 * The brand is dropped when the model name already leads with it.
 *
 * Lives here rather than beside the grid that first needed it. It is a pure
 * string helper, but it was exported from a `'use client'` module, so importing
 * it into the My Assets server component made it a client reference and the
 * page threw "Attempted to call formatAssetName() from the server". Server and
 * client both reach it from here.
 */
export function formatAssetName(brandName: string | null, modelName: string) {
  if (!brandName) return modelName;
  return modelName.toLowerCase().startsWith(brandName.toLowerCase())
    ? modelName
    : `${brandName} ${modelName}`;
}
