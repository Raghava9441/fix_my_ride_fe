/** Column headings for the center list; shown only once rows are in column mode at `lg`. */
export function ServiceCenterListHeader() {
  return (
    <div
      aria-hidden
      className="hidden border-b border-border bg-surface-sunken px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-text-faint lg:grid lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.6fr)_minmax(0,1.2fr)_6rem_5rem] lg:gap-x-4"
    >
      <span>Center</span>
      <span>Contact</span>
      <span>Services</span>
      <span>Plan</span>
      <span className="text-right">Rating</span>
    </div>
  )
}
