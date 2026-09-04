/** Plain "or" separator between the password form and the Google button —
    no such divider exists elsewhere in the app, so this is intentionally
    minimal rather than a new generic `ui/separator` component. */
export default function OrDivider() {
  return (
    <div className="flex items-center gap-3" role="separator" aria-orientation="horizontal">
      <div className="border-navy/10 h-px flex-1 border-t" aria-hidden="true" />
      <span className="text-navy/40 text-[11px] font-semibold tracking-widest uppercase">or</span>
      <div className="border-navy/10 h-px flex-1 border-t" aria-hidden="true" />
    </div>
  );
}
