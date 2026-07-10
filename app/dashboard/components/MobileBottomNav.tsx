'use client';

import { Inbox, Bookmark, Trash2, FolderOpen } from 'lucide-react';
import { ItemSection } from '@/lib/types';

interface MobileBottomNavProps {
  activeSection: ItemSection;
  onSectionChange: (s: ItemSection) => void;
  onFoldersOpen: () => void;
  counts: { inbox: number; saved: number; trash: number };
}

const tabs = [
  { key: 'inbox' as ItemSection, label: 'Inbox', icon: Inbox },
  { key: 'saved' as ItemSection, label: 'Saved', icon: Bookmark },
  { key: 'trash' as ItemSection, label: 'Trash', icon: Trash2 },
];

export default function MobileBottomNav({
  activeSection, onSectionChange, onFoldersOpen, counts,
}: MobileBottomNavProps) {
  return (
    <nav className="dt-bottom-nav lg:hidden">
      {tabs.map(({ key, label, icon: Icon }) => {
        const isActive = activeSection === key;
        return (
          <button
            key={key}
            className="dt-bottom-nav-btn"
            style={isActive ? { color: 'var(--accent-primary)' } : {}}
            onClick={() => onSectionChange(key)}
          >
            <div className="relative">
              <Icon size={20} />
              {key === 'inbox' && counts.inbox > 0 && (
                <span
                  className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                  style={{ background: 'var(--accent-primary)', color: 'var(--text-inverse)' }}
                >
                  {counts.inbox > 9 ? '9+' : counts.inbox}
                </span>
              )}
            </div>
            <span>{label}</span>
          </button>
        );
      })}
      <button className="dt-bottom-nav-btn" onClick={onFoldersOpen}>
        <FolderOpen size={20} />
        <span>Folders</span>
      </button>
    </nav>
  );
}
