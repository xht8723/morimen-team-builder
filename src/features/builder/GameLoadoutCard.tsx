import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import { EntityArtwork, RealmBadge } from "@/components/ui/EntityArtwork";
import { awakenersById, covenantsById, wheelsById } from "@/data-access/catalog";
import { resolveEntityText } from "@/data-access/entity-localization";
import type { LoadoutSlot, PickerTarget } from "@/domain/types";

interface GameLoadoutCardProps {
  teamId: string;
  slot: LoadoutSlot;
  slotIndex: number;
  onOpenPicker: (target: PickerTarget) => void;
}

export function GameLoadoutCard({ teamId, slot, slotIndex, onOpenPicker }: GameLoadoutCardProps) {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage ?? i18n.language;
  const awakener = slot.awakenerId ? awakenersById.get(slot.awakenerId) : undefined;
  const covenant = slot.covenantId ? covenantsById.get(slot.covenantId) : undefined;
  const awakenerText = awakener ? resolveEntityText(awakener, language) : undefined;
  const covenantText = covenant ? resolveEntityText(covenant, language) : undefined;
  const slotNumber = slotIndex + 1;

  return (
    <article
      className="loadout-card formation-card"
      data-realm={awakener?.realm.toLowerCase()}
      data-empty={!awakener}
    >
      <button
        type="button"
        className="awakener-slot formation-card__awakener"
        data-empty={!awakener}
        title={awakenerText?.name ?? t("builder.chooseAwakener")}
        aria-label={
          awakener
            ? t("builder.awakenerSlotLabel", {
                number: slotNumber,
                name: awakenerText?.name ?? awakener.name,
              })
            : t("builder.chooseAwakenerSlot", { number: slotNumber })
        }
        onClick={() => onOpenPicker({ kind: "awakener", teamId, slotIndex })}
      >
        <EntityArtwork
          entity={awakener}
          className="formation-card__portrait"
          size="large"
          source="full"
        />
        <span className="formation-card__art-lines" aria-hidden="true" />
        <span className="formation-card__topline">
          <span className="slot-index">{String(slotNumber).padStart(2, "0")}</span>
          {awakener && <RealmBadge realm={awakener.realm} />}
        </span>
        <span className="formation-card__name">
          <small>{t("builder.awakener")}</small>
          <strong>{awakenerText?.name ?? t("builder.chooseAwakener")}</strong>
        </span>
      </button>

      <button
        type="button"
        className="covenant-slot formation-card__covenant"
        data-empty={!covenant}
        data-tooltip={covenantText?.name ?? t("builder.chooseCovenant")}
        aria-label={
          covenant
            ? t("builder.covenantSlotLabel", {
                number: slotNumber,
                name: covenantText?.name ?? covenant.name,
              })
            : t("builder.chooseCovenantSlot", { number: slotNumber })
        }
        onClick={() => onOpenPicker({ kind: "covenant", teamId, slotIndex })}
      >
        <EntityArtwork entity={covenant} size="large" />
        {!covenant && <Plus className="formation-card__add-icon" size={18} aria-hidden="true" />}
        <span className="sr-only">{covenantText?.name ?? t("builder.chooseCovenant")}</span>
      </button>

      <div className="gear-row formation-card__wheels">
        {([0, 1] as const).map((wheelIndex) => {
          const wheelId = slot.wheelIds[wheelIndex];
          const wheel = wheelId ? wheelsById.get(wheelId) : undefined;
          const wheelText = wheel ? resolveEntityText(wheel, language) : undefined;
          return (
            <button
              type="button"
              className="gear-slot formation-card__wheel"
              data-empty={!wheel}
              key={`${teamId}-${String(slotIndex)}-wheel-${String(wheelIndex)}`}
              aria-label={
                wheel
                  ? t("builder.wheelSlotLabel", {
                      slot: slotNumber,
                      wheel: wheelIndex + 1,
                      name: wheelText?.name ?? wheel.name,
                    })
                  : t("builder.chooseWheelSlot", {
                      slot: slotNumber,
                      wheel: wheelIndex + 1,
                    })
              }
              title={wheelText?.name ?? t("builder.chooseWheel")}
              onClick={() =>
                onOpenPicker({
                  kind: "wheel",
                  teamId,
                  slotIndex,
                  wheelIndex,
                })
              }
            >
              <EntityArtwork
                entity={wheel}
                className="formation-card__wheel-art"
                size="large"
                source="full"
              />
              <span className="formation-card__wheel-name">
                <small>{t("builder.wheelNumber", { number: wheelIndex + 1 })}</small>
                <strong>{wheelText?.name ?? t("builder.add")}</strong>
              </span>
            </button>
          );
        })}
      </div>
    </article>
  );
}
