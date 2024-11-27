import { parseArgs } from "jsr:@podhmo/with-help@0.5.0"

const args = parseArgs(Deno.args, {
  string: ["baseurl"],
  boolean: ["debug"],
  default: {
    baseurl: ""
  }
});

console.log(`<!DOCTYPE html>`)
console.log(`<html lang="ja">`)
console.log(`<head><meta charset="utf-8"><meta name="viewport" content="with=device-width, initial-scale=1.0"></head>`)
console.log(`<ul>`)
for (const filename of args._) {
  console.log(`<li><a href="${args.baseurl}${filename}">${filename}</a></li>`)
}
console.log(`</ul>`)
console.log(`</html>`)