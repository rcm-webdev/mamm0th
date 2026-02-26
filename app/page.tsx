import { HeaderNav } from "@/components/HeaderNav";
import { Target, TrendingUp, Clock, ArrowBigRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div
        className="fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <HeaderNav />

      <main className="relative z-10 px-8">
        <section className="flex flex-col items-center justify-center min-h-[calc(100vh-88px)] text-center max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 mb-8 animate-slide-up">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-sm text-white/70">
              Business Intelligence For Square Sellers
            </span>
          </div>

          <h1
            className="text-6xl md:text-7xl font-extrabold tracking-tight mb-6 animate-slide-up"
            style={{ animationDelay: "0.1s" }}
          >
            Business guidance
            <br />
            that grows with you
          </h1>

          <p
            className="text-xl text-white/50 mb-12 max-w-2xl animate-slide-up"
            style={{ animationDelay: "0.2s" }}
          >
            AI business intelligence agent,{" "}
            <span className="text-white">Mamm0th</span>. Fortune 500 companies
            pay consultants for strategic advice. You get it through a tool that
            already understands your business.
          </p>

          <div
            className="flex items-center gap-4 animate-slide-up"
            style={{ animationDelay: "0.3s" }}
          >
            <Link
              href="/signup"
              className="bg-white text-black font-bold px-8 py-4 rounded-lg hover:bg-white/90 transition-all active:scale-[0.98]"
            >
              Get Started
            </Link>
            <Link
              href="/login"
              className="bg-white/5 border border-white/10 text-white font-bold px-8 py-4 rounded-lg hover:bg-white/10 transition-all active:scale-[0.98]"
            >
              Sign In
            </Link>
          </div>
        </section>

        <section className="max-w-6xl mx-auto py-24">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white/[0.03] border border-white/10 p-8 rounded-2xl backdrop-blur-sm hover:bg-white/[0.05] transition-all">
              <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center mb-6">
                <Target className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">Knows Your Business</h3>
              <p className="text-white/50 leading-relaxed">
                Connects to your Square data to understand inventory, cash flow,
                and customer patterns. Gets smarter every week.
              </p>
            </div>

            <div className="bg-white/[0.03] border border-white/10 p-8 rounded-2xl backdrop-blur-sm hover:bg-white/[0.05] transition-all">
              <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center mb-6">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">
                Plain Language Guidance
              </h3>
              <p className="text-white/50 leading-relaxed">
                No dashboards or jargon. Just clear recommendations on what to
                do next to grow your revenue.
              </p>
            </div>

            <div className="bg-white/[0.03] border border-white/10 p-8 rounded-2xl backdrop-blur-sm hover:bg-white/[0.05] transition-all">
              <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center mb-6">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">Remembers Context</h3>
              <p className="text-white/50 leading-relaxed">
                Persistent memory means you never start over. Every conversation
                builds on what your business advisor already knows.
              </p>
            </div>
          </div>
        </section>

        <section className="max-w-4xl mx-auto py-24 text-center">
          <h2 className="text-4xl font-extrabold tracking-tight mb-6">
            Built for independent sellers
          </h2>
          <p className="text-xl text-white/50 mb-12">
            The matcha shop. The food truck. The boutique that's been around for
            decades.
            <br />
            This is for you.
          </p>

          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-white text-black font-bold px-8 py-4 rounded-lg hover:bg-white/90 transition-all active:scale-[0.98]"
          >
            Start Analyzing Your Business
            <ArrowBigRight className="w-5 h-5" />
          </Link>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/5 py-8 px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-white/40">
          <p>&copy; 2026 Mamm0th. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-white transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Terms
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
