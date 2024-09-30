
export function parse(lines, { tag = "" }) {
    const ret = []
    for (const block of collectCodeBlocks(lines)) {
        if (block.tag === tag) {
            ret.push(block.lines);
        }
    }
    return ret;
}

/**
* Collects code blocks from an array of lines.
*
* @param {string[]} lines - An array of strings representing lines of text.
* @returns {Object[]} An array of objects, each containing a code block and its associated tag.
* @returns {string[]} return[].lines - The lines of the code block.
* @returns {string} return[].tag - The tag associated with the code block.
*/
export function collectCodeBlocks(lines) {
    const ret = [];

    let tag = "";
    let buf = [];
    let reading = false

    for (const line of lines) {
        if (line.startsWith("```")) {
            if (reading) {
                reading = false;
            } else {
                if (buf.length > 0) {
                    ret.push({ lines: buf, tag: tag });
                    buf = [];
                }
                reading = true;
                tag = line.substring(3).trim();
            }
        } else if (reading) {
            buf.push(line);
        }
    }

    if (buf.length > 0) {
        ret.push({ lines: buf, tag: tag });
    }
    return ret
}
