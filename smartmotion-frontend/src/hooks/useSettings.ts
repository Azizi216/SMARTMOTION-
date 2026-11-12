import { useCallback, useState } from 'react';
import { DEFAULT_SETTINGS, loadSettings, resetSettings, saveSettings, type ApplicationSettings } from '@/database/settingsStore';

export function useSettings() {
  const [settings, setSettings] = useState<ApplicationSettings>(() => loadSettings());

  const updateSettings = useCallback((patch: Partial<ApplicationSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const updateDisplay = useCallback((patch: Partial<ApplicationSettings['display']>) => {
    setSettings((prev) => {
      const next = { ...prev, display: { ...prev.display, ...patch } };
      saveSettings(next);
      return next;
    });
  }, []);

  const updateThreshold = useCallback(
    (exercise: keyof ApplicationSettings['thresholds'], patch: Partial<ApplicationSettings['thresholds'][typeof exercise]>) => {
      setSettings((prev) => {
        const next = {
          ...prev,
          thresholds: {
            ...prev.thresholds,
            [exercise]: { ...prev.thresholds[exercise], ...patch },
          },
        };
        saveSettings(next);
        return next;
      });
    },
    []
  );

  const reset = useCallback(() => setSettings(resetSettings()), []);

  return { settings, updateSettings, updateDisplay, updateThreshold, reset, defaults: DEFAULT_SETTINGS };
}
