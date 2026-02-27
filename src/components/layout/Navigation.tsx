'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'ホーム', emoji: '🏠' },
  { href: '/games/pitcher-reaction', label: 'ピッチャーリアクション', emoji: '⚡' },
  { href: '/games/ball-number-hunt', label: 'ボールナンバーハント', emoji: '🔢' },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="bg-white/5 border-b border-white/10">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex gap-1 overflow-x-auto scrollbar-none py-2">
          {NAV_ITEMS.map(item => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-all
                  ${isActive
                    ? 'bg-brand-red text-white font-semibold'
                    : 'text-white/50 hover:text-white hover:bg-white/10'
                  }
                `}
              >
                <span>{item.emoji}</span>
                <span className="hidden sm:block">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
