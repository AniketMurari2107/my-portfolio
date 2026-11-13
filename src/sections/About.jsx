import { Compass, Cpu, Layers, Sparkles } from 'lucide-react';
import { ABOUT_DATA } from '../data/portfolioData.js';

const PILLAR_ICONS = [Cpu, Layers, Compass];

export function About({ onNavigateSection }) {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3 max-w-2xl">
          <p className="text-xs font-medium tracking-widest text-cyan-400 uppercase">
            {ABOUT_DATA.role}
          </p>
          <h2 className="font-display text-3xl font-bold tracking-tight text-slate-50 sm:text-4xl">
            {ABOUT_DATA.name} — {ABOUT_DATA.headline}
          </h2>
          <p className="text-base leading-relaxed text-slate-200">
            &ldquo;{ABOUT_DATA.description}&rdquo;
          </p>
          <p className="text-sm leading-relaxed text-slate-400">{ABOUT_DATA.extendedBio}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 shrink-0 border border-slate-800 bg-slate-950/60 p-4 rounded-xl">
          {ABOUT_DATA.stats.map((stat) => (
            <div key={stat.label}>
              <div className={`font-display text-2xl font-bold tabular-nums ${stat.accent}`}>
                {stat.value}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="h-px bg-slate-800/80" />

      <div className="grid gap-5 md:grid-cols-3">
        {ABOUT_DATA.pillars.map((item, idx) => {
          const Icon = PILLAR_ICONS[idx % PILLAR_ICONS.length];
          return (
            <div
              key={item.title}
              className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-2.5"
            >
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                <Icon className="h-4 w-4" />
              </div>
              <h3 className="font-display text-lg font-semibold text-slate-100">{item.title}</h3>
              <p className="text-sm leading-relaxed text-slate-400">{item.body}</p>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
        <div className="flex items-center gap-3 text-sm text-slate-300">
          <Sparkles className="h-4 w-4 text-cyan-400 shrink-0" />
          <span>Explore the Skills Tower or Project Showroom next.</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigateSection('projects')}
            className="rounded-lg bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400 transition-colors whitespace-nowrap"
          >
            View Projects
          </button>
          <button
            type="button"
            onClick={() => onNavigateSection('contact')}
            className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-cyan-400/60 transition-colors whitespace-nowrap"
          >
            Contact Me
          </button>
        </div>
      </div>
    </div>
  );
}
