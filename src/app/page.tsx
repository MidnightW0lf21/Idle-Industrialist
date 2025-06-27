import { GameStateProvider } from '@/contexts/GameStateContext';
import Dashboard from '@/components/Dashboard';

export default function Home() {
  return (
    <GameStateProvider>
      <Dashboard />
    </GameStateProvider>
  );
}
