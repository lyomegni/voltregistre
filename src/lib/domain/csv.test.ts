import { describe, expect, it } from "vitest";
import { parseCsv } from "./csv";

describe("parseCsv", () => {
  it("lit le format Excel français", () => {
    expect(parseCsv("﻿Repère;Catégorie\r\nTGBT-01;TGBT\r\n")).toEqual([
      ["Repère", "Catégorie"],
      ["TGBT-01", "TGBT"],
    ]);
  });
  it("gère les virgules et les guillemets", () => {
    expect(parseCsv('a,b\n"x, y","il dit ""ok"""')).toEqual([
      ["a", "b"],
      ["x, y", 'il dit "ok"'],
    ]);
  });
});
