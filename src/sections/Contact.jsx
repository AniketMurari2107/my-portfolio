import { ExternalLink, Github, Instagram, Linkedin } from 'lucide-react';
import { CONTACT_DATA } from '../data/portfolioData.js';

export function Contact() {
  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <p className="text-xs font-medium tracking-widest text-teal-400 uppercase">
            Communication Station
          </p>
          <h2 className="font-display text-3xl font-bold text-slate-50 mt-1">
            Get In Touch
          </h2>
          <p className="text-sm text-slate-300 mt-1 max-w-xl">
            {CONTACT_DATA.availability}
          </p>
        </div>
        <div className="shrink-0 border border-white/10 bg-neutral-950/60 backdrop-blur-md px-4 py-2.5 rounded-xl">
          <div className="text-xs text-slate-400 uppercase tracking-wider">Developer</div>
          <div className="font-display text-base font-bold text-white">{CONTACT_DATA.name}</div>
          <div className="text-xs text-cyan-300">{CONTACT_DATA.role}</div>
        </div>
      </div>

      {/* Social Profiles Grid: GitHub, LinkedIn, Instagram */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* GitHub Card */}
        <a
          href={CONTACT_DATA.githubUrl}
          target="_blank"
          rel="noreferrer"
          className="group rounded-xl border border-white/10 bg-neutral-950/60 backdrop-blur-md p-5 flex flex-col justify-between gap-4 hover:border-white/20 hover:bg-neutral-900/80 transition-all hover:-translate-y-0.5"
        >
          <div className="flex items-start justify-between">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800/80 border border-white/10 text-white">
              <Github className="h-5 w-5" />
            </div>
            <ExternalLink className="h-4 w-4 text-slate-400 group-hover:text-white transition-colors" />
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider font-medium">GitHub</div>
            <div className="font-display text-lg font-bold text-white mt-0.5 group-hover:text-cyan-300 transition-colors">
              {CONTACT_DATA.githubHandle}
            </div>
            <div className="text-xs text-cyan-400 font-mono-tech mt-1 truncate">
              github.com/{CONTACT_DATA.githubHandle}
            </div>
          </div>
        </a>

        {/* LinkedIn Card */}
        <a
          href={CONTACT_DATA.linkedinUrl}
          target="_blank"
          rel="noreferrer"
          className="group rounded-xl border border-white/10 bg-neutral-950/60 backdrop-blur-md p-5 flex flex-col justify-between gap-4 hover:border-white/20 hover:bg-neutral-900/80 transition-all hover:-translate-y-0.5"
        >
          <div className="flex items-start justify-between">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Linkedin className="h-5 w-5" />
            </div>
            <ExternalLink className="h-4 w-4 text-slate-400 group-hover:text-white transition-colors" />
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider font-medium">LinkedIn</div>
            <div className="font-display text-lg font-bold text-white mt-0.5 group-hover:text-blue-300 transition-colors truncate">
              {CONTACT_DATA.linkedinHandle}
            </div>
            <div className="text-xs text-blue-400 font-mono-tech mt-1 truncate">
              linkedin.com/in/{CONTACT_DATA.linkedinHandle}
            </div>
          </div>
        </a>

        {/* Instagram Card */}
        <a
          href={CONTACT_DATA.instagramUrl}
          target="_blank"
          rel="noreferrer"
          className="group rounded-xl border border-white/10 bg-neutral-950/60 backdrop-blur-md p-5 flex flex-col justify-between gap-4 hover:border-white/20 hover:bg-neutral-900/80 transition-all hover:-translate-y-0.5"
        >
          <div className="flex items-start justify-between">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400">
              <Instagram className="h-5 w-5" />
            </div>
            <ExternalLink className="h-4 w-4 text-slate-400 group-hover:text-white transition-colors" />
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider font-medium">Instagram</div>
            <div className="font-display text-lg font-bold text-white mt-0.5 group-hover:text-pink-300 transition-colors">
              {CONTACT_DATA.instagramHandle}
            </div>
            <div className="text-xs text-pink-400 font-mono-tech mt-1 truncate">
              instagram.com/{CONTACT_DATA.instagramHandle.replace('@', '')}
            </div>
          </div>
        </a>
      </div>
    </div>
  );
}
