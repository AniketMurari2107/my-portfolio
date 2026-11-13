import { PROJECT_THUMBNAILS } from './projectThumbnails.js';

/**
 * CENTRALIZED EDITABLE PORTFOLIO CONTENT
 * Update any field below to customize Aniket's 3D world locations, skills, projects,
 * timeline, achievements, and contact links without touching 3D scene logic.
 */

export const ABOUT_DATA = {
  name: 'Aniket',
  role: 'Aspiring Software Developer',
  headline: 'Building Worlds Where Code Moves',
  description:
    'I enjoy building interactive applications, exploring 3D technologies and creating digital experiences.',
  extendedBio:
    'Focused on blending responsive web interfaces, interactive 3D scenes, and practical software engineering across desktop, tablet, and mobile platforms.',
  stats: [
    { label: 'Core Tech Stack', value: '8+', accent: 'text-cyan-400' },
    { label: 'World Locations', value: '6', accent: 'text-blue-400' },
    { label: 'Target Frame Rate', value: '60 FPS', accent: 'text-violet-400' },
    { label: 'Focus', value: '3D & Web', accent: 'text-teal-400' },
  ],
  pillars: [
    {
      title: 'Interactive Applications',
      body: 'Designing clean, responsive React & React Native interfaces built around intuitive user feedback and everyday usability.',
    },
    {
      title: '3D Web Exploration',
      body: 'Experimenting with Three.js, React Three Fiber, physics engines, and real-time lighting to turn static pages into explorable spaces.',
    },
    {
      title: 'End-to-End Engineering',
      body: 'Connecting frontend craftsmanship with Firebase data persistence, clean Git workflows, and maintainable modular JavaScript.',
    },
  ],
};

// Editable Skills List — drives BOTH the Skills modal AND the floating 3D Skill Tower holograms
export const SKILLS_DATA = [
  {
    id: 'javascript',
    name: 'JavaScript',
    category: 'core',
    level: 92,
    color: '#facc15',
    summary: 'Modern ES6+ modules, async flows, DOM APIs, and interactive application logic.',
  },
  {
    id: 'react',
    name: 'React',
    category: 'frontend',
    level: 90,
    color: '#38bdf8',
    summary: 'Component-driven UI architecture, hooks, state management, and responsive interfaces.',
  },
  {
    id: 'react-native',
    name: 'React Native',
    category: 'mobile',
    level: 82,
    color: '#06b6d4',
    summary: 'Cross-platform mobile apps for Android & iOS with clean navigation and native UX.',
  },
  {
    id: 'html',
    name: 'HTML',
    category: 'frontend',
    level: 94,
    color: '#fb923c',
    summary: 'Semantic markup, accessibility structure, and modern web document architecture.',
  },
  {
    id: 'css',
    name: 'CSS',
    category: 'frontend',
    level: 89,
    color: '#60a5fa',
    summary: 'Responsive grids, flex layouts, animations, custom styling systems, and Tailwind CSS.',
  },
  {
    id: 'threejs',
    name: 'Three.js',
    category: '3d',
    level: 85,
    color: '#a855f7',
    summary: '3D scenes, procedural geometry, PBR materials, cameras, lighting, and React Three Fiber.',
  },
  {
    id: 'firebase',
    name: 'Firebase',
    category: 'backend',
    level: 80,
    color: '#f59e0b',
    summary: 'Real-time database, Firestore collections, authentication, and cloud-backed app workflows.',
  },
  {
    id: 'git-github',
    name: 'Git and GitHub',
    category: 'tools',
    level: 88,
    color: '#2dd4bf',
    summary: 'Version control, branching workflows, pull requests, and collaborative project management.',
  },
];

// Editable Projects List — drives BOTH the Projects modal AND the 3D Showroom displays.
// Leave `githubUrl` or `liveUrl` as '' until you have a real repository/deployment link to attach.
export const PROJECTS_DATA = [
  {
    id: 'class-attendance-app',
    name: 'Class Attendance App',
    category: 'Mobile & Cloud',
    year: '2025',
    description:
      'A streamlined digital attendance management application designed to mark daily student presence, review subject-wise attendance ratios, and sync records cleanly in real time.',
    technology: ['React Native', 'JavaScript', 'Firebase', 'CSS'],
    image: PROJECT_THUMBNAILS.attendance,
    githubUrl: '', // Configurable: add your GitHub repository URL here
    liveUrl: '',   // Configurable: add your live demo URL here
    accent: '#06b6d4',
  },
  {
    id: 'gym-management-system',
    name: 'Gym Management System',
    category: 'Web Application',
    year: '2025',
    description:
      'A centralized fitness club operations platform built to organize member profiles, track subscription renewals, monitor daily check-ins, and manage training schedules.',
    technology: ['React', 'JavaScript', 'HTML', 'CSS', 'Firebase'],
    image: PROJECT_THUMBNAILS.gym,
    githubUrl: '', // Configurable: add your GitHub repository URL here
    liveUrl: '',   // Configurable: add your live demo URL here
    accent: '#8b5cf6',
  },
  {
    id: '3d-portfolio-website',
    name: '3D Portfolio Website',
    category: 'Interactive 3D',
    year: '2026',
    description:
      'An open-world interactive 3D driving portfolio featuring a custom hypercar with Rapier3D physics, suspension dynamics, neon open-world architecture, and interactive district hubs.',
    technology: ['Three.js', 'React', 'React Three Fiber', 'Rapier3D', 'Zustand', 'GSAP'],
    image: PROJECT_THUMBNAILS.portfolio3d,
    githubUrl: '', // Configurable: add your GitHub repository URL here
    liveUrl: '',   // Configurable: add your live demo URL here
    accent: '#3b82f6',
  },
];

// Editable Experience, Education & Milestones Timeline
export const EXPERIENCE_DATA = [
  {
    id: 'milestone-3d-portfolio',
    type: 'Milestone',
    period: '2026',
    title: 'Built Interactive 3D Developer Portfolio Universe',
    organization: 'Personal Engineering Initiative',
    description:
      'Designed and built an original open-world 3D driving portfolio combining procedural Three.js supercar modeling, Rapier physics, third-person camera controls, and modular React HUDs.',
    tags: 'Three.js · React Three Fiber · Rapier3D · GSAP',
  },
  {
    id: 'exp-app-dev',
    type: 'Experience',
    period: '2025 — Present',
    title: 'Web & Mobile Application Builder',
    organization: 'Independent Projects & Practice',
    description:
      'Built practical full-flow applications including a Class Attendance App and Gym Management System with structured UI components, Firebase synchronization, and responsive layouts.',
    tags: 'React · React Native · Firebase · JavaScript',
  },
  {
    id: 'edu-foundation',
    type: 'Education',
    period: '2023 — Present',
    title: 'Computer Science & Software Development Studies',
    organization: 'Academic & Self-Directed Learning',
    description:
      'Building strong foundations in programming, data structures, web engineering, version control with Git & GitHub, and modern frontend/3D graphics ecosystems.',
    tags: 'HTML · CSS · JavaScript · Git & GitHub',
  },
  {
    id: 'milestone-first-apps',
    type: 'Milestone',
    period: '2024',
    title: 'Transitioned into Component & Mobile Architecture',
    organization: 'Project-Based Learning',
    description:
      'Moved from static web pages to interactive component state management with React and cross-platform mobile development with React Native.',
    tags: 'React · React Native · State Management',
  },
];

// Editable Achievements Data covering all 4 requested groups
export const ACHIEVEMENTS_DATA = {
  completedProjects: [
    {
      title: '3D Portfolio Website',
      detail: 'Interactive open-world 3D racing portfolio with 6 explorable locations and full vehicle physics.',
      status: 'Shipped',
    },
    {
      title: 'Class Attendance App',
      detail: 'Mobile-first student attendance tracking and real-time record sync workflow.',
      status: 'Completed',
    },
    {
      title: 'Gym Management System',
      detail: 'Member records, plan renewals, and attendance dashboard for fitness center management.',
      status: 'Completed',
    },
  ],
  technologiesLearned: [
    'JavaScript (ES6+)',
    'React',
    'React Native',
    'Three.js & R3F',
    'Rapier3D Physics',
    'Firebase',
    'HTML5 & CSS3',
    'Git & GitHub',
  ],
  milestones: [
    {
      title: 'Real-Time 3D Vehicle Physics Integration',
      year: '2026',
      detail: 'Implemented acceleration, braking, reverse, jumping, boost particles, and raycast ground detection.',
    },
    {
      title: 'Cross-Platform Mobile & Web Delivery',
      year: '2025',
      detail: 'Built reusable UI systems running smoothly across desktop, tablet, and Android mobile viewports.',
    },
    {
      title: 'Cloud Database & Auth Workflows',
      year: '2025',
      detail: 'Integrated Firebase storage and structured state updates for multi-screen applications.',
    },
  ],
  certifications: [
    {
      title: 'Modern JavaScript & Frontend Development',
      issuer: 'Self-Paced / Editable Credential Slot',
      year: '2025',
      note: 'Editable in src/data/portfolioData.js',
    },
    {
      title: 'Interactive WebGL & Three.js Foundations',
      issuer: 'Project Mastery / Editable Credential Slot',
      year: '2026',
      note: 'Editable in src/data/portfolioData.js',
    },
  ],
};

// Editable Contact Configuration — do not invent URLs; leave unconfigured links blank until set
export const CONTACT_DATA = {
  name: 'Aniket',
  role: 'Aspiring Software Developer',
  email: 'aniketmurari66@gmail.com',
  githubUrl: '',   // Configurable: e.g. 'https://github.com/your-username'
  githubLabel: 'GitHub Profile (Configurable)',
  linkedinUrl: '', // Configurable: e.g. 'https://linkedin.com/in/your-handle'
  linkedinLabel: 'LinkedIn Profile (Configurable)',
  availability: 'Open to Software Developer, Frontend & Interactive 3D Opportunities',
};
