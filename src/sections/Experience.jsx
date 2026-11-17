import { useState } from 'react';
import { EXPERIENCE_DATA } from '../data/portfolioData.js';

const TYPE_BADGE_STYLES = {
  Experience: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  Education: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  Milestone: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
};

export function Experience() {
  const [filter, setFilter] = useState('all');

  const items =
    filter === 'all'
      ? EXPERIENCE_DATA
      : EXPERIENCE_DATA.filter((entry) => entry.type.toLowerCase() === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-widest text-indigo-400 uppercase">
            Futuristic Timeline Building
          </p>
          <h2 className="font-display text-3xl font-bold text-slate-50 mt-1">
            Education, Experience &amp; Milestones
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-white/10 bg-neutral-950/60 backdrop-blur-md p-1">
          {[
            { id: 'all', label: 'All' },
            { id: 'experience', label: 'Experience' },
            { id: 'education', label: 'Education' },
            { id: 'milestone', label: 'Milestones' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                filter === tab.id
                  ? 'bg-indigo-500 text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {items.map((item, idx) => (
          <div
            key={item.id}
            className="rounded-xl border border-white/10 bg-neutral-950/60 backdrop-blur-md p-5 space-y-2.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-mono-tech text-xs text-indigo-300 tabular-nums">
                  0{idx + 1}.
                </span>
                <span
                  className={`rounded border px-2 py-0.5 text-[10px] font-mono-tech uppercase ${
                    TYPE_BADGE_STYLES[item.type] || 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {item.type}
                </span>
                <h3 className="font-display text-lg font-semibold text-slate-100">
                  {item.title}
                </h3>
              </div>
              <span className="font-mono-tech text-xs text-slate-400 tabular-nums">
                {item.period}
              </span>
            </div>

            <div className="text-xs font-medium text-cyan-300">{item.organization}</div>
            <p className="text-sm leading-relaxed text-slate-300">{item.description}</p>
            <div className="pt-2 border-t border-slate-800/70 text-xs font-mono-tech text-slate-400">
              {item.tags}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
