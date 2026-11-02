import { useEffect, type CSSProperties, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { t } from '../i18n/en';
import { MORE_ITEMS, SIDEBAR_ITEMS, TAB_ITEMS, type NavItem } from './nav';
import s from './Shell.module.css';

/**
 * The app frame: animated background, a floating glass tab bar on iPhone,
 * and a glass sidebar on desktop (900px and wider).
 */
export function Shell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  // On iPhone, the "More" tab stays highlighted while you're on Gym, Review or Settings.
  const inMoreSection = MORE_ITEMS.some((i) => pathname.startsWith(i.path));

  // Every new screen starts at the top, like a native app.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className={s.shell}>
      <div className="ambient" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <aside className={`glass ${s.sidebar}`}>
        <div className={s.brand}>
          <img src={`${import.meta.env.BASE_URL}icons/favicon.svg`} alt="" width={30} height={30} />
          <span>{t.appName}</span>
        </div>
        <nav className={s.sideNav} aria-label={t.nav.main}>
          {SIDEBAR_ITEMS.map((item) => (
            <NavItemLink key={item.path} item={item} className={s.sideItem} activeClass={s.sideItemActive} />
          ))}
        </nav>
      </aside>

      <main className={s.main}>
        {/* key = path, so each screen replays its fade-in when you switch */}
        <div key={pathname} className={s.page}>
          {children}
        </div>
      </main>

      <nav className={`glass ${s.tabbar}`} aria-label={t.nav.main}>
        {TAB_ITEMS.map((item) => (
          <NavItemLink
            key={item.path}
            item={item}
            className={s.tab}
            activeClass={s.tabActive}
            forceActive={item.path === '/more' && inMoreSection}
          />
        ))}
      </nav>
    </div>
  );
}

function NavItemLink({
  item,
  className,
  activeClass,
  forceActive = false,
}: {
  item: NavItem;
  className: string;
  activeClass: string;
  forceActive?: boolean;
}) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      className={({ isActive }) => `${className} ${isActive || forceActive ? activeClass : ''}`}
      style={{ '--item-color': item.color } as CSSProperties}
    >
      <Icon aria-hidden="true" />
      <span>{item.label}</span>
    </NavLink>
  );
}
