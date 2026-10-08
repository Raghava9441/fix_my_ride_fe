/**
 * Column headings for the staff list.
 *
 * Rendered only once the rows are in column mode at `lg`; below that the
 * grid has stacked and each cell carries its own label.
 *
 * The grid template is duplicated from `StaffRow` rather than shared through
 * a constant: Tailwind only emits a class it can see literally in the
 * source, so hoisting the string into a variable both files import would
 * produce a grid with no columns. The two are kept adjacent so changing one
 * is an obvious prompt to change the other.
 */
export function StaffListHeader() {
  return (
    <div
      aria-hidden
      className="hidden border-b border-border bg-surface-sunken px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-text-faint lg:grid lg:grid-cols-[minmax(0,2.3fr)_minmax(0,1.7fr)_7rem_minmax(0,1fr)_5.5rem] lg:gap-x-4"
    >
      <span>Staff member</span>
      <span>Role</span>
      <span>Employment</span>
      <span>Rating</span>
      <span className="text-right">Joined</span>
    </div>
  )
}
