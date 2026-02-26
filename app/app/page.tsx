"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { HeaderNav } from "@/components/HeaderNav";
import { PriorityCard } from "@/components/PriorityCard";
import { FooterBar } from "@/components/FooterBar";

export default function AppDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userInitials, setUserInitials] = useState("U");

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push("/");
      } else {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", session.user.id)
          .maybeSingle();

        if (profile) {
          const initials = getInitials(profile.full_name || profile.email);
          setUserInitials(initials);
        }
        setLoading(false);
      }
    };

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.push("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const getInitials = (name: string) => {
    if (!name) return "MU";

    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const mockPriorities = [
    {
      rank: 1,
      badge: "Lapsed Revenue",
      titleAction: "Re-engage",
      titleSubject: "12 high-value customers",
      description:
        "12 customers who spent $50+ haven't returned in 6+ weeks. Personalized outreach could recover $2,400+ in revenue based on their purchase history.",
      metric1Label: "Potential Rev",
      metric1Value: "$2,400",
      metric2Value: "87%",
      ctaText: "View Customer List",
      isPrimary: true,
    },
    {
      rank: 2,
      badge: "Slow Period",
      titleAction: "Launch promotion for",
      titleSubject: "Thursday afternoons",
      description:
        "Thursday 2-5pm revenue is down 32% vs your Q1 baseline. A targeted promotion or social post could convert idle inventory into sales.",
      metric1Label: "WoW Change",
      metric1Value: "-32%",
      metric2Value: "82%",
      ctaText: "See Campaign Ideas",
      isPrimary: false,
    },
    {
      rank: 3,
      badge: "Margin Growth",
      titleAction: "Upsell",
      titleSubject: "premium coffee beans",
      description:
        "Your specialty roast avg price is $18.50, but 23% of customers who buy it also purchase add-ons. Bundle strategy could lift AOV by $7+.",
      metric1Label: "Opportunity",
      metric1Value: "+$7 AOV",
      metric2Value: "78%",
      ctaText: "Build Bundle",
      isPrimary: false,
    },
  ];

  const handlePriorityAction = (rank: number) => {
    console.log(`Priority ${rank} clicked`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-white/50">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col">
      <div
        className="fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <HeaderNav
        showSyncStatus
        syncStatus="Synced 2m ago"
        showProfile
        onSignOut={handleSignOut}
        userInitials={userInitials}
      />

      <main className="relative z-10 flex-1 px-8 lg:px-16 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16">
            <h1 className="text-7xl font-extrabold tracking-tight mb-6">
              What Matters
              <br />
              Most Right Now
            </h1>
            <p className="text-white/50 text-lg max-w-2xl">
              Based on your Square data, customer patterns, and what's worked
              before. Your business advisor knows what to focus on.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            {mockPriorities.map((priority, index) => (
              <PriorityCard
                key={priority.rank}
                {...priority}
                onAction={() => handlePriorityAction(priority.rank)}
                delay={0.1 + index * 0.1}
              />
            ))}
          </div>

          <div
            className="bg-white/[0.03] border border-white/10 p-8 rounded-2xl backdrop-blur-sm opacity-0 animate-slide-up"
            style={{ animationDelay: "0.4s" }}
          >
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div>
                <h3 className="text-xl font-bold mb-2">Weekly Performance</h3>
                <p className="text-white/50 text-sm">
                  Your decision velocity metrics for this cycle
                </p>
              </div>
              <div className="flex gap-12">
                <div className="text-center">
                  <div className="text-[10px] uppercase tracking-widest text-white/30 mb-2">
                    Avg. Time to Decision
                  </div>
                  <div className="text-3xl font-bold font-mono">1.4m</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] uppercase tracking-widest text-white/30 mb-2">
                    Last 30d Lift
                  </div>
                  <div className="text-3xl font-bold font-mono text-[#10B981]">
                    +18.2%
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] uppercase tracking-widest text-white/30 mb-2">
                    Decisions Executed
                  </div>
                  <div className="text-3xl font-bold font-mono">84</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <FooterBar />
    </div>
  );
}
