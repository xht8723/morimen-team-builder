import { describe, expect, it } from "vitest";

import en from "./locales/en.json";
import zhCN from "./locales/zh-CN.json";
import { resolveAppLanguage } from "./index";

function translationKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    translationKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe("application languages", () => {
  it("keeps the Chinese and English catalogs structurally aligned", () => {
    expect(translationKeys(zhCN).sort()).toEqual(translationKeys(en).sort());
  });

  it("prefers a stored language and otherwise recognizes Chinese browser locales", () => {
    expect(resolveAppLanguage("en-US", ["zh-CN"])).toBe("en");
    expect(resolveAppLanguage(null, ["fr-CA", "zh-HK"])).toBe("zh-CN");
    expect(resolveAppLanguage(null, ["fr-CA"])).toBe("en");
  });

  it("uses the established Chinese main-stat terminology", () => {
    expect(zhCN.enums).toMatchObject({
      ALIEMUS_REGEN: "狂气回充",
      DEATH_RESISTANCE: "死亡抵抗",
      DMG_AMP: "伤害强效",
      KEYFLARE_REGEN: "银钥充能",
      SIGIL_YIELD: "黑印掉落",
    });

    const catalog = JSON.stringify(zhCN);
    for (const legacyTerm of ["异质回复", "死亡抗性", "伤害增幅", "钥焰回复", "印记产出"]) {
      expect(catalog).not.toContain(legacyTerm);
    }
  });

  it("uses the established Chinese entity terminology", () => {
    expect(zhCN.builder).toMatchObject({
      awakener: "唤醒体",
      covenant: "密契",
      wheelNumber: "命轮 {{number}}",
    });
    expect(zhCN.about.counts).toBe(
      "{{awakeners}} 名唤醒体 · {{wheels}} 个命轮 · {{covenants}} 件密契 · {{posses}} 个编队技能",
    );
    expect(zhCN.picker.realmLimitDetail).toContain("唤醒体");
  });
});
