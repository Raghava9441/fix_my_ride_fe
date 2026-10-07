/**
 * Column headings for the customer list.
 *
 * Only rendered once the rows are in column mode at `lg`. Below that the
 * grid has stacked and each figure carries its own inline label, so a header
 * row would be labelling columns that no longer exist.
 *
 * The template is duplicated from `CustomerRow` rather than shared through a
 * constant, which is a deliberate trade: a Tailwind class string has to be
 * statically present in the source for the compiler to emit it, so hoisting
 * it into a variable both files import would produce a grid with no columns
 * at all. The two are kept adjacent so a change to one is an obvious prompt
 * to change the other.
 */
export function CustomerListHeader() {
  return (
    <div
      aria-hidden
      className="hidden border-b border-border bg-surface-sunken px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-text-faint lg:grid lg:grid-cols-[minmax(0,2.4fr)_minmax(0,1.6fr)_4.5rem_4.5rem_minmax(0,1fr)_6rem] lg:gap-x-4"
    >
      <span>Customer</span>
      <span>Contact</span>
      <span>Vehicles</span>
      <span>Services</span>
      <span>Spent</span>
      <span className="text-right">Joined</span>
    </div>
  )
}
