import { Navigate, Route, Routes } from 'react-router-dom';
import { Shell } from './app/Shell';
import { ToastProvider } from './components/ui';
import MoneyCheckScreen from './features/money/MoneyCheckScreen';
import MoneyScreen from './features/money/MoneyScreen';
import MoreScreen from './features/more/MoreScreen';
import HustleScreen from './features/hustle/HustleScreen';
import { GymScreen, ReviewScreen, YouTubeScreen } from './features/placeholders';
import SettingsScreen from './features/settings/SettingsScreen';
import TodayScreen from './features/today/TodayScreen';
import WeekScreen from './features/week/WeekScreen';
import { useThemeSync } from './hooks/useThemeSync';

export default function App() {
  useThemeSync();

  return (
    <ToastProvider>
      <Shell>
        <Routes>
          <Route path="/" element={<TodayScreen />} />
          <Route path="/week" element={<WeekScreen />} />
          <Route path="/money" element={<MoneyScreen />} />
          <Route path="/money/check" element={<MoneyCheckScreen />} />
          <Route path="/hustle" element={<HustleScreen />} />
          <Route path="/gym" element={<GymScreen />} />
          <Route path="/youtube" element={<YouTubeScreen />} />
          <Route path="/review" element={<ReviewScreen />} />
          <Route path="/more" element={<MoreScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Shell>
    </ToastProvider>
  );
}
