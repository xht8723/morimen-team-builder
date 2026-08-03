import { Check, CircleAlert, Clipboard } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { EntityArtwork, RealmBadge } from "@/components/ui/EntityArtwork";
import { awakenersById, covenantsById, possesById, wheelsById } from "@/data-access/catalog";
import { resolveRecommendedText } from "@/data-access/recommended-teams";
import { resolveEntityText } from "@/data-access/entity-localization";
import { getTeamRealms } from "@/domain/team-rules";
import type { ResolvedRecommendedTeam } from "@/domain/types";

import { RecommendedSummary } from "./RecommendedSummary";

interface RecommendedTeamCardProps {
  recommendation: ResolvedRecommendedTeam;
}

type CopyState = "idle" | "copied" | "error";

export function RecommendedTeamCard({ recommendation }: RecommendedTeamCardProps) {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage ?? i18n.language;
  const headingId = useId();
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const copyResetTimer = useRef<number | null>(null);
  const { team } = recommendation;
  const realms = getTeamRealms(team);
  const posse = possesById.get(team.posseId ?? "");
  const posseText = posse ? resolveEntityText(posse, language) : undefined;

  useEffect(
    () => () => {
      if (copyResetTimer.current !== null) window.clearTimeout(copyResetTimer.current);
    },
    [],
  );

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(recommendation.code);
      setCopyState("copied");
      if (copyResetTimer.current !== null) window.clearTimeout(copyResetTimer.current);
      copyResetTimer.current = window.setTimeout(() => setCopyState("idle"), 1600);
    } catch {
      setCopyState("error");
    }
  }

  return (
    <article className="recommended-card" aria-labelledby={headingId}>
      <header className="recommended-card__header">
        <div className="recommended-card__heading">
          <h3 id={headingId}>{resolveRecommendedText(recommendation.name, language)}</h3>
          <RecommendedSummary markdown={resolveRecommendedText(recommendation.summary, language)} />
          <div className="recommended-card__realms">
            {realms.map((realm) => (
              <RealmBadge key={realm} realm={realm} />
            ))}
          </div>
        </div>
        <div className="recommended-card__copy-area">
          <button
            type="button"
            className="button recommended-card__copy"
            onClick={() => void copyCode()}
          >
            {copyState === "copied" ? <Check size={14} /> : <Clipboard size={14} />}
            {copyState === "copied" ? t("recommended.copied") : t("recommended.copy")}
          </button>
          <span
            className="recommended-card__copy-status"
            role="status"
            aria-live="polite"
            data-error={copyState === "error"}
          >
            {copyState === "error" && (
              <>
                <CircleAlert size={13} />
                {t("recommended.copyFailed")}
              </>
            )}
          </span>
        </div>
      </header>

      <div className="recommended-card__loadouts">
        {team.slots.map((slot, slotIndex) => {
          const awakener = awakenersById.get(slot.awakenerId ?? "");
          const awakenerText = awakener ? resolveEntityText(awakener, language) : undefined;
          const covenant = covenantsById.get(slot.covenantId ?? "");
          const covenantText = covenant ? resolveEntityText(covenant, language) : undefined;
          const wheels = slot.wheelIds.map((wheelId) => wheelsById.get(wheelId ?? ""));
          return (
            <section
              className="recommended-loadout"
              data-realm={awakener?.realm.toLowerCase()}
              key={`${recommendation.id}-${slot.awakenerId ?? String(slotIndex)}`}
              aria-label={t("recommended.slotLabel", { number: slotIndex + 1 })}
            >
              <div className="recommended-loadout__awakener">
                <EntityArtwork entity={awakener} size="large" source="full" />
                <span className="recommended-loadout__slot">
                  {String(slotIndex + 1).padStart(2, "0")}
                </span>
                <div>
                  <strong>{awakenerText?.name}</strong>
                  {awakener && <RealmBadge realm={awakener.realm} iconOnly />}
                </div>
              </div>

              <div className="recommended-loadout__equipment">
                {wheels.map((wheel, wheelIndex) => {
                  const text = wheel ? resolveEntityText(wheel, language) : undefined;
                  return (
                    <div
                      className="recommended-equipment"
                      key={`${slot.awakenerId ?? String(slotIndex)}-wheel-${String(wheelIndex)}`}
                    >
                      <EntityArtwork entity={wheel} size="small" />
                      <span>
                        <small>{t("builder.wheelNumber", { number: wheelIndex + 1 })}</small>
                        <strong title={text?.name}>{text?.name}</strong>
                      </span>
                    </div>
                  );
                })}
                <div className="recommended-equipment recommended-equipment--covenant">
                  <EntityArtwork entity={covenant} size="small" />
                  <span>
                    <small>{t("recommended.covenant")}</small>
                    <strong title={covenantText?.name}>{covenantText?.name}</strong>
                  </span>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <div className="recommended-card__posse">
        <EntityArtwork entity={posse} size="medium" />
        <span>
          <small>{t("recommended.posse")}</small>
          <strong>{posseText?.name}</strong>
        </span>
      </div>
    </article>
  );
}
