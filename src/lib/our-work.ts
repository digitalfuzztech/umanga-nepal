import type { PublishedOurWorkItem } from "@/server/our-work";

export type PublicOurWorkItem = PublishedOurWorkItem;

export function getOurWorkMetrics(program: PublicOurWorkItem) {
  const metrics: {
    id: string;
    value: number;
    label: string | null;
    note: string | null;
  }[] = [];
  if (program.awarenessSessionCount !== null) {
    metrics.push({
      id: "sessions",
      value: program.awarenessSessionCount,
      label: program.awarenessSessionLabel,
      note: program.awarenessSessionNote,
    });
  }
  if (program.participantCount !== null) {
    metrics.push({
      id: "participants",
      value: program.participantCount,
      label: program.participantLabel,
      note: program.participantNote,
    });
  }
  return metrics;
}

export function getFeaturedOurWorkItem(programs: PublicOurWorkItem[]) {
  // Preserve the former third-program fallback using only published CMS data.
  return (
    programs.find((program) => program.featured) ?? programs[2] ?? programs[0]
  );
}
