import { Check, Clipboard, Download, Eraser, PencilLine } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { EntityArtwork, RealmBadge } from "@/components/ui/EntityArtwork";
import { possesById } from "@/data-access/catalog";
import { resolveEntityText } from "@/data-access/entity-localization";
import { encodeTeam } from "@/domain/share-code";
import { getTeamRealms } from "@/domain/team-rules";
import { SLOT_INDICES, type PickerTarget, type Team } from "@/domain/types";

import { GameLoadoutCard } from "./GameLoadoutCard";
import { formatCodecFailure } from "./codec-message";

interface TeamBoardProps {
  team: Team;
  teamNumber: number;
  transitionPhase?: "idle" | "in";
  onTransitionComplete?: () => void;
  onOpenPicker: (target: PickerTarget) => void;
  onRename: (name: string) => void;
  onClearTeam: () => void;
  onImport: () => void;
  onNotify: (message: string) => void;
}

export function TeamBoard({
  team,
  teamNumber,
  transitionPhase = "idle",
  onTransitionComplete,
  onOpenPicker,
  onRename,
  onClearTeam,
  onImport,
  onNotify,
}: TeamBoardProps) {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage ?? i18n.language;
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(team.name);
  const [copied, setCopied] = useState(false);
  const copyResetTimer = useRef<number | null>(null);
  const encoded = encodeTeam(team);
  const encodedError = encoded.ok ? null : formatCodecFailure(encoded, language, t);
  const realms = getTeamRealms(team);
  const posse = team.posseId ? possesById.get(team.posseId) : undefined;
  const posseText = posse ? resolveEntityText(posse, language) : undefined;

  useEffect(
    () => () => {
      if (copyResetTimer.current !== null) window.clearTimeout(copyResetTimer.current);
    },
    [],
  );

  async function copyCode() {
    if (!encoded.ok) {
      onNotify(encodedError ?? t("toast.invalid"));
      return;
    }
    try {
      await navigator.clipboard.writeText(encoded.code);
      setCopied(true);
      onNotify(t("builder.copiedToast"));
      if (copyResetTimer.current !== null) window.clearTimeout(copyResetTimer.current);
      copyResetTimer.current = window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
      onNotify(t("toast.copyFailed"));
    }
  }

  return (
    <main
      className="team-board"
      data-team-transition={transitionPhase}
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget) {
          onTransitionComplete?.();
        }
      }}
    >
      <header className="team-board__header">
        <div>
          <span className="team-board__kicker">
            {t("builder.activeFormation", {
              number: String(teamNumber).padStart(2, "0"),
            })}
          </span>
          <div className="team-board__title-row">
            {renaming ? (
              <input
                className="team-name-input"
                value={draftName}
                autoFocus
                aria-label={t("builder.teamName")}
                onChange={(event) => setDraftName(event.target.value)}
                onBlur={(event) => {
                  if (event.currentTarget.dataset.cancelled !== "true") onRename(draftName);
                  setRenaming(false);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur();
                  if (event.key === "Escape") {
                    event.preventDefault();
                    event.currentTarget.dataset.cancelled = "true";
                    setDraftName(team.name);
                    setRenaming(false);
                  }
                }}
              />
            ) : (
              <h2 title={team.name}>{team.name}</h2>
            )}
            <button
              type="button"
              className="icon-button"
              aria-label={t("builder.rename")}
              onClick={() => {
                setDraftName(team.name);
                setRenaming(true);
              }}
            >
              <PencilLine size={16} />
            </button>
          </div>
          <div className="team-board__realms">
            {realms.length > 0 ? (
              realms.map((realm) => <RealmBadge key={realm} realm={realm} />)
            ) : (
              <span className="muted-label">{t("builder.chooseRealms")}</span>
            )}
            <span className="realm-count">{t("builder.realmCount", { count: realms.length })}</span>
          </div>
        </div>
        <div className="team-board__actions">
          <button type="button" className="button" onClick={onImport}>
            <Download size={16} />
            {t("builder.import")}
          </button>
          <button
            type="button"
            className="button"
            onClick={onClearTeam}
            aria-label={t("builder.clearNamed", { name: team.name })}
          >
            <Eraser size={16} />
            {t("builder.clear")}
          </button>
          <button
            type="button"
            className="button button--primary"
            disabled={!encoded.ok}
            title={encoded.ok ? t("builder.copyReady") : (encodedError ?? undefined)}
            onClick={() => void copyCode()}
          >
            {copied ? <Check size={17} /> : <Clipboard size={17} />}
            {copied ? t("builder.copied") : t("builder.copy")}
          </button>
        </div>
      </header>

      {encodedError && <div className="inline-alert">{encodedError}</div>}

      <section className="loadout-grid" aria-label={t("builder.loadouts")}>
        {SLOT_INDICES.map((slotIndex) => (
          <GameLoadoutCard
            key={`${team.id}-slot-${String(slotIndex)}`}
            teamId={team.id}
            slot={team.slots[slotIndex]}
            slotIndex={slotIndex}
            onOpenPicker={onOpenPicker}
          />
        ))}
      </section>

      <button
        type="button"
        className="posse-slot"
        data-empty={!team.posseId}
        aria-label={t("builder.posseSlotLabel", {
          name: posseText?.name ?? t("builder.empty"),
        })}
        onClick={() => onOpenPicker({ kind: "posse", teamId: team.id })}
      >
        {posse && (
          <EntityArtwork
            entity={posse}
            className="posse-slot__backdrop"
            size="large"
            source="full"
          />
        )}
        <span className="slot-label">{t("builder.teamPosse")}</span>
        <EntityArtwork entity={posse} className="posse-slot__icon" size="large" />
        <span className="posse-slot__content">
          <strong>{posseText?.name ?? t("builder.choosePosse")}</strong>
          <span>{posseText?.description ?? t("builder.posseHint")}</span>
        </span>
      </button>
    </main>
  );
}
