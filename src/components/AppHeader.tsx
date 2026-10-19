import { ThemeToggle } from "@caramelo/design-system";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useLibrary } from "../api";
import { useAuth } from "../auth";
import { t } from "../i18n";
import { useCarameloTheme } from "../theme";
import { useUi } from "../ui";
import { Avatar } from "./Avatar";
import { CarameloIsotype } from "./CarameloIsotype";
import { IconBack, IconBell, IconChevronDown, IconForward } from "./Icons";
import { Menu } from "./Menu";

interface Section {
  label: string;
  to: string;
  match: (path: string) => boolean;
}

/**
 * Cabeçalho único do LAB: marca, histórico, seções e ações numa faixa, no mesmo idioma da LP e da
 * biblioteca de prompts. É navegação entre páginas, então o traço espectral acompanha a rota ativa
 * (em vez de spotlight-tabs) e cada link carrega o chromatic-glitch do pacote.
 */
export function AppHeader() {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const ui = useUi();
  const { logout } = useAuth();
  const { snapshot } = useLibrary();
  const theme = useCarameloTheme();
  const persona = snapshot?.user?.personaName ?? "…";
  const navRef = useRef<HTMLElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0, visible: false });

  const sections: Section[] = [
    { label: t("MainTabsStore"), to: "/store", match: (p) => p.startsWith("/store") },
    { label: t("MainTabsLibrary"), to: "/library/home", match: (p) => p.startsWith("/library") },
    { label: t("Menu_Profile"), to: "/profile", match: (p) => p.startsWith("/profile") },
  ];

  // O traço desliza para a seção da rota atual; mede de novo quando a largura muda (fontes, resize).
  useEffect(() => {
    const list = navRef.current;
    if (!list) return;
    const measure = () => {
      const active = list.querySelector<HTMLElement>(".app-header__link.is-active");
      if (!active) return setIndicator((prev) => ({ ...prev, visible: false }));
      const bounds = active.getBoundingClientRect();
      setIndicator({ left: bounds.left - list.getBoundingClientRect().left + list.scrollLeft, width: bounds.width, visible: true });
    };
    measure();
    // Em telas estreitas a nav rola: a seção ativa entra na vista.
    list.querySelector(".app-header__link.is-active")?.scrollIntoView({ block: "nearest", inline: "nearest" });
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, [pathname]);

  return (
    <header className="app-header">
      <Link to="/library/home" className="app-header__brand" aria-label="LAB, Um Cara Caramelo — início da biblioteca">
        <CarameloIsotype size={34} decorative interactive />
        <span className="app-header__wordmark" aria-hidden="true">
          UM CARA
          <br />
          CARAMELO<sup>®</sup>
        </span>
        <span className="app-header__lab cm-brand-badge" aria-hidden="true">LAB</span>
      </Link>

      <div className="app-header__history">
        <button type="button" aria-label="Voltar" title="Voltar" onClick={() => nav(-1)}>
          <IconBack size={18} />
        </button>
        <button type="button" aria-label="Avançar" title="Avançar" onClick={() => nav(1)}>
          <IconForward size={18} />
        </button>
      </div>

      <nav className="app-header__nav" aria-label="Seções do LAB" ref={navRef}>
        <span
          className="app-header__indicator"
          style={{ transform: `translateX(${indicator.left}px)`, width: indicator.width, opacity: indicator.visible ? 1 : 0 }}
          aria-hidden="true"
        />
        {sections.map((section) => {
          const active = section.match(pathname);
          return (
            <Link key={section.to} to={section.to} className={`app-header__link cm-glitch ${active ? "is-active" : ""}`} aria-current={active ? "page" : undefined}>
              {section.label}
            </Link>
          );
        })}
      </nav>

      <div className="app-header__actions">
        <ThemeToggle className="app-header__icon" theme={theme} />
        <button type="button" className="app-header__icon" aria-label="Notificações" title="Notificações" onClick={() => ui.toast("Nenhuma notificação nova.")}>
          <IconBell size={16} />
        </button>
        <Menu
          align="right"
          items={[
            { label: t("Menu_ViewMyProfile"), onSelect: () => nav("/profile") },
            { label: t("Menu_Settings"), onSelect: () => nav("/settings") },
            { kind: "separator" },
            { label: t("Menu_ChangeAccount"), onSelect: () => logout() },
            { label: t("Menu_SignOut"), onSelect: () => logout() },
          ]}
          trigger={(open) => (
            <span className={`app-header__account ${open ? "is-open" : ""}`}>
              <Avatar size={26} />
              <span className="app-header__persona">{persona}</span>
              <IconChevronDown size={12} />
            </span>
          )}
        />
      </div>
    </header>
  );
}
