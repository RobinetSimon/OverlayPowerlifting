'use client';
import React, { useEffect, useState } from 'react';
import { BrowseEntry, BrowseResponse } from '../types/athlete';

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
};

export default function FileBrowser({ open, onClose, onSelect }: Props) {
  const [entries, setEntries] = useState<BrowseEntry[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = `http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:${process.env.NEXT_PUBLIC_API_PORT || '3000'}`;

  const loadDrives = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/browse/drives`);
      const data: BrowseResponse = await res.json();
      setEntries(data.entries);
      setCurrentPath('');
      setParentPath(null);
    } catch {
      setError('Impossible de charger les lecteurs.');
    } finally {
      setLoading(false);
    }
  };

  const loadDirectory = async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/browse?path=${encodeURIComponent(path)}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur');
      }
      const data: BrowseResponse = await res.json();
      setEntries(data.entries);
      setCurrentPath(data.current_path);
      setParentPath(data.parent_path);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) loadDrives();
  }, [open]);

  if (!open) return null;

  const handleClick = (entry: BrowseEntry) => {
    if (entry.is_directory) {
      loadDirectory(entry.path);
    } else {
      onSelect(entry.path);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800">Sélectionner un fichier Excel</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        {currentPath && (
          <div className="px-4 py-2 bg-gray-50 text-sm text-gray-600 border-b flex items-center gap-2">
            <span className="truncate flex-1 font-mono">{currentPath}</span>
          </div>
        )}

        {error && (
          <div className="px-4 py-2 bg-red-50 text-red-600 text-sm">{error}</div>
        )}

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Chargement...</div>
          ) : (
            <div className="space-y-1">
              {parentPath !== null && (
                <button
                  onClick={() => parentPath ? loadDirectory(parentPath) : loadDrives()}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 flex items-center gap-2 text-blue-600"
                >
                  <span>&#8593;</span>
                  <span>Dossier parent</span>
                </button>
              )}
              {currentPath && !parentPath && (
                <button
                  onClick={loadDrives}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 flex items-center gap-2 text-blue-600"
                >
                  <span>&#8593;</span>
                  <span>Lecteurs</span>
                </button>
              )}
              {entries.map((entry) => (
                <button
                  key={entry.path}
                  onClick={() => handleClick(entry)}
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 transition ${
                    entry.is_directory
                      ? 'hover:bg-blue-50 text-gray-700'
                      : 'hover:bg-green-50 text-green-700 font-medium'
                  }`}
                >
                  <span>{entry.is_directory ? '\uD83D\uDCC1' : '\uD83D\uDCC4'}</span>
                  <span className="truncate">{entry.name}</span>
                </button>
              ))}
              {entries.length === 0 && !loading && (
                <div className="text-center py-8 text-gray-400">Aucun fichier Excel dans ce dossier</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
