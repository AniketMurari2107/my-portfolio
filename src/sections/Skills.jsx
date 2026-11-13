import { useState } from 'react';
import { SKILLS_DATA } from '../data/portfolioData.js';

const CATEGORY_TABS = [
  { id: 'all', label: 'All Skills' },
  { id: 'frontend', label: 'Web & UI' },
  { id: 'mobile', label: 'Mobile' },
  { id: '3d', label: '3D Graphics' },
  { id: 'backend', label: 'Backend & Tools' },
];

export function Skills() {
  const [activeCategory, setActiveCategory] = useState('all');

  const filteredSkills = SKILLS_DATA.filter((skill) => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'backend') {
      return skill.category === 'backend' || skill.category === 'tools' || skill.category === 'core';
    }
    return skill.category === activeCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-widest text-blue-400 uppercase">
            Holographic Skill Tower
          </p>
          <h2 className="font-display text-3xl font-bold text-slate-50 mt-1">
            Core Technologies &amp; Stack
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-800 bg-slate-950 p-1">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveCategory(tab.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                activeCategory === tab.id
                  ? 'bg-blue-500 text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3.5 md:grid-cols-2">
        {filteredSkills.map((skill) => (
          <div
            key={skill.id}
            className="rounded-xl border border-slate-800 bg-slate-900/55 p-4 space-y-2.5"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span
                  className="h-2.5 w-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: skill.color }}
                />
                <span className="font-display text-base font-semibold text-slate-100">
                  {skill.name}
                </span>
              </div>
              <span className="font-mono-tech text-xs text-cyan-400 tabular-nums">
                {skill.level}%
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${skill.level}%`, backgroundColor: skill.color }}
              />
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">{skill.summary}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
