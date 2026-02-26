"use client";

import { useState, useRef, useEffect } from "react";
import { LogOut } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface HeaderNavProps {
  showSyncStatus?: boolean;
  syncStatus?: string;
  showProfile?: boolean;
  onSignOut?: () => void;
  userInitials?: string;
}

export function HeaderNav({
  showSyncStatus = false,
  syncStatus = "Synced",
  showProfile = false,
  onSignOut,
  userInitials = "U",
}: HeaderNavProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="relative z-50 flex items-center justify-between px-8 py-6 border-b border-white/5 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <Link
          href={showProfile ? "/app" : "/"}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <Image
            src="/mammoth.svg"
            alt="Mammoth"
            width={32}
            height={32}
            className="invert"
          />
          <span className="font-bold tracking-tight text-lg text-white">
            Mamm0th
          </span>
        </Link>
      </div>
      <nav className="flex items-center gap-8">
        {showSyncStatus && (
          <div className="flex items-center gap-2 text-sm text-white/50">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span>{syncStatus}</span>
          </div>
        )}
        {showProfile && onSignOut && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="bg-white hover:bg-white/90 transition-all active:scale-[0.98] px-3 py-2 rounded-lg flex items-center gap-2 font-medium text-black"
            >
              <div className="w-7 h-7 rounded-full bg-black flex items-center justify-center text-white text-sm font-bold">
                {userInitials}
              </div>
              <span className="text-sm">Profile</span>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl overflow-hidden backdrop-blur-xl">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    onSignOut();
                  }}
                  className="w-full px-4 py-3 text-left text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        )}
      </nav>
    </header>
  );
}
