export function FooterBar() {
  return (
    <footer className="relative z-10 px-8 py-10 border-t border-white/5">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 opacity-30 text-[10px] uppercase tracking-widest font-bold">
        <div className="flex gap-8">
          <span className="hover:opacity-100 transition-opacity cursor-default">
            3 Priorities, Always
          </span>
          <span className="hover:opacity-100 transition-opacity cursor-default">
            Impact Measured
          </span>
          <span className="hover:opacity-100 transition-opacity cursor-default">
            Compounding Revenue
          </span>
        </div>
        <div>Next Cycle: Q2 2026 in 38 Days</div>
      </div>
    </footer>
  );
}
