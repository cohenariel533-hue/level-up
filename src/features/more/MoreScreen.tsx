import { MORE_ITEMS } from '../../app/nav';
import { GlassCard, ListRow, PageHeader } from '../../components/ui';
import { t } from '../../i18n/en';

/** iPhone only: the screens that don't fit in the tab bar. */
export default function MoreScreen() {
  return (
    <>
      <PageHeader title={t.more.title} />
      <GlassCard>
        <div className="list">
          {MORE_ITEMS.map((item) => (
            <ListRow key={item.path} to={item.path} label={item.label} icon={item.icon} color={item.color} />
          ))}
        </div>
      </GlassCard>
    </>
  );
}
