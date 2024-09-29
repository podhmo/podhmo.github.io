import { assertEquals } from "jsr:@std/assert";
import { TextLineStream } from "jsr:@std/streams@0.223.0/text-line-stream";

import { parse } from "./_parse.js";

async function loadTexts(filename: string) {
    using file = await Deno.open(filename, { read: true });

    const lines: string[] = [];
    const readable = file.readable
        .pipeThrough(new TextDecoderStream())
        .pipeThrough(new TextLineStream())
        ;
    for await (const line of readable) {
        lines.push(line);
    }
    return lines
}

Deno.test("parse", async () => {
    const filename = "./README.md";
    const lines = await loadTexts(filename);
    const got = parse(lines, { tag: "json" });


    const want = [`'messages': [
    { "role": "system", "content": "要約として適切な絵文字を自信度(0.0~1.0)と共に答えてください。10つ程候補をあげて下さい" },
    { "role": "user", "content": prompt }
],`.split("\n")];
    assertEquals(got, want);
})