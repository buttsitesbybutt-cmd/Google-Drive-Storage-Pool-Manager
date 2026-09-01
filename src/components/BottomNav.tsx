import React from 'react';
import {
  LayoutDashboard,
  FolderTree,
  UploadCloud,
  Layers,
  User,
  HardDrive,
  KeyRound,
} from 'lucide-react';

export type NavTab = 'dashboard' | 'files' | 'uploads' | 'accounts' | 'profile';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  filesCount?: number;
  drivesCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  filesCount = 0,
  drivesCount = 0,
}) => {
  const navItems: Array<{
    id: NavTab;
    label: string;
    icon: React.ReactNode;
    badge?: number | string;
    sublabel?: string;
  }> = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
      sublabel: 'Overview & Pool',
    },
    {
      id: 'files',
      label: 'Files',
      icon: <FolderTree className="w-5 h-5" />,
      badge: filesCount > 0 ? filesCount : undefined,
      sublabel: 'Catalog & Folders',
    },
    {
      id: 'uploads',
      label: 'Uploads',
      icon: <UploadCloud className="w-5 h-5" />,
      sublabel: '0-Disk Stream',
    },
    {
      id: 'accounts',
      label: 'Accounts',
      icon: <HardDrive className="w-5 h-5" />,
      badge: drivesCount > 0 ? `${drivesCount}` : undefined,
      sublabel: 'GCP & Google Drive',
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: <User className="w-5 h-5" />,
      sublabel: 'Security & Audit',
    },
  ];

  return (
    <nav
      id="bottom-navigation-bar"
      aria-label="Main Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-2 sm:px-6 py-2"
    >
      <div className="max-w-5xl mx-auto flex items-center justify-around sm:justify-between gap-1">
        {navItems.map((item, index) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`bottom-nav-${item.id}`}
              onClick={() => onTabChange(item.id)}
              className={`relative flex flex-col items-center justify-center py-1.5 px-2.5 sm:px-4 rounded-xl transition-all duration-150 cursor-pointer min-w-[64px] sm:min-w-[88px] ${
                isActive
                  ? 'text-indigo-600 bg-indigo-50/80 font-bold shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 font-medium'
              }`}
            >
              {/* Active Indicator Top Bar */}
              {isActive && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-indigo-600" />
              )}

              {/* Icon Container with Badge */}
              <div className="relative">
                {item.icon}
                {item.badge !== undefined && (
                  <span
                    className={`absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full text-[10px] font-bold leading-none ${
                      isActive
                        ? 'bg-indigo-600 text-white ring-2 ring-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </div>

              {/* Label */}
              <span className="text-[11px] sm:text-xs mt-1 leading-tight tracking-tight font-medium">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
