import { useState } from 'react';
import { Code2, ExternalLink, Play } from 'lucide-react';
import { PROJECTS_DATA } from '../data/portfolioData.js';

export function Projects({ onCloseAndDrive }) {
  const [selectedId, setSelectedId] = useState(PROJECTS_DATA[0]?.id || null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-widest text-violet-400 uppercase">
            Futuristic Project Showroom
          </p>
          <h2 className="font-display text-3xl font-bold text-slate-50 mt-1">
            Featured Software &amp; 3D Builds
          </h2>
        </div>

        <button
          type="button"
          onClick={() => onCloseAndDrive()}
          className="inline-flex items-center gap-2 rounded-lg bg-violet-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-violet-400 transition-colors whitespace-nowrap self-start sm:self-auto"
        >
          <Play className="h-3.5 w-3.5" />
          Resume Driving
        </button>
      </div>

      {/* All Project Showroom Cards */}
      <div className="grid gap-5 md:grid-cols-3">
        {PROJECTS_DATA.map((project) => {
          const isSelected = selectedId === project.id;
          return (
            <article
              key={project.id}
              onClick={() => setSelectedId(project.id)}
              className={`flex flex-col justify-between overflow-hidden rounded-xl border transition-colors cursor-pointer ${
                isSelected
                  ? 'border-violet-400/80 bg-neutral-900/80 backdrop-blur-md shadow-[0_0_24px_rgba(139,92,246,0.25)]'
                  : 'border-white/10 bg-neutral-950/60 backdrop-blur-md hover:border-white/20'
              }`}
            >
              <div>
                {/* Project Image */}
                <div className="aspect-video w-full overflow-hidden border-b border-white/10 bg-[#050814]">
                  <img
                    src={project.image}
                    alt={`${project.name} preview`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>

                {/* Project Info */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2 text-[11px] font-mono-tech text-slate-400">
                    <span>{project.category}</span>
                    <span className="tabular-nums">{project.year}</span>
                  </div>

                  <h3 className="font-display text-lg font-bold text-slate-50">
                    {project.name}
                  </h3>

                  <p className="text-xs leading-relaxed text-slate-300">
                    {project.description}
                  </p>

                  {/* Technology Stack Tags */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {project.technology.map((tech) => (
                      <span
                        key={tech}
                        className="rounded-md border border-white/10 bg-neutral-900/80 px-2 py-0.5 text-[10px] font-mono-tech text-cyan-300"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Configurable GitHub & Live Demo Links */}
              <div className="flex items-center gap-2 border-t border-white/10 bg-neutral-950/40 backdrop-blur-md p-3">
                {project.githubUrl ? (
                  <a
                    href={project.githubUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-neutral-900/60 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-white/20 transition-colors"
                  >
                    <Code2 className="h-3.5 w-3.5" />
                    <span>GitHub</span>
                  </a>
                ) : (
                  <span
                    title="Configure githubUrl in src/data/portfolioData.js"
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/5 bg-neutral-950/40 px-2.5 py-1.5 text-[11px] text-slate-500"
                  >
                    <Code2 className="h-3.5 w-3.5" />
                    <span>GitHub Link</span>
                  </span>
                )}

                {project.liveUrl ? (
                  <a
                    href={project.liveUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-violet-500/20 border border-violet-400/40 px-3 py-1.5 text-xs font-medium text-violet-200 hover:bg-violet-500/30 transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Live Demo</span>
                  </a>
                ) : (
                  <span
                    title="Configure liveUrl in src/data/portfolioData.js"
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/5 bg-neutral-950/40 px-2.5 py-1.5 text-[11px] text-slate-500"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Demo Link</span>
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <p className="text-[11px] font-mono-tech text-slate-500">
        Project entries, images, and GitHub/Demo URLs are centrally configurable in src/data/portfolioData.js.
      </p>
    </div>
  );
}
