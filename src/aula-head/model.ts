import { slides } from "./data";

export type DemoValue = string | number | boolean | number[];

export interface StudentBriefing {
  offer: string;
  audience: string;
  problem: string;
  solution: string;
  deliverables: string;
  nextStep: string;
}

export type SlideViewMode = "concept" | "practice" | "review";

export interface LabState {
  demo: Record<string, DemoValue>;
  checks: boolean[];
  projectIdea: string;
  conversionGoal: string;
  briefing: StudentBriefing;
  slideModes: Record<number, SlideViewMode>;
}

const STORAGE_KEY = "caramelo_aula_head_state_v2";

export const initialBriefing: StudentBriefing = {
  offer: "Consultoria e Direção Estratégica",
  audience: "Criadores, fundadores e profissionais autônomos",
  problem: "Muitas ideias dispersas e nenhuma presença digital marcante",
  solution: "Uma Landing Page imersiva com copy afiada e design autoral",
  deliverables: "Diagnóstico, wireframe, copy, Hero animada e publicação",
  nextStep: "Agendar uma sessão de alinhamento",
};

export const emptyLabState = (): LabState => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        demo: parsed.demo || {},
        checks: Array.isArray(parsed.checks) ? parsed.checks : Array(10).fill(false),
        projectIdea: typeof parsed.projectIdea === "string" ? parsed.projectIdea : "",
        conversionGoal: typeof parsed.conversionGoal === "string" ? parsed.conversionGoal : "contato",
        briefing: { ...initialBriefing, ...(parsed.briefing || {}) },
        slideModes: parsed.slideModes || {},
      };
    }
  } catch {
    // fallback if localStorage is disabled or throws
  }

  return {
    demo: {},
    checks: Array(10).fill(false),
    projectIdea: "",
    conversionGoal: "contato",
    briefing: initialBriefing,
    slideModes: {},
  };
};

export function persistLabState(state: LabState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage full or disabled
  }
}

export function hashSlide(): number {
  const match = location.hash.match(/^#slide-(\d+)$/);
  return match ? Math.min(slides.length - 1, Math.max(0, Number(match[1]) - 1)) : 0;
}
