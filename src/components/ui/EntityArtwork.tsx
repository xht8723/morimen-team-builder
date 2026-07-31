import clsx from "clsx";
import { useTranslation } from "react-i18next";

import type { GameEntity } from "@/domain/types";

interface EntityArtworkProps {
  entity?: GameEntity;
  className?: string;
  size?: "small" | "medium" | "large";
  source?: "thumb" | "full";
}

export function EntityArtwork({
  entity,
  className,
  size = "medium",
  source = "thumb",
}: EntityArtworkProps) {
  if (!entity) {
    return (
      <span
        aria-hidden="true"
        className={clsx(
          "entity-artwork entity-artwork--empty",
          `entity-artwork--${size}`,
          className,
        )}
      >
        +
      </span>
    );
  }

  return (
    <span
      className={clsx(
        "entity-artwork",
        `entity-artwork--${size}`,
        `entity-artwork--${source}`,
        className,
      )}
    >
      <img
        src={entity.assets[source]}
        alt=""
        loading="lazy"
        width={source === "full" ? 480 : 96}
        height={source === "full" ? 720 : 96}
      />
    </span>
  );
}

interface RealmBadgeProps {
  realm: string;
  iconOnly?: boolean;
}

export function RealmBadge({ realm, iconOnly = false }: RealmBadgeProps) {
  const { t } = useTranslation();
  const normalized = realm.toLowerCase();
  const hasIcon = ["aequor", "caro", "chaos", "ultra"].includes(normalized);
  const fallbackLabel = realm
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  const label = t(`enums.${realm}`, { defaultValue: fallbackLabel });
  const showIconOnly = hasIcon && iconOnly;
  const displayLabel = iconOnly && normalized === "faded_legacy" ? "FL" : label;

  return (
    <span
      aria-label={iconOnly ? label : undefined}
      className={clsx(
        "realm-badge",
        `realm-badge--${normalized}`,
        !hasIcon && "realm-badge--text-only",
        showIconOnly && "realm-badge--icon-only",
      )}
    >
      {hasIcon && (
        <img
          src={`./generated-assets/ui/realm-icon-${normalized}.png`}
          alt=""
          width="22"
          height="22"
        />
      )}
      {!showIconOnly && <span>{displayLabel}</span>}
    </span>
  );
}
