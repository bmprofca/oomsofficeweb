import { PORTALS, portalLoginUrl } from "../../config/portalUrls";

/**
 * Tab switcher so users jump between Office / Client / CA domains.
 * @param {"app"|"client"|"ca"} active
 */
export default function AuthPortalSwitcher({ active = "app" }) {
  return (
    <div className="w-full">
      <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
        Choose portal
      </p>
      <div className="flex rounded-xl bg-slate-100 p-1 gap-1">
        {PORTALS.map((portal) => {
          const isActive = portal.id === active;
          const href = portalLoginUrl(portal.id);
          if (isActive) {
            return (
              <span
                key={portal.id}
                className="portal-tab-active flex-1 rounded-lg bg-white px-2 py-2 text-center text-[11px] font-bold text-[#5c3fe6] border border-indigo-200 shadow-sm no-underline"
              >
                {portal.label}
              </span>
            );
          }
          return (
            <a
              key={portal.id}
              href={href}
              style={{ textDecoration: "none" }}
              className="flex-1 rounded-lg px-2 py-2 text-center text-[11px] font-bold text-slate-500 border border-transparent no-underline hover:no-underline focus:no-underline hover:bg-white/70 hover:text-slate-800 transition"
            >
              {portal.label}
            </a>
          );
        })}
      </div>
    </div>
  );
}
