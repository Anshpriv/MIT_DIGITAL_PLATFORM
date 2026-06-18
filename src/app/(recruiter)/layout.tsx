"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useState } from "react";
import {
  LayoutDashboard,
  Search,
  Bookmark,
  ChevronDown,
  LogOut,
  User,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function RecruiterLayout({ children }: { children: React.ReactNode }) {
  const { recruiterProfile, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const menuItems = [
    { name: "Dashboard", href: "/recruiter/dashboard", icon: LayoutDashboard },
    { name: "Search Candidates", href: "/recruiter/search", icon: Search },
    { name: "Bookmarks", href: "/recruiter/bookmarks", icon: Bookmark },
  ];

  return (
    <AuthGuard requireRole="recruiter">
      <div className="flex min-h-screen bg-bg-base text-text-primary">
        {/* Left Sidebar */}
        <aside className="fixed inset-y-0 left-0 w-[240px] border-r border-border bg-bg-surface flex flex-col justify-between z-20">
          <div>
            <div className="h-16 flex items-center px-6 border-b border-border">
              <Link href="/recruiter/dashboard" className="flex items-center gap-2">
                <div className="h-7 w-7 rounded bg-gradient-to-br from-primary to-accent shadow-[0_0_8px_rgba(0,212,170,0.4)]" />
                <span className="font-display font-bold text-sm tracking-tight text-text-primary">MIT-WPU Talent Hub</span>
              </Link>
            </div>
            <nav className="mt-6 px-3 space-y-1">
              {menuItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 border-l-2 ${
                      isActive
                        ? "border-accent bg-accent/5 text-accent"
                        : "border-transparent text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="p-4 border-t border-border font-mono text-[10px] text-text-disabled">
            v1.0 · Recruiter Panel
          </div>
        </aside>

        {/* Main Section */}
        <div className="flex-1 pl-[240px] flex flex-col min-h-screen">
          {/* Header */}
          <header className="h-16 border-b border-border bg-bg-surface flex items-center justify-end px-8 relative z-10">
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 hover:bg-bg-elevated p-1.5 rounded-lg transition-all duration-200"
              >
                <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold border border-accent/20 overflow-hidden">
                  {recruiterProfile?.name?.charAt(0) || "R"}
                </div>
                <div className="hidden md:flex flex-col text-left">
                  <span className="text-sm font-semibold leading-none text-text-primary">{recruiterProfile?.name}</span>
                  <span className="text-[10px] text-text-secondary mt-0.5 uppercase tracking-wider font-mono">Recruiter</span>
                </div>
                <ChevronDown className="h-4 w-4 text-text-secondary" />
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setDropdownOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-48 bg-bg-elevated border border-border rounded-lg shadow-xl py-1 z-30 font-sans"
                    >
                      <div className="px-4 py-2 border-b border-border">
                        <p className="text-xs text-text-secondary font-mono">Company</p>
                        <p className="text-sm font-semibold truncate text-text-primary">{recruiterProfile?.companyName}</p>
                      </div>
                      <button
                        onClick={async () => {
                          setDropdownOpen(false);
                          await signOut();
                          router.push("/login");
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-accent-warm hover:bg-bg-surface transition-colors text-left"
                      >
                        <LogOut className="h-4 w-4" /> Sign Out
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </header>

          {/* Page Content */}
          <div className="flex-1 flex flex-col bg-bg-base">{children}</div>
        </div>
      </div>
    </AuthGuard>
  );
}
