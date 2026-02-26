'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { HeaderNav } from '@/components/HeaderNav';
import Image from 'next/image';
import Link from 'next/link';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.push('/app');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div
        className="fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }}
      />

      <HeaderNav />

      <main className="relative z-10 flex items-center justify-center min-h-[calc(100vh-88px)] px-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center mb-6">
              <Image src="/mammoth.svg" alt="Mammoth" width={64} height={64} className="invert" />
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight mb-4">
              Welcome back
            </h1>
            <p className="text-white/50 text-lg">
              Sign in to access your priorities
            </p>
          </div>

          <div className="bg-white/[0.03] border border-white/10 p-8 rounded-2xl backdrop-blur-sm">
            <form onSubmit={handleSignIn} className="space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm text-white/60 mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-white/40 transition-colors"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm text-white/60 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-white/40 transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-black font-bold py-4 rounded-lg hover:bg-white/90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/signup"
                className="text-white/60 hover:text-white text-sm transition-colors"
              >
                Don't have an account? <span className="underline">Sign up</span>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
