/**
 * Temporary screens for pillars that haven't been built yet. Each one moves
 * into its own folder (like features/money/ and features/week/) in its stage.
 */
import { NotebookPen } from 'lucide-react';
import { ComingSoon } from '../components/ComingSoon';
import { PageHeader } from '../components/ui';
import { t } from '../i18n/en';

export function ReviewScreen() {
  return (
    <>
      <PageHeader title={t.nav.review} />
      <ComingSoon
        stage={7}
        icon={NotebookPen}
        color="var(--c-review)"
        title="Saturday review"
        features={['Did I hit the minimums?', 'Wins and what got in the way', 'One goal per pillar for next week', 'History of past reviews']}
      />
    </>
  );
}
