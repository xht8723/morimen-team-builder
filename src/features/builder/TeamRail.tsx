import { CircleAlert, RotateCcw } from "lucide-react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import { awakenersById, possesById, wheelsById } from "@/data-access/catalog";
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
          const awakeners = team.slots.map((slot) =>
            slot.awakenerId ? awakenersById.get(slot.awakenerId) : undefined,
          );
          const awakenerNames = awakeners.map((awakener) =>
            awakener ? resolveEntityText(awakener, language).name : t("builder.empty"),
          );
          const wheelGroups = team.slots.map((slot) =>
            slot.wheelIds.map((wheelId) => (wheelId ? wheelsById.get(wheelId) : undefined)),
          );
          const wheelNames = wheelGroups.flatMap((wheels) =>
            wheels.map((wheel) =>
              wheel ? resolveEntityText(wheel, language).name : t("builder.empty"),
            ),
          );
          const posseName = posseText?.name ?? t("builder.noPosse");
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
              <span className="team-rail-card__header">
                <span className="team-rail-card__number">{String(index + 1).padStart(2, "0")}</span>
                <strong className="team-rail-card__name" title={team.name}>
                  {team.name}
                </strong>
                <span className="team-rail-card__realms">
                  {realms.length > 0
                    ? realms.map((realm) => <RealmBadge key={realm} realm={realm} iconOnly />)
                    : null}
                </span>
                <span className="team-rail-card__posse" title={posseName} aria-hidden="true">
                  <EntityArtwork entity={posse} size="small" />
                </span>
                {!code.ok && (
                  <span
                    className="team-rail-card__warning"
                    title={t("builder.tokenMissing")}
                    aria-hidden="true"
                  >
                    <CircleAlert size={14} />
                  </span>
                )}
              </span>

              <span className="team-rail-card__awakeners" aria-hidden="true">
                {awakeners.map((awakener, slotIndex) => {
                  const name = awakenerNames[slotIndex];
                  return (
                    <span
                      className="team-rail-card__awakener"
                      key={`${team.id}-awakener-${String(slotIndex)}`}
                      title={`${t("builder.awakener")} ${String(slotIndex + 1)}: ${name}`}
                    >
                      <EntityArtwork entity={awakener} size="small" />
                    </span>
                  );
                })}
              </span>

              <span className="team-rail-card__wheels" aria-hidden="true">
                {wheelGroups.map((wheels, slotIndex) => (
                  <span
                    className="team-rail-card__wheel-pair"
                    key={`${team.id}-wheels-${String(slotIndex)}`}
                  >
                    {wheels.map((wheel, wheelIndex) => {
                      const wheelName = wheelNames[slotIndex * 2 + wheelIndex];
                      return (
                        <span
                          className="team-rail-card__wheel"
                          key={`${team.id}-${String(slotIndex)}-wheel-${String(wheelIndex)}`}
                          title={`${t("builder.wheelNumber", { number: wheelIndex + 1 })}: ${wheelName}`}
                        >
                          <EntityArtwork entity={wheel} size="small" />
                        </span>
                      );
                    })}
                  </span>
                ))}
              </span>

              <span className="sr-only">
                {t("builder.railAwakeners", { names: awakenerNames.join(", ") })}{" "}
                {t("builder.railWheels", { names: wheelNames.join(", ") })}{" "}
                {t("builder.railPosse", { name: posseName })}
                {!code.ok ? ` ${t("builder.tokenMissing")}` : ""}
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
