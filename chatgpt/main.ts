// deno から利用

import { TextLineStream } from "jsr:@std/streams@0.223.0/text-line-stream";
import { collectCodeBlocks } from "./_parse.js";

const filename = Deno.args[0];
using file = await Deno.open(filename, { read: true });

const lines = [];
const readable = file.readable
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new TextLineStream())
    ;
for await (const line of readable) {
    lines.push(line);
}

const candidates = collectCodeBlocks(lines, { tag: "" });
console.log(candidates);

