import {
  GrammarQaController,
  GrammarQaDto,
  SearchQueryDto,
} from "./grammar-qa.controller";
import { GrammarQaService } from "./grammar-qa.service";

describe("GrammarQaController", () => {
  // Chỉ cần nạp file: DTO khai báo sau controller làm import ném ReferenceError (decorator metadata)
  // → test này đỏ thay vì gateway chết lúc khởi động trong Docker.
  it("nạp được controller và DTO", () => {
    expect(GrammarQaController).toBeDefined();
    expect(new GrammarQaDto()).toBeInstanceOf(GrammarQaDto);
    expect(new SearchQueryDto()).toBeInstanceOf(SearchQueryDto);
  });

  it("search không trả nội dung nguồn đầy đủ (chỉ metadata)", async () => {
    const qa = {
      search: jest.fn().mockResolvedValue({
        sources: [
          {
            grammarId: 1,
            pattern: "V たい",
            meaning: "muốn",
            jlptLevel: "N5",
            lessonId: 1,
            lessonNumber: 1,
            score: 0.8,
            text: "nội dung dài",
          },
        ],
        embedMs: 5,
        searchMs: 1,
      }),
    } as unknown as GrammarQaService;
    const out = await new GrammarQaController(qa).search({ q: "muốn" });
    expect(out.sources[0]).not.toHaveProperty("text");
    expect(out.timingsMs).toEqual({ embed: 5, search: 1 });
  });
});
