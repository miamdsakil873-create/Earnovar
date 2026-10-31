import React from 'react';
import { Home, PlaySquare, CheckSquare, Users, CreditCard, User } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.tsx';

export type NavTab = 'dashboard' | 'watch' | 'tasks' | 'referral' | 'wallet' | 'profile';

interface BottomNavProps {
  activeTab: NavTab;
  onChangeTab: (tab: NavTab) => void;
  todayWatchRemaining?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  todayWatchRemaining = 0,
}) => {
  const { t } = useLanguage();

  const tabs = [
    { id: 'dashboard' as NavTab, label: t('home'), icon: Home },
    {
      id: 'watch' as NavTab,
      label: t('watch'),
      icon: PlaySquare,
      badge: todayWatchRemaining > 0 ? todayWatchRemaining : undefined,
    },
    { id: 'tasks' as NavTab, label: t('tasks'), icon: CheckSquare },
    { id: 'referral' as NavTab, label: t('invite'), icon: Users },
    { id: 'wallet' as NavTab, label: t('wallet'), icon: CreditCard },
    { id: 'profile' as NavTab, label: t('profile'), icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800/90 py-1.5 px-2 select-none safe-bottom">
      <div className="max-w-md mx-auto grid grid-cols-6 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1 rounded-xl transition-all duration-200 active:scale-90 ${
                isActive
                  ? 'text-emerald-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isActive ? 'scale-110 stroke-[2.5]' : 'stroke-2'
                  }`}
                />
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute -top-1 -right-2 bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 text-[9px] font-black rounded-full px-1 py-0.2 min-w-[14px] text-center shadow">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-0.5 tracking-tight ${isActive ? 'font-bold' : 'font-medium'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
