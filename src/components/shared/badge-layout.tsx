/**
 * The one badge shape used across the app.
 *
 * Badges had drifted into three different looks: this one (the asset registry
 * pillar badge), a smaller `h-5 rounded-full px-2 text-[11px]` pill in the
 * assignments grid, and hand-rolled `<span>`s with their own ring and padding
 * in the registry columns. Sharing the layout between `PillarBadge` and
 * `StatusBadge` is what keeps them identical; the colour still comes from
 * whatever the badge is describing.
 */
export const BADGE_LAYOUT =
  'flex w-fit items-center gap-1.5 px-2.5 py-0.5 font-medium whitespace-nowrap';
