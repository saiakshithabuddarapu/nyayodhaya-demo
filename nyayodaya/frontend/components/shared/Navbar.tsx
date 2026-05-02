'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded bg-teal-700 flex items-center justify-center">
          <span className="text-white text-xs font-bold">N</span>
        </div>
        <div>
          <span className="font-semibold text-slate-900 text-sm">Nyayodaya</span>
          <span className="ml-2 text-xs text-slate-400 hidden sm:inline">
            Karnataka High Court Intelligence
          </span>
        </div>
      </div>

      <nav className="hidden md:flex items-center gap-1 text-sm">
        {[
          { href: '/dashboard', label: 'Dashboard' },
          { href: '/verify',    label: 'Verify' },
          { href: '/cases',     label: 'Cases' },
          { href: '/upload',    label: 'Upload' },
        ].map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`px-3 py-1.5 rounded font-medium transition-colors ${
              pathname === href || pathname.startsWith(href + '/')
                ? 'text-teal-700 bg-teal-50'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>

      <button
        onClick={handleSignOut}
        className="text-xs text-slate-500 hover:text-slate-900 transition-colors px-3 py-1.5 rounded hover:bg-slate-50"
      >
        Sign out
      </button>
    </header>
  )
}
