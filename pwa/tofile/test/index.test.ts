import { describe, expect, it } from "vitest";
import worker from "../src/index";

// Worker 本体のスモークテスト。
// 実際の共有処理は public/sw.js (Service Worker) 側で行われ、
// Worker は静的アセットの配信とフォールバックの 404 だけを担う。
describe("tofile", () => {
  it("returns 404 Not Found", async () => {
    const res = await worker.fetch();
    expect(res.status).toBe(404);
    expect(await res.text()).toBe("Not Found");
  });
});
