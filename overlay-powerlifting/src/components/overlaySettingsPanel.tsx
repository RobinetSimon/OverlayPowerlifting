'use client';
import React, { useEffect, useRef } from 'react';
import { OverlaySettings, DEFAULT_OVERLAY_SETTINGS } from '../types/athlete';

type Props = {
  settings: OverlaySettings;
  onChange: (settings: OverlaySettings) => void;
  onApply: () => void;
};

const STORAGE_KEY = 'overlay-settings';

export function useOverlaySettings() {
  const [settings, setSettings] = React.useState<OverlaySettings>(DEFAULT_OVERLAY_SETTINGS);
  const loaded = useRef(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setSettings({ ...DEFAULT_OVERLAY_SETTINGS, ...JSON.parse(saved) });
    } catch { /* ignore */ }
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (loaded.current) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }
  }, [settings]);

  return { settings, setSettings };
}

function ColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4 rounded" />
      <span className="text-sm">{label}</span>
    </label>
  );
}

export default function OverlaySettingsPanel({ settings, onChange, onApply }: Props) {
  const updateColors = (key: keyof OverlaySettings['colors'], value: string) => {
    onChange({ ...settings, colors: { ...settings.colors, [key]: value } });
  };

  const updateVisibility = (key: keyof OverlaySettings['visibility'], value: boolean) => {
    onChange({ ...settings, visibility: { ...settings.visibility, [key]: value } });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;

      try {
        const apiPort = process.env.NEXT_PUBLIC_API_PORT || '3000';
        const apiUrl = `http://${window.location.hostname}:${apiPort}`;
        const res = await fetch(`${apiUrl}/upload-logo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: dataUrl }),
        });
        const result = await res.json();
        if (result.url) {
          onChange({ ...settings, logoUrl: result.url });
        }
      } catch {
        onChange({ ...settings, logoUrl: dataUrl });
      }
    };
    reader.readAsDataURL(file);
  };

  const reset = () => onChange(DEFAULT_OVERLAY_SETTINGS);

  return (
    <section className="space-y-6 p-6 bg-purple-50 rounded-2xl shadow-inner border border-purple-100">
      <h2 className="text-2xl font-bold border-b pb-3 mb-4">Personnalisation Overlay</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Colors */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-600 uppercase">Couleurs</h3>
          <ColorPicker label="Principale" value={settings.colors.primary} onChange={(v) => updateColors('primary', v)} />
          <ColorPicker label="Secondaire (total)" value={settings.colors.secondary} onChange={(v) => updateColors('secondary', v)} />
          <ColorPicker label="Texte" value={settings.colors.accent} onChange={(v) => updateColors('accent', v)} />
          <ColorPicker label="Essai valide" value={settings.colors.validAttempt} onChange={(v) => updateColors('validAttempt', v)} />
          <ColorPicker label="Essai raté" value={settings.colors.invalidAttempt} onChange={(v) => updateColors('invalidAttempt', v)} />
        </div>

        {/* Layout */}
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-600 uppercase mb-2">Position</h3>
            <select
              value={settings.position}
              onChange={(e) => onChange({ ...settings, position: e.target.value as OverlaySettings['position'] })}
              className="w-full p-2 border rounded-lg"
            >
              <option value="bottom-left">Bas gauche</option>
              <option value="bottom-right">Bas droite</option>
              <option value="top-left">Haut gauche</option>
              <option value="top-right">Haut droite</option>
            </select>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-600 uppercase mb-2">Taille ({(settings.scale * 100).toFixed(0)}%)</h3>
            <input
              type="range" min={0.5} max={2} step={0.1}
              value={settings.scale}
              onChange={(e) => onChange({ ...settings, scale: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Visibility */}
      <div>
        <h3 className="text-sm font-semibold text-gray-600 uppercase mb-2">Informations affichées</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <Toggle label="GL Points" checked={settings.visibility.glPoints} onChange={(v) => updateVisibility('glPoints', v)} />
          <Toggle label="Cat. âge" checked={settings.visibility.ageCategory} onChange={(v) => updateVisibility('ageCategory', v)} />
          <Toggle label="Cat. poids" checked={settings.visibility.weightCategory} onChange={(v) => updateVisibility('weightCategory', v)} />
          <Toggle label="Club" checked={settings.visibility.club} onChange={(v) => updateVisibility('club', v)} />
          <Toggle label="Total" checked={settings.visibility.total} onChange={(v) => updateVisibility('total', v)} />
          <Toggle label="Compétition" checked={settings.visibility.competition} onChange={(v) => updateVisibility('competition', v)} />
        </div>
      </div>

      {/* Logo */}
      <div>
        <h3 className="text-sm font-semibold text-gray-600 uppercase mb-2">Logo personnalisé</h3>
        <div className="flex items-center gap-4">
          <input type="file" accept="image/*" onChange={handleLogoUpload} className="text-sm" />
          {settings.logoUrl && (
            <div className="flex items-center gap-2">
              <img src={settings.logoUrl} alt="Logo" className="h-10 object-contain" />
              <button onClick={() => onChange({ ...settings, logoUrl: null })} className="text-red-500 text-sm hover:underline">Supprimer</button>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onApply}
          className="bg-gradient-to-r from-purple-600 to-fuchsia-700 text-white font-bold px-6 py-2 rounded-xl shadow-lg hover:-translate-y-0.5 transition"
        >
          Appliquer
        </button>
        <button onClick={reset} className="text-gray-500 hover:text-gray-700 text-sm underline">
          Réinitialiser
        </button>
      </div>
    </section>
  );
}
