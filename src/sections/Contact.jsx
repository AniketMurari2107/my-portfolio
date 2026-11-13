import { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Code2,
  ExternalLink,
  Linkedin,
  Mail,
  Send,
} from 'lucide-react';
import { CONTACT_DATA } from '../data/portfolioData.js';
import { audioEngine } from '../game/audioEngine.js';

export function Contact() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMsg = message.trim();

    if (!trimmedName || !trimmedEmail || !trimmedMsg) {
      setError('Please complete your name, email address, and message before sending.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setError('');
    setSent(true);
    audioEngine.playInteract();
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium tracking-widest text-teal-400 uppercase">
          Communication Station
        </p>
        <h2 className="font-display text-3xl font-bold text-slate-50 mt-1">
          Connect With {CONTACT_DATA.name}
        </h2>
        <p className="text-sm text-slate-300 mt-2 max-w-xl">
          {CONTACT_DATA.availability}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        {/* Direct Channels & Configurable Links */}
        <div className="md:col-span-5 space-y-4 rounded-xl border border-slate-800 bg-slate-900/55 p-5">
          <div className="space-y-1">
            <div className="text-xs text-slate-400 uppercase tracking-wider">Profile</div>
            <div className="font-display text-lg font-semibold text-slate-100">
              {CONTACT_DATA.name}
            </div>
            <div className="text-xs text-cyan-300">{CONTACT_DATA.role}</div>
          </div>

          <div className="h-px bg-slate-800" />

          <div className="space-y-3 text-sm">
            {/* Email */}
            <div className="flex items-center gap-2.5 text-slate-200">
              <Mail className="h-4 w-4 text-teal-400 shrink-0" />
              <span className="truncate">{CONTACT_DATA.email}</span>
            </div>

            {/* GitHub (Configurable) */}
            {CONTACT_DATA.githubUrl ? (
              <a
                href={CONTACT_DATA.githubUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 hover:border-teal-400/60 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-cyan-400" />
                  GitHub
                </span>
                <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
              </a>
            ) : (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs text-slate-400">
                <span className="flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-slate-500" />
                  {CONTACT_DATA.githubLabel}
                </span>
              </div>
            )}

            {/* LinkedIn (Configurable) */}
            {CONTACT_DATA.linkedinUrl ? (
              <a
                href={CONTACT_DATA.linkedinUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 hover:border-teal-400/60 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Linkedin className="h-4 w-4 text-blue-400" />
                  LinkedIn
                </span>
                <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
              </a>
            ) : (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs text-slate-400">
                <span className="flex items-center gap-2">
                  <Linkedin className="h-4 w-4 text-slate-500" />
                  {CONTACT_DATA.linkedinLabel}
                </span>
              </div>
            )}
          </div>

          <div className="pt-1">
            <a
              href={`mailto:${CONTACT_DATA.email}`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-400 px-4 py-2.5 text-xs font-semibold text-slate-950 hover:bg-teal-300 transition-colors"
            >
              <Mail className="h-3.5 w-3.5" />
              Contact via Email
            </a>
          </div>
        </div>

        {/* Interactive Message Composer */}
        <div className="md:col-span-7">
          {sent ? (
            <div className="rounded-xl border border-teal-500/40 bg-teal-500/10 p-6 space-y-4">
              <div className="flex items-center gap-3 text-teal-300">
                <CheckCircle2 className="h-6 w-6 shrink-0" />
                <h3 className="font-display text-xl font-semibold text-slate-50">
                  Message Queued for {CONTACT_DATA.name}
                </h3>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">
                Thanks, <strong className="text-white">{name}</strong>. Your message has been
                recorded in this session. You can also email directly at{' '}
                <span className="text-teal-300">{CONTACT_DATA.email}</span>.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSent(false);
                  setName('');
                  setEmail('');
                  setMessage('');
                }}
                className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-medium text-slate-200 hover:border-teal-400 transition-colors"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {error && (
                <div
                  role="alert"
                  className="flex items-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-200"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="contact-name" className="block text-xs font-medium text-slate-300">
                    Your Name
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Mercer"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-teal-400 focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="contact-email" className="block text-xs font-medium text-slate-300">
                    Email Address
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@studio.dev"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-teal-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="contact-message" className="block text-xs font-medium text-slate-300">
                  Message Details
                </label>
                <textarea
                  id="contact-message"
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Share details about a project, opportunity, or collaboration..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-teal-400 focus:outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-teal-400 px-5 py-2.5 text-xs font-semibold text-slate-950 hover:bg-teal-300 transition-colors"
              >
                <Send className="h-3.5 w-3.5" />
                Send Message
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
