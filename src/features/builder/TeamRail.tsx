import { CircleAlert, RotateCcw } from "lucide-react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import { awakenersById, possesById } from "@/data-access/catalog";
import { resolveEntityText } from "@/data-access/entity-localization";
import { encodeTeam } from "@/domain/share-code";
import { getTeamRealms } from "@/domain/team-rules";
import type { Team } from "@/domain/types";
import { EntityArtwork, RealmBadge } from "@/components/ui/EntityArtwork";

interface TeamRailProps {
  teams: Team[];
  activeTeamId: string;
  onSelect: (teamId: string) => void;
  onReset: () => void;
}

export function TeamRail({ teams, activeTeamId, onSelect, onReset }: TeamRailProps) {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage ?? i18n.language;
  const activeCardRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    activeCardRef.current?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [activeTeamId]);

  return (
    <aside className="team-rail" aria-label={t("builder.teamsLabel")}>
      <div className="team-rail__heading">
        <span>{t("builder.lineupSet")}</span>
        <div className="team-rail__heading-actions">
          <strong>{t("builder.teamCount")}</strong>
          <button
            type="button"
            className="button button--danger team-rail__reset"
            onClick={() => {
              if (window.confirm(t("builder.resetConfirm"))) onReset();
            }}
          >
            <RotateCcw size={13} />
            {t("builder.reset")}
          </button>
        </div>
      </div>
      <div className="team-rail__list">
        {teams.map((team, index) => {
          const code = encodeTeam(team);
          const realms = getTeamRealms(team);
          const posse = team.posseId ? possesById.get(team.posseId) : undefined;
          const posseText = posse ? resolveEntityText(posse, language) : undefined;
          return (
            <button
              type="button"
              key={team.id}
              ref={team.id === activeTeamId ? activeCardRef : undefined}
              className="team-rail-card"
              data-active={team.id === activeTeamId}
              onClick={() => onSelect(team.id)}
              aria-pressed={team.id === activeTeamId}
            >
              <span className="team-rail-card__number">{String(index + 1).padStart(2, "0")}</span>
              <span className="team-rail-card__copy">
                <strong title={team.name}>{team.name}</strong>
                <span>
                  {realms.length > 0
                    ? realms.map((realm) => <RealmBadge key={realm} realm={realm} />)
                    : t("builder.noRealm")}
                </span>
              </span>
              <span className="team-rail-card__portraits" aria-hidden="true">
                {team.slots.map((slot, slotIndex) => (
                  <EntityArtwork
                    key={`${team.id}-${String(slotIndex)}`}
                    entity={slot.awakenerId ? awakenersById.get(slot.awakenerId) : undefined}
                    size="small"
                  />
                ))}
              </span>
              <span className="team-rail-card__footer">
                <span
                  className="team-rail-card__posse"
                  title={posseText?.name ?? t("builder.noPosse")}
                >
                  <EntityArtwork entity={posse} size="small" />
                  {posseText?.name ?? t("builder.noPosse")}
                </span>
                {!code.ok && (
                  <span className="code-state">
                    <CircleAlert size={13} />
                    {t("builder.tokenMissing")}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
