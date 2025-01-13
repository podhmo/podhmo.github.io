import { simplifyURL } from "./simplify.mjs";
import { assertEquals } from "jsr:@std/assert@1/equals";

Deno.test("simplifyURL, normal", () => {
    const url = "https://example.com";
    const got = simplifyURL(url);
    const want = url;
    assertEquals(got, want);
});

Deno.test("simplifyURL, amazon", () => {
    const url =
        "https://www.amazon.co.jp/TiMOVO-%E3%82%B9%E3%82%BF%E3%83%B3%E3%83%89%E3%82%B1%E3%83%BC%E3%82%B9-%E3%82%BF%E3%83%96%E3%83%AC%E3%83%83%E3%83%88%E4%BF%9D%E8%AD%B7%E3%82%B1%E3%83%BC%E3%82%B9-%E3%82%AA%E3%83%BC%E3%83%88%E3%82%B9%E3%83%AA%E3%83%BC%E3%83%97%E6%A9%9F%E8%83%BD-PU%E3%83%AC%E3%83%BC%E3%82%B6%E3%83%BC/dp/B0C65JPG5X/ref=pd_rhf_ee_s_pd_sbs_rvi_d_sccl_2_1/358-1441746-2129522?pd_rd_w=wPTwT&content-id=amzn1.sym.40b6f6bc-3d2b-4fce-9b50-1c62529d2e48&pf_rd_p=40b6f6bc-3d2b-4fce-9b50-1c62529d2e48&pf_rd_r=SPF1E24QWPMHQPQNBP08&pd_rd_wg=saLmh&pd_rd_r=0eb302a3-c548-4002-94f5-51e5368bc762&pd_rd_i=B0C65JPG5X&psc=1";
    const want = "https://www.amazon.co.jp/dp/B0C65JPG5X";
    const got = simplifyURL(url);
    assertEquals(got, want);
});
