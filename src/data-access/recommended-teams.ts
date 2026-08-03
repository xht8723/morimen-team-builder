import rawRecommendedTeams from "@/generated/recommended-teams.json";

import { decodeTeam } from "@/domain/share-code";
import type {
  LocalizedText,
  RecommendedTeamsCatalog,
  ResolvedRecommendedTeam,
} from "@/domain/types";
import { normalizeAppLanguage } from "@/i18n";

export const recommendedTeamsCatalog = rawRecommendedTeams as RecommendedTeamsCatalog;
const TEAM_CODE_PATTERN = /^@@[A-Za-z0-9]+@@$/u;

export function resolveRecommendedText(
  text: LocalizedText,
  language: string | null | undefined,
): string {
  return text[normalizeAppLanguage(language) ?? "en"];
}

export function resolveRecommendedTeams(
  catalog: RecommendedTeamsCatalog = recommendedTeamsCatalog,
): ResolvedRecommendedTeam[] {
  return catalog.teams.flatMap((recommendation) => {
    if (!TEAM_CODE_PATTERN.test(recommendation.code)) return [];
    const decoded = decodeTeam(recommendation.code);
    if (!decoded.ok) return [];

    return [
      {
        ...recommendation,
        team: {
          ...decoded.team,
          id: `recommended-${recommendation.id}`,
          name: recommendation.name.en,
        },
      },
    ];
  });
}

export const recommendedTeams = resolveRecommendedTeams();
