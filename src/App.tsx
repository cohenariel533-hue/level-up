import { Navigate, Route, Routes } from 'react-router-dom';
import { Shell } from './app/Shell';
import { ToastProvider } from './components/ui';
import MoneyCheckScreen from './features/money/MoneyCheckScreen';
import MoneyScreen from './features/money/MoneyScreen';
import MoreScreen from './features/more/MoreScreen';
import BrainScreen from './features/brain/BrainScreen';
import GymScreen from './features/gym/GymScreen';
import HustleScreen from './features/hustle/HustleScreen';
import ProfileScreen from './features/profile/ProfileScreen';
import ReviewScreen from './features/review/ReviewScreen';
import RhythmScreen from './features/rhythm/RhythmScreen';
import SettingsScreen from './features/settings/SettingsScreen';
import TodayScreen from './features/today/TodayScreen';
import WeekScreen from './features/week/WeekScreen';
import { useActivityTracking } from './hooks/useActivityTracking';
import { useStudySync } from './hooks/useStudySync';
import { useThemeSync } from './hooks/useThemeSync';

export default function App() {
  useThemeSync();
  useStudySync();
  useActivityTracking();

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
          <Route path="/review" element={<ReviewScreen />} />
          <Route path="/review/:week" element={<ReviewScreen />} />
          <Route path="/more" element={<MoreScreen />} />
          <Route path="/plan" element={<BrainScreen />} />
          <Route path="/rhythm" element={<RhythmScreen />} />
          <Route path="/me" element={<ProfileScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Shell>
    </ToastProvider>
  );
}
