'use client';
import React, { useEffect, useRef } from 'react';
import { OverlaySettings, DEFAULT_OVERLAY_SETTINGS } from '../types/athlete';

type Props = {
  settings: OverlaySettings;
  onChange: (settings: OverlaySettings) => void;
  onApply: () => void;
};

const STORAGE_KEY = 'overlay-settings';

// Color presets for different styles
const COLOR_PRESETS: { name: string; colors: OverlaySettings['colors'] }[] = [
  {
    name: 'Classique (Bleu/Or)',
    colors: { primary: '#1e3a5f', secondary: '#eab308', accent: '#ffffff', validAttempt: '#22c55e', invalidAttempt: '#dc2626' },
  },
  {
    name: 'Sombre',
    colors: { primary: '#111827', secondary: '#f59e0b', accent: '#f3f4f6', validAttempt: '#10b981', invalidAttempt: '#ef4444' },
  },
  {
    name: 'FFForce (Bleu/Rouge)',
    colors: { primary: '#002654', secondary: '#ed2939', accent: '#ffffff', validAttempt: '#16a34a', invalidAttempt: '#dc2626' },
  },
  {
    name: 'IPF (Rouge)',
    colors: { primary: '#7f1d1d', secondary: '#fbbf24', accent: '#ffffff', validAttempt: '#22c55e', invalidAttempt: '#dc2626' },
  },
  {
    name: 'Violet',
    colors: { primary: '#4c1d95', secondary: '#a78bfa', accent: '#ffffff', validAttempt: '#34d399', invalidAttempt: '#f87171' },
  },
  {
    name: 'Vert émeraude',
    colors: { primary: '#064e3b', secondary: '#fcd34d', accent: '#ffffff', validAttempt: '#4ade80', invalidAttempt: '#f87171' },
  },
  {
    name: 'Gris moderne',
    colors: { primary: '#1f2937', secondary: '#60a5fa', accent: '#f9fafb', validAttempt: '#34d399', invalidAttempt: '#f87171' },
  },
  {
    name: 'Rose/Fuchsia',
    colors: { primary: '#831843', secondary: '#f0abfc', accent: '#ffffff', validAttempt: '#4ade80', invalidAttempt: '#fb7185' },
  },
];

export function useOverlaySettings() {
  const [settings, setSettings] = React.useState<OverlaySettings>(DEFAULT_OVERLAY_SETTINGS);
  const loaded = useRef(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setSettings({
          ...DEFAULT_OVERLAY_SETTINGS,
          ...parsed,
          colors: { ...DEFAULT_OVERLAY_SETTINGS.colors, ...parsed.colors },
          visibility: { ...DEFAULT_OVERLAY_SETTINGS.visibility, ...parsed.visibility },
        });
      }
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
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-20 text-xs p-1 border rounded font-mono"
      />
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

  const applyPreset = (preset: typeof COLOR_PRESETS[number]) => {
    onChange({ ...settings, colors: { ...preset.colors } });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // Store as data URL directly - this avoids server upload issues
      // and ensures the logo is always available
      onChange({ ...settings, logoUrl: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  const reset = () => onChange(DEFAULT_OVERLAY_SETTINGS);

  return (
    <section className="space-y-6 p-6 bg-purple-50 rounded-2xl shadow-inner border border-purple-100">
      <h2 className="text-2xl font-bold border-b pb-3 mb-4">Personnalisation Overlay</h2>

      {/* Color Presets */}
      <div>
        <h3 className="text-sm font-semibold text-gray-600 uppercase mb-2">Palettes prédéfinies</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {COLOR_PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => applyPreset(preset)}
              className="flex items-center gap-2 p-2 rounded-lg border hover:border-purple-400 hover:bg-purple-50 transition text-left"
            >
              <div className="flex gap-0.5 shrink-0">
                <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: preset.colors.primary }} />
                <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: preset.colors.secondary }} />
                <div className="w-4 h-4 rounded-sm border" style={{ backgroundColor: preset.colors.accent }} />
              </div>
              <span className="text-xs font-medium truncate">{preset.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Colors */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-600 uppercase">Couleurs personnalisées</h3>
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
