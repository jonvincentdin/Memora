import { describe, expect, it } from "vitest";
import { buildMarkdownPdf } from "@/lib/pdf-export";

describe("lesson PDF export", () => {
  it("places visible text inside every generated page", () => {
    const lesson = Array.from(
      { length: 180 },
      (_, index) => `## Topic ${index + 1}\nLesson paragraph ${index + 1} with enough text to verify multi-page wrapping.`
    ).join("\n\n");
    const document = buildMarkdownPdf("Data Analytics Lesson", lesson);
    const pages = (document.internal as unknown as { pages: string[][] }).pages.slice(1);

    expect(pages.length).toBeGreaterThan(1);
    expect(pages[0].join("\n")).toContain("Memoria");
    expect(pages[0].join("\n")).toContain("Turn scattered notes into structured knowledge.");
    for (const page of pages) {
      const content = page.join("\n");
      expect(content).toContain(" Tj");

      const textPositions = [...content.matchAll(/(-?\d+(?:\.\d*)?) (-?\d+(?:\.\d*)?) Td/g)];
      expect(textPositions.length).toBeGreaterThan(0);
      for (const position of textPositions) {
        const x = Number(position[1]);
        const y = Number(position[2]);
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(596);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(842);
      }
    }
  });
});
