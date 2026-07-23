import { PlatformProvider } from './platform/PlatformContext';
import { Shell } from './ui/Shell';

export function App() {
  return (
    <PlatformProvider>
      <Shell />
    </PlatformProvider>
  );
}
