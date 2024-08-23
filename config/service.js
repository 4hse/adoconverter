const base = {
    adoc_params: {
        showTitle: true,
        showNumberedHeadings: true,
        showToc: true,
        safeMode: "unsafe",
        header_footer: true,
        doctype: "help-article",
        backend: "html5",
        mkdirs: true
    }
};

let local = {};

try {
    local = require("./service-local.js");
} catch (error) {
    console.warn("It's a good idea to set 'config/service-local.js'");
}

module.exports = Object.assign(base, local);
