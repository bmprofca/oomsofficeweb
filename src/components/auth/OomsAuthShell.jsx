/**
 * Shared OOMS auth layout — same look across Office / Client / CA logins.
 */
export default function OomsAuthShell({
  portalLabel = "Office",
  leftTitle = (
    <>
      Secure access,
      <br />
      simplified.
    </>
  ),
  leftSubtitle = "One identity across OOMS portals. Sign in with OTP — no passwords to remember.",
  children,
  footerNote = "Secure OOMS area — all access is monitored",
}) {
  return (
    <div className="ooms-root h-screen h-[100dvh] overflow-hidden bg-[#f3f6fc] flex items-center justify-center p-4 sm:p-6 font-sans">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />

      <div className="bg-white rounded-[32px] shadow-[0_20px_50px_rgba(99,102,241,0.06)] border border-slate-100/80 flex flex-col md:flex-row overflow-hidden w-full max-w-[920px] h-full md:h-[600px] max-h-full relative">
        {/* LEFT brand panel */}
        <div className="hidden md:flex md:w-[46%] bg-[#080b18] text-white flex-col justify-between p-8 relative overflow-hidden select-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_20%,_#080b18_80%),_radial-gradient(#ffffff04_1px,_transparent_1px)] [background-size:24px_24px] pointer-events-none" />
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle_at_center,_#3b82f612_0%,_transparent_70%)] filter blur-3xl pointer-events-none" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle_at_center,_#8b5cf612_0%,_transparent_70%)] filter blur-3xl pointer-events-none" />

          <div className="relative z-10 flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-950 ring-1 ring-white/15 shadow-lg shadow-indigo-600/20 flex items-center justify-center">
              <img src="/logo512.png" alt="OOMS" className="h-8 w-8 object-contain" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white block leading-none">
                OOMS
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-300/80">
                {portalLabel}
              </span>
            </div>
          </div>

          <div className="relative z-10 my-auto py-6 space-y-5">
            <h1 className="text-3xl font-extrabold tracking-tight leading-tight text-white">
              {leftTitle}
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
              {leftSubtitle}
            </p>

            <div className="w-full max-w-[240px] bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 shadow-xl animate-float">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-[10px]">
                  👤
                </div>
                <div className="space-y-1.5 flex-1">
                  <div className="h-2 w-20 bg-white/30 rounded-full" />
                  <div className="h-1.5 w-12 bg-white/15 rounded-full" />
                </div>
              </div>
              <div className="flex gap-1">
                <div className="w-3 h-1.5 rounded-full bg-white/40" />
                <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
              </div>
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-between text-[10px] text-white/60 border-t border-white/10 pt-4">
            <span>OneSaaS Office Suite</span>
            <span>Secure OTP login</span>
          </div>
        </div>

        {/* RIGHT form panel */}
        <div className="w-full md:w-[54%] flex flex-col justify-between p-6 sm:p-8 bg-white relative md:overflow-y-hidden overflow-y-auto">
          <div className="flex md:hidden items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center">
              <img src="/logo512.png" alt="OOMS" className="h-6 w-6 object-contain" />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-800 block leading-none">OOMS</span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-600">
                {portalLabel}
              </span>
            </div>
          </div>

          <div className="my-auto w-full max-w-[340px] mx-auto space-y-4">{children}</div>

          <div className="text-[10px] text-slate-400 font-semibold text-center mt-4 flex items-center justify-center gap-1">
            <span>🛡️</span> {footerNote}
          </div>
        </div>
      </div>

      <style>{`
        .ooms-root, .ooms-root * {
          font-family: 'Plus Jakarta Sans', sans-serif !important;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-6px); }
        }
        .animate-float { animation: float 4s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
