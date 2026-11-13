import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { Award, Flag, Gem, Sparkles } from 'lucide-react';
import { useGameStore } from '../store/gameStore.js';

function NotificationCard({ item, onDismiss }) {
  const cardRef = useRef(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return undefined;

    const tl = gsap.timeline();
    tl.fromTo(
      el,
      { opacity: 0, y: -20, scale: 0.94 },
      { opacity: 1, y: 0, scale: 1, duration: 0.34, ease: 'power3.out' }
    );

    const timer = window.setTimeout(() => {
      gsap.to(el, {
        opacity: 0,
        y: -14,
        scale: 0.96,
        duration: 0.28,
        ease: 'power2.in',
        onComplete: () => onDismiss(item.id),
      });
    }, item.durationMs || 3400);

    return () => {
      tl.kill();
      window.clearTimeout(timer);
    };
  }, [item.id, item.durationMs, onDismiss]);

  const Icon =
    item.type === 'easter-egg'
      ? Sparkles
      : item.type === 'checkpoint'
        ? Flag
        : item.type === 'crystal'
          ? Gem
          : Award;

  return (
    <div
      ref={cardRef}
      role="status"
      className="hud-surface pointer-events-auto flex items-start gap-3 rounded-xl px-4 py-3 max-w-md shadow-[0_14px_32px_rgba(2,6,23,0.85)]"
      style={{ borderColor: `${item.accent || '#06b6d4'}66` }}
    >
      <div
        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${item.accent || '#06b6d4'}22`, color: item.accent || '#06b6d4' }}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="font-display text-xs sm:text-sm font-bold tracking-wide text-white">
          {item.title}
        </div>
        <div className="text-xs text-slate-300 mt-0.5 leading-snug">{item.message}</div>
      </div>
    </div>
  );
}

/**
 * Top-center GSAP-animated HUD notification banner stack for checkpoints,
 * crystal pickups, and secret Easter egg discoveries.
 */
export function HudNotifications() {
  const gamePhase = useGameStore((s) => s.gamePhase);
  const notifications = useGameStore((s) => s.notifications);
  const dismissNotification = useGameStore((s) => s.dismissNotification);

  if (gamePhase !== 'playing' || notifications.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed top-20 left-1/2 z-30 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none px-4 w-full max-w-lg"
    >
      {notifications.map((item) => (
        <NotificationCard key={item.id} item={item} onDismiss={dismissNotification} />
      ))}
    </div>
  );
}
