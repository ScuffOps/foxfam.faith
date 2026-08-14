import { Link, useLocation } from "react-router-dom";
import {
  Boxes,
  Clock3,
  Coffee,
  Fish,
  Flower2,
  Gem,
  Home,
  LayoutDashboard,
  PanelLeftOpen,
  PawPrint,
  Search,
  Trophy,
} from "lucide-react";
import {
  SANCTUARY_NAV_ITEMS,
  isSanctuaryDestinationActive,
} from "@/lib/sanctuaryNavigation";

const NAV_ICONS = {
  portal: LayoutDashboard,
  quarters: Home,
  forge: Gem,
  collections: Trophy,
  familiar: PawPrint,
  starfishing: Fish,
  merge: Boxes,
  boba: Coffee,
  find: Search,
  time: Clock3,
  words: Flower2,
};

export default function SanctuaryRail({ onOpenPortalNav }) {
  const location = useLocation();
  const portalItems = SANCTUARY_NAV_ITEMS.filter((item) => item.group === "portal");
  const hubItems = SANCTUARY_NAV_ITEMS.filter((item) => item.group === "hub");
  const gameItems = SANCTUARY_NAV_ITEMS.filter((item) => item.group === "games");

  const renderLink = (item) => {
    const Icon = NAV_ICONS[item.icon];
    const isActive = isSanctuaryDestinationActive(location.pathname, item.path);

    return (
      <Link
        key={item.path}
        to={item.path}
        className="sanctuary-rail__link"
        data-active={isActive || undefined}
        aria-current={isActive ? "page" : undefined}
        aria-label={item.label}
        title={item.label}
      >
        <Icon aria-hidden="true" />
        <span className="sanctuary-rail__label">{item.label}</span>
      </Link>
    );
  };

  return (
    <div className="sanctuary-rail-slot">
      <aside className="sanctuary-rail" aria-label="Sanctuary navigation">
        <div className="sanctuary-rail__brand" aria-hidden="true">
          <img src="/assets/legacy-media/e241ead03_TenkoTokenrerwork.png" alt="" />
          <span className="sanctuary-rail__label">
            <strong>Foxfam</strong>
            <small>Sanctuary Mode</small>
          </span>
        </div>

        <nav className="sanctuary-rail__nav" aria-label="Game hub destinations">
          <div className="sanctuary-rail__group">
            {portalItems.map(renderLink)}
          </div>
          <div className="sanctuary-rail__group">
            <p className="sanctuary-rail__group-label sanctuary-rail__label">Your sanctuary</p>
            {hubItems.map(renderLink)}
          </div>
          <div className="sanctuary-rail__group">
            <p className="sanctuary-rail__group-label sanctuary-rail__label">Priory games</p>
            {gameItems.map(renderLink)}
          </div>
        </nav>

        <button
          type="button"
          className="sanctuary-rail__pin"
          onClick={onOpenPortalNav}
          aria-label="Open full portal navigation"
          title="Open full portal navigation"
        >
          <PanelLeftOpen aria-hidden="true" />
          <span className="sanctuary-rail__label">Portal navigation</span>
        </button>
      </aside>
    </div>
  );
}
