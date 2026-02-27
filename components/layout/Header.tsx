'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface HeaderProps {
  displayName?: string;
}

export default function Header({ displayName }: HeaderProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 bg-navy/90 backdrop-blur-md border-b border-white/10">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-brand-red flex items-center justify-center text-base">
            ⚾
          </div>
          <span
            className="font-bold text-white text-base hidden sm:block"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            WISE VISION
          </span>
        </Link>

        <div className="flex items-center gap-4">
          {displayName && (
            <span className="text-white/60 text-sm hidden sm:block">
              👤 {displayName}
            </span>
          )}
          <button
            onClick={handleLogout}
            className="text-white/50 hover:text-white text-sm transition-colors"
          >
            ログアウト
          </button>
        </div>
      </div>
    </header>
  );
}
