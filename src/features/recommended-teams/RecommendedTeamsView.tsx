import { useTranslation } from "react-i18next";

import { recommendedTeams } from "@/data-access/recommended-teams";
import type { ResolvedRecommendedTeam } from "@/domain/types";

import { RecommendedTeamCard } from "./RecommendedTeamCard";

interface RecommendedTeamsViewProps {
  teams?: ResolvedRecommendedTeam[];
}

export function RecommendedTeamsView({ teams = recommendedTeams }: RecommendedTeamsViewProps) {
  const { t } = useTranslation();

  return (
    <main className="recommended-page">
      <header className="recommended-page__header">
        <h2>{t("recommended.title")}</h2>
      </header>

      {teams.length > 0 ? (
        <div className="recommended-list">
          {teams.map((team) => (
            <RecommendedTeamCard key={team.id} recommendation={team} />
          ))}
        </div>
      ) : (
        <section className="recommended-empty">
          <h3>{t("recommended.emptyTitle")}</h3>
          <p>{t("recommended.emptyDescription")}</p>
        </section>
      )}
    </main>
  );
}
