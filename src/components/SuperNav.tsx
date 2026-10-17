import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useLibrary } from "../api";
import { t } from "../i18n";
import { IconBack, IconForward } from "./Icons";
import type { MenuItem } from "./Menu";

interface Tab {
  label: string;
  to: string;
  match: (p: string) => boolean;
  items: MenuItem[];
}

/**
 * The large uppercase navigation row ("SuperNav").
 * Implements Caramelo spotlight-tabs with spatial continuity and chromatic-glitch.
 */
export function SuperNav() {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const { snapshot } = useLibrary();
  const persona = snapshot?.user?.personaName ?? "Perfil";
  const tabsRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState<{ left: number; width: number; opacity: number }>({ left: 0, width: 0, opacity: 0 });

  const tabs: Tab[] = [
    {
      label: t("MainTabsStore"),
      to: "/store",
      match: (p) => p.startsWith("/store"),
      items: [
        { label: t("Menu_Featured"), onSelect: () => nav("/store") },
        { label: t("Menu_DiscoveryQueue"), onSelect: () => nav("/store?view=queue") },
        { label: t("Menu_Wishlist"), onSelect: () => nav("/store?view=wishlist") },
        { label: t("Menu_PointsShop"), onSelect: () => nav("/store?view=points") },
        { label: t("Menu_News"), onSelect: () => nav("/store?view=news") },
        { label: t("Menu_Stats"), onSelect: () => nav("/store?view=charts") },
      ],
    },
    {
      label: t("MainTabsLibrary"),
      to: "/library/home",
      match: (p) => p.startsWith("/library"),
      items: [
        { label: t("Menu_Home"), onSelect: () => nav("/library/home") },
        { label: t("Menu_Collections"), onSelect: () => nav("/library/collections") },
        { label: t("Menu_Downloads"), onSelect: () => nav("/library/downloads") },
      ],
    },
    {
      label: t("Menu_Community"),
      to: "/community",
      match: (p) => p.startsWith("/community"),
      items: [
        { label: t("Menu_Home"), onSelect: () => nav("/community") },
        { label: t("Menu_Discussions"), onSelect: () => nav("/community?tab=discussions") },
        { label: t("Menu_Workshop"), onSelect: () => nav("/community?tab=workshop") },
        { label: t("Menu_Market"), onSelect: () => nav("/community?tab=market") },
        { label: t("Menu_Broadcasts"), onSelect: () => nav("/community?tab=broadcasts") },
      ],
    },
    {
      label: persona,
      to: "/profile",
      match: (p) => p.startsWith("/profile"),
      items: [
        { label: t("Menu_Activity"), onSelect: () => nav("/profile?tab=activity") },
        { label: t("Menu_Profile"), onSelect: () => nav("/profile") },
        { label: t("Menu_Badges"), onSelect: () => nav("/profile?tab=badges") },
        { label: t("Menu_Inventory"), onSelect: () => nav("/profile?tab=inventory") },
      ],
    },
  ];

  useEffect(() => {
    const updateIndicator = () => {
      if (!tabsRef.current) return;
      const activeEl = tabsRef.current.querySelector<HTMLElement>(".supernav__tab.is-active");
      if (activeEl) {
        const parentRect = tabsRef.current.getBoundingClientRect();
        const rect = activeEl.getBoundingClientRect();
        setIndicator({
          left: rect.left - parentRect.left,
          width: rect.width,
          opacity: 1,
        });
      } else {
        setIndicator((prev) => ({ ...prev, opacity: 0 }));
      }
    };

    updateIndicator();
    const id = setTimeout(updateIndicator, 50);
    window.addEventListener("resize", updateIndicator);
    return () => {
      clearTimeout(id);
      window.removeEventListener("resize", updateIndicator);
    };
  }, [pathname, persona]);

  return (
    <nav className="supernav">
      <div className="supernav__arrows">
        <button title="Voltar" onClick={() => nav(-1)}>
          <IconBack size={20} />
        </button>
        <button title="Avançar" onClick={() => nav(1)}>
          <IconForward size={20} />
        </button>
      </div>
      <div className="supernav__tabs" ref={tabsRef}>
        <span
          className="supernav__baseline-indicator"
          style={{
            transform: `translateX(${indicator.left}px)`,
            width: `${indicator.width}px`,
            opacity: indicator.opacity,
          }}
          aria-hidden="true"
        />
        {tabs.map((tab) => {
          const isActive = tab.match(pathname);
          return (
            <div key={tab.to} className="supernav__tab-wrap">
              <NavLink to={tab.to} className={() => `supernav__tab cm-spectrum-trigger ${isActive ? "is-active" : ""}`}>
                <span className="cm-glitch" data-text={tab.label}>{tab.label}</span>
              </NavLink>
              {/* hover submenu com blur-glide-menu */}
              <div className="supernav__dropdown cm-blur-glide-menu" role="menu">
                {tab.items.map((it, i) =>
                  it.kind === "separator" ? null : (
                    <button key={i} role="menuitem" className="supernav__dropdown-item" onClick={it.onSelect}>
                      {it.label}
                    </button>
                  ),
                )}
              </div>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
