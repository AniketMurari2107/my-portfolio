import { Award, CheckCircle2, Code2, Flag, Lock, Sparkles } from 'lucide-react';
import { ACHIEVEMENTS_DATA } from '../data/portfolioData.js';
import { evaluateExplorationAchievements } from '../game/worldGameplayData.js';
import { useGameStore } from '../store/gameStore.js';

export function Achievements() {
  const { completedProjects, technologiesLearned, milestones, certifications } = ACHIEVEMENTS_DATA;
  const checkpointsCleared = useGameStore((s) => s.checkpointsCleared);
  const collectedCrystals = useGameStore((s) => s.collectedCrystals);
  const discoveredEggs = useGameStore((s) => s.discoveredEggs);
  const visitedZones = useGameStore((s) => s.visitedZones);

  const liveAchievements = evaluateExplorationAchievements({
    checkpointsCleared,
    collectedCrystals,
    discoveredEggs,
    visitedZones,
  });

  return (
    <div className="space-y-7">
      <div>
        <p className="text-xs font-medium tracking-widest text-amber-400 uppercase">
          Achievement Zone
        </p>
        <h2 className="font-display text-3xl font-bold text-slate-50 mt-1">
          Projects, Skills &amp; Engineering Milestones
        </h2>
      </div>

      {/* Live Secret & World Exploration Achievements */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2 text-sm font-semibold text-slate-200">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <h3 className="font-display tracking-wide uppercase text-xs text-slate-300">
              In-World &amp; Secret Achievements
            </h3>
          </div>
          <span className="font-mono-tech text-[11px] text-cyan-300">
            {liveAchievements.filter((a) => a.unlocked).length}/{liveAchievements.length} Unlocked
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {liveAchievements.map((ach) => (
            <div
              key={ach.id}
              className={`rounded-xl border p-4 space-y-1.5 transition-colors ${
                ach.unlocked
                  ? 'border-amber-400/50 bg-amber-500/10'
                  : 'border-slate-800 bg-slate-900/45'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-sm font-bold text-white flex items-center gap-1.5">
                  {ach.unlocked ? (
                    <Sparkles className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  ) : (
                    <Lock className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                  )}
                  {ach.isSecret && !ach.unlocked ? 'Secret Achievement' : ach.title}
                </span>
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-mono-tech ${
                    ach.unlocked
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/35'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {ach.unlocked ? 'UNLOCKED' : ach.progressLabel}
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {ach.isSecret && !ach.unlocked
                  ? 'Explore hidden corners of the 3D universe to uncover Easter eggs.'
                  : ach.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 1. Completed Projects */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
          <CheckCircle2 className="h-4 w-4 text-amber-400" />
          <h3 className="font-display tracking-wide uppercase text-xs text-slate-300">
            Completed Projects
          </h3>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {completedProjects.map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-slate-800 bg-slate-900/55 p-4 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-base font-semibold text-white">
                  {item.title}
                </span>
                <span className="rounded bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-mono-tech text-amber-300">
                  {item.status}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-slate-400">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 2. Technologies Learned */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
          <Code2 className="h-4 w-4 text-cyan-400" />
          <h3 className="font-display tracking-wide uppercase text-xs text-slate-300">
            Technologies Learned
          </h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {technologiesLearned.map((tech) => (
            <span
              key={tech}
              className="rounded-lg border border-slate-700/80 bg-slate-900/75 px-3 py-1.5 text-xs font-medium text-cyan-200"
            >
              {tech}
            </span>
          ))}
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 3. Development Milestones */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <Flag className="h-4 w-4 text-blue-400" />
            <h3 className="font-display tracking-wide uppercase text-xs text-slate-300">
              Development Milestones
            </h3>
          </div>
          <div className="space-y-2.5">
            {milestones.map((m) => (
              <div
                key={m.title}
                className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm text-slate-100">{m.title}</span>
                  <span className="font-mono-tech text-xs text-blue-300 tabular-nums">{m.year}</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{m.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 4. Certifications */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <Award className="h-4 w-4 text-violet-400" />
            <h3 className="font-display tracking-wide uppercase text-xs text-slate-300">
              Certifications
            </h3>
          </div>
          <div className="space-y-2.5">
            {certifications.map((cert) => (
              <div
                key={cert.title}
                className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm text-slate-100">{cert.title}</span>
                  <span className="font-mono-tech text-xs text-violet-300 tabular-nums">
                    {cert.year}
                  </span>
                </div>
                <div className="text-xs text-slate-300">{cert.issuer}</div>
                <div className="text-[11px] font-mono-tech text-slate-500">{cert.note}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
