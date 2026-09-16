import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول | Rentify" },
      { name: "description", content: "تسجيل الدخول إلى نظام Rentify لإدارة العقارات والإيجارات." },
    ],
  }),
  component: LoginPage,
});

interface SlideItem {
  id: number;
  image: string;
  title: string;
}

const SLIDES: SlideItem[] = [
  { id: 1, image: "/rentify-slider.png", title: "Rentify - إدارة متكاملة" },
  { id: 2, image: "/rentify-slider1.png", title: "Rentify - تحصيلات ذكية" },
  { id: 3, image: "/rentify-slider2.png", title: "Rentify - تنظيم فائق" },
];

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Slider state
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
  }, []);

  // Auto-play timer (5 seconds)
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      nextSlide();
    }, 5000);
    return () => clearInterval(interval);
  }, [isPaused, nextSlide]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      toast.error(error.message || "فشل تسجيل الدخول. يرجى التحقق من البيانات");
      setIsLoading(false);
    } else {
      toast.success("تم تسجيل الدخول بنجاح! مرحباً بك.");
      navigate({ to: "/dashboard" });
    }
  };

  return (
    <div className="h-screen max-h-screen w-full overflow-hidden flex flex-col lg:grid lg:grid-cols-12 bg-background text-foreground">
      {/* ============================================================ */}
      {/* Left/Form Column: Clean, Compact, Fitted in 100vh             */}
      {/* ============================================================ */}
      <div className="flex h-full flex-col justify-between p-5 sm:p-6 lg:p-8 lg:col-span-5 xl:col-span-5 2xl:col-span-4 bg-card/60 backdrop-blur-sm border-b lg:border-b-0 lg:border-l border-border/60 z-10 overflow-y-auto lg:overflow-y-hidden">
        {/* Brand Header */}
        <div className="shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="Rentify Logo"
              className="h-9 w-9 rounded-xl shadow-sm ring-1 ring-primary/20 object-contain bg-white p-1"
            />
            <div>
              <span className="text-xl font-black tracking-tight text-primary font-sans leading-none">
                Rentify
              </span>
              <span className="block text-[10px] font-medium text-muted-foreground leading-tight mt-0.5">
                نظام إدارة العقارات المتطور
              </span>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
            <Sparkles className="w-3 h-3 text-gold" />
            إصدار 2026
          </span>
        </div>

        {/* Mobile/Tablet Compact Slider Preview (only on small screens) */}
        <div className="my-3 lg:hidden shrink-0 overflow-hidden rounded-xl border border-border/80 bg-slate-950 p-1.5 shadow-md">
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg">
            <img
              src={SLIDES[currentSlide].image}
              alt={SLIDES[currentSlide].title}
              className="h-full w-full object-cover transition-all duration-500"
            />
          </div>
          {/* Mobile slide dots */}
          <div className="flex justify-center gap-1.5 mt-1.5 py-0.5">
            {SLIDES.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                aria-label={`شريحة ${idx + 1}`}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  idx === currentSlide ? "w-5 bg-gold" : "w-1.5 bg-white/30"
                )}
              />
            ))}
          </div>
        </div>

        {/* Auth Form Container - Compact and Vertically Centered */}
        <div className="my-auto py-2 max-w-sm w-full mx-auto">
          <div className="mb-5 text-center">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              تسجيل الدخول
            </h1>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
              أهلاً بك مجدداً. أدخل بيانات حسابك للوصول إلى لوحة تحكم Rentify ومتابعة عقاراتك.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-3.5">
            {/* Email Field */}
            <div className="space-y-1.5 text-right">
              <label
                htmlFor="email"
                className="text-xs font-bold text-muted-foreground flex items-center justify-between"
              >
                <span>البريد الإلكتروني</span>
                <Mail className="h-3.5 w-3.5 text-muted-foreground/80" />
              </label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@rentify.app"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="h-10 text-left rounded-xl bg-background/80 border-border/80 focus:border-primary focus:ring-primary/20 text-sm font-medium transition-all"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5 text-right">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-xs font-bold text-muted-foreground flex items-center gap-1.5"
                >
                  <Lock className="h-3.5 w-3.5 text-muted-foreground/80" />
                  <span>كلمة المرور</span>
                </label>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="h-10 pl-10 pr-4 text-left rounded-xl bg-background/80 border-border/80 focus:border-primary focus:ring-primary/20 text-sm font-medium transition-all"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              size="default"
              disabled={isLoading}
              className="w-full h-10 text-sm font-bold rounded-xl shadow-md shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-[0.99] gap-2 mt-2"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  <span>جاري تسجيل الدخول...</span>
                </>
              ) : (
                <>
                  <span>دخول إلى النظام</span>
                  <ChevronLeft className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* System info badge */}
          <div className="mt-5 rounded-xl bg-muted/50 p-2.5 border border-border/60 flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="h-4 w-4 text-primary" />
            </div>
            <div className="text-right text-[11px]">
              <p className="font-semibold text-foreground">اتصال آمن ومشفّر</p>
              <p className="text-muted-foreground">بياناتك العقارية والمالية محمية بأعلى معايير الأمان.</p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="shrink-0 pt-2 text-center text-[11px] text-muted-foreground">
          <p>© 2026 Rentify. جميع الحقوق محفوظة.</p>
        </div>
      </div>

      {/* ============================================================ */}
      {/* Right/Slider Column: Premium Interactive Hero Slider          */}
      {/* ============================================================ */}
      <div
        className="relative hidden h-full lg:flex lg:col-span-7 xl:col-span-7 2xl:col-span-8 flex-col justify-between overflow-hidden bg-gradient-to-br from-[#060D1A] via-[#0A1628] to-[#040911] p-6 xl:p-8 text-white select-none"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Ambient Decorative Light Orbs */}
        <div className="pointer-events-none absolute -left-20 -top-20 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-gold/15 blur-3xl" />
        <div className="pointer-events-none absolute top-1/2 right-1/4 h-64 w-64 rounded-full bg-blue-600/10 blur-3xl" />

        {/* Top Bar inside Slider */}
        <div className="relative z-20 shrink-0 flex items-center justify-between pb-2">
          <div className="flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1 backdrop-blur-md border border-white/15">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-white/90">
              Rentify Property Cloud
            </span>
          </div>

          {/* Slide Indicator counter */}
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-white/80 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
            <span className="text-gold">0{currentSlide + 1}</span>
            <span className="text-white/40">/</span>
            <span>0{SLIDES.length}</span>
          </div>
        </div>

        {/* Center: Image Display Container (Flexible, fits without scrolling) */}
        <div className="relative z-10 my-auto flex-1 min-h-0 w-full flex items-center justify-center p-2">
          <div className="relative w-full h-full max-h-[66vh] max-w-4xl flex items-center justify-center">
            {SLIDES.map((slide, idx) => {
              const isActive = idx === currentSlide;
              return (
                <div
                  key={slide.id}
                  className={cn(
                    "absolute inset-0 flex items-center justify-center transition-all duration-700 ease-out",
                    isActive
                      ? "opacity-100 scale-100 z-10"
                      : "opacity-0 scale-95 pointer-events-none z-0"
                  )}
                >
                  {/* Glowing background halo */}
                  <div className="absolute inset-4 rounded-3xl bg-gradient-to-tr from-primary/30 via-gold/15 to-transparent blur-3xl pointer-events-none" />

                  {/* High Resolution Mockup Image */}
                  <img
                    src={slide.image}
                    alt={slide.title}
                    className="relative max-h-full max-w-full rounded-2xl object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.85)] ring-1 ring-white/10 transition-transform duration-700 hover:scale-[1.01]"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Bar: Slider Navigation & Controls */}
        <div className="relative z-20 shrink-0 flex items-center justify-between pt-3 border-t border-white/10">
          {/* Slide Dots */}
          <div className="flex items-center gap-2">
            {SLIDES.map((slide, idx) => (
              <button
                key={slide.id}
                onClick={() => setCurrentSlide(idx)}
                aria-label={`الانتقال إلى الشريحة ${idx + 1}`}
                className={cn(
                  "group relative h-2.5 rounded-full transition-all duration-300 focus:outline-none",
                  idx === currentSlide
                    ? "w-8 bg-gold shadow-md shadow-gold/40 ring-2 ring-gold/30"
                    : "w-2.5 bg-white/30 hover:bg-white/60"
                )}
              >
                <span className="sr-only">شريحة {idx + 1}</span>
              </button>
            ))}
          </div>

          {/* Navigation Arrows */}
          <div className="flex items-center gap-2">
            <button
              onClick={prevSlide}
              aria-label="الشريحة السابقة"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md border border-white/15 transition-all hover:bg-white/20 hover:scale-105 active:scale-95 shadow-sm"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={nextSlide}
              aria-label="الشريحة التالية"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md border border-white/15 transition-all hover:bg-white/20 hover:scale-105 active:scale-95 shadow-sm"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
