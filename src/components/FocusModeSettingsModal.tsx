import React, { useState } from 'react';
import { FocusModeSettings } from '../types';

interface FocusModeSettingsModalProps {
  initialSettings: FocusModeSettings;
  onSave: (settings: FocusModeSettings) => void;
  onClose: () => void;
  // ✅ New prop to indicate OS support
  isSupportedOS?: boolean;
}

type ListType = 'blacklist' | 'whitelist';

export function FocusModeSettingsModal({
  initialSettings,
  onSave,
  onClose,
  isSupportedOS = true, // default true, can be passed from App.tsx
}: FocusModeSettingsModalProps) {
  const [blacklist, setBlacklist] = useState<string[]>(initialSettings.blacklist);
  const [whitelist, setWhitelist] = useState<string[]>(initialSettings.whitelist);
  const [newItem, setNewItem] = useState('');
  const [draggedItem, setDraggedItem] = useState<{ item: string; source: ListType } | null>(null);

  const handleDragStart = (e: React.DragEvent, item: string, source: ListType) => {
    setDraggedItem({ item, source });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetList: ListType) => {
    e.preventDefault();
    if (!draggedItem) return;

    const { item, source } = draggedItem;
    if (source === targetList) return;

    if (source === 'blacklist' && targetList === 'whitelist') {
      setBlacklist(blacklist.filter((i) => i !== item));
      setWhitelist([...whitelist, item]);
    } else if (source === 'whitelist' && targetList === 'blacklist') {
      setWhitelist(whitelist.filter((i) => i !== item));
      setBlacklist([...blacklist, item]);
    }

    setDraggedItem(null);
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newItem.trim();
    if (!trimmed) return;

    if (!blacklist.includes(trimmed) && !whitelist.includes(trimmed)) {
      setBlacklist([...blacklist, trimmed]);
    }
    setNewItem('');
  };

  const removeItem = (item: string, list: ListType) => {
    if (list === 'blacklist') {
      setBlacklist(blacklist.filter((i) => i !== item));
    } else {
      setWhitelist(whitelist.filter((i) => i !== item));
    }
  };

  const handleSave = () => {
    onSave({ blacklist, whitelist });
  };

  const ListColumn = ({
    title,
    description,
    items,
    type,
  }: {
    title: string;
    description: string;
    items: string[];
    type: ListType;
  }) => (
    <div
      className={`bg-background flex flex-1 flex-col rounded border p-4 transition-colors ${
        draggedItem && draggedItem.source !== type ? 'border-primary bg-primary/5' : 'border-border'
      }`}
      onDragOver={handleDragOver}
      onDragEnter={(e) => e.preventDefault()}
      onDrop={(e) => handleDrop(e, type)}
    >
      <h4 className="mb-1 font-semibold">{title}</h4>
      <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">{description}</p>
      <div className="min-h-[150px] flex-1 space-y-2 overflow-y-auto">
        {items.length === 0 && (
          <div className="mt-4 text-center text-sm italic text-gray-400">Drop items here</div>
        )}
        {items.map((item) => (
          <div
            key={item}
            draggable={true}
            onDragStart={(e) => handleDragStart(e, item, type)}
            onDragEnd={() => setDraggedItem(null)}
            className="bg-card border-border hover:border-primary group flex cursor-move select-none items-center justify-between rounded border p-2 transition-all hover:shadow-md"
            style={{ WebkitUserDrag: 'element' } as React.CSSProperties}
          >
            <span className="pointer-events-none mr-2 truncate text-sm">≡ {item}</span>
            <div className="flex items-center space-x-1 opacity-0 transition-opacity group-hover:opacity-100">
              {type === 'blacklist' ? (
                <button
                  onClick={() => {
                    setBlacklist(blacklist.filter((i) => i !== item));
                    setWhitelist([...whitelist, item]);
                  }}
                  className="mr-1 rounded bg-gray-200 px-2 py-0.5 text-xs hover:bg-gray-300 focus:outline-none dark:bg-gray-700 dark:hover:bg-gray-600"
                  title="Move to Whitelist"
                >
                  →
                </button>
              ) : (
                <button
                  onClick={() => {
                    setWhitelist(whitelist.filter((i) => i !== item));
                    setBlacklist([...blacklist, item]);
                  }}
                  className="mr-1 rounded bg-gray-200 px-2 py-0.5 text-xs hover:bg-gray-300 focus:outline-none dark:bg-gray-700 dark:hover:bg-gray-600"
                  title="Move to Blacklist"
                >
                  ←
                </button>
              )}
              <button
                onClick={() => removeItem(item, type)}
                className="px-1 text-lg font-bold leading-none text-red-500 hover:text-red-700 focus:outline-none"
                title="Remove process"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-card border-border flex max-h-[90vh] w-full max-w-3xl flex-col rounded-lg border p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">Focus Mode Settings</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Drag and drop processes between lists to configure what gets suspended.
            </p>
            {!isSupportedOS && (
              <p className="mt-2 font-semibold text-red-600 dark:text-red-400">
                ⚠️ Focus Mode is not supported on this operating system.
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="hover:text-foreground text-2xl leading-none text-gray-500"
          >
            &times;
          </button>
        </div>

        {isSupportedOS ? (
          <>
            <form onSubmit={handleAddItem} className="mb-6 flex gap-2">
              <input
                type="text"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                placeholder="Add new process name (e.g. Spotify.exe)"
                className="bg-background border-border focus:border-primary flex-1 rounded border px-4 py-2 text-sm focus:outline-none"
              />
              <button
                type="submit"
                className="bg-secondary text-secondary-foreground border-border rounded border px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Add Process
              </button>
            </form>

            <div className="flex flex-1 flex-col gap-6 overflow-hidden md:flex-row">
              <ListColumn
                title="Blacklist (Suspended)"
                description="These processes will be paused when Focus Mode is ON."
                items={blacklist}
                type="blacklist"
              />
              <ListColumn
                title="Whitelist (Allowed)"
                description="These processes will NEVER be suspended."
                items={whitelist}
                type="whitelist"
              />
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center italic text-gray-400">
            Settings are disabled because Focus Mode is not supported.
          </div>
        )}

        <div className="border-border mt-6 flex justify-end space-x-3 border-t pt-4">
          <button
            onClick={onClose}
            className="rounded bg-gray-200 px-6 py-2 font-medium transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isSupportedOS}
            className={`rounded px-6 py-2 font-medium shadow transition-colors ${
              isSupportedOS
                ? 'bg-primary hover:bg-primary-hover text-white'
                : 'cursor-not-allowed bg-gray-400 text-gray-200'
            }`}
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
