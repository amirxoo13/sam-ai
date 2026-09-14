import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

/**
 * رگرسیون‌تست سرریز افقی.
 *
 * متن پیکره گاهی توکن بلندِ بدون فاصله دارد — نمونهٔ واقعی از production:
 * `<4D6963726F736F667420576F7264202D20E3CCE3E6DAE520DEE6C7E4EDE4>`
 * (عنوان خرابِ یک فایل Word). چنین رشته‌ای هیچ نقطهٔ شکست طبیعی ندارد؛
 * `whitespace-pre-wrap` به‌تنهایی آن را نمی‌شکند، پس کانتینر از عرض صفحه
 * پهن‌تر می‌شود و کل صفحه روی موبایل افقی اسکرول می‌خورد.
 */

const root = join(import.meta.dirname, "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

/** نمونهٔ واقعی از پاسخ production. */
const UNBREAKABLE = "<4D6963726F736F667420576F7264202D20E3CCE3E6DAE520DEE6C7E4EDE4>";

describe("horizontal overflow guards", () => {
  it("the sample corpus title really has no natural break opportunity", () => {
    assert.ok(!/[\s\u200c-]/.test(UNBREAKABLE));
    assert.ok(UNBREAKABLE.length > 50);
  });

  it("styles.css sets overflow-wrap so such a token can break", () => {
    const css = read("src/styles.css");
    assert.match(css, /overflow-wrap:\s*anywhere/);
  });

  it("styles.css stops any child from dragging the root sideways", () => {
    const css = read("src/styles.css");
    assert.match(css, /overflow-x:\s*clip/);
  });

  it("every whitespace-pre-wrap container also opts into break-words", () => {
    for (const file of ["src/routes/ask.tsx", "src/routes/forms.tsx"]) {
      const src = read(file);
      for (const line of src.split("\n")) {
        if (line.includes("whitespace-pre-wrap")) {
          assert.ok(
            line.includes("break-words"),
            `${file}: whitespace-pre-wrap without break-words -> ${line.trim()}`,
          );
        }
      }
    }
  });

  it("the residency answer bubble opts into break-words", () => {
    const src = read("src/routes/residency.tsx");
    assert.match(src, /self-start break-words rounded-\[16px/);
  });

  it("flex-1 filter pills carry min-w-0 so a long label cannot widen the row", () => {
    const src = read("src/routes/ask.tsx");
    const filterBar = src.slice(src.indexOf("function FilterBar"));
    assert.ok(filterBar.includes("min-w-0"), "FilterBar buttons need min-w-0");
  });

  it("the matter select carries min-w-0 so a long case title cannot widen the bar", () => {
    const src = read("src/routes/ask.tsx");
    const matterBar = src.slice(src.indexOf("function MatterBar"), src.indexOf("function EmptyState"));
    assert.ok(matterBar.includes("min-w-0"), "matter select needs min-w-0");
  });

  it("the residency grid uses minmax(0,...) so its columns can shrink", () => {
    const src = read("src/routes/residency.tsx");
    assert.ok(
      !src.includes("md:grid-cols-[280px_1fr]"),
      "fixed 280px column cannot shrink below its content",
    );
    assert.match(src, /minmax\(0,\s*1fr\)/);
  });
});
