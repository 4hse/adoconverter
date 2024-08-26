const adoc = require("asciidoctor")();
const path = require("path");
const config = require("./config/service");
const fs = require("fs");
const {glob} = require("glob");
const regexAdoc2Html = /href="([^"]*)\.adoc"/gm;

const yargs = require('yargs');

const argv = yargs(process.argv.slice(2))
    .usage('Usage: $0 <source-dir> <destination-dir> [options]')
    .command('source-dir destination-dir [options]')
    .options('css', {
        alias: 'c',
        type: 'string',
        description: 'a css file to include'
    })
    .options('silent', {
        alias: 's',
        type: 'boolean',
        description: 'Run silently'
    })
    .options('pattern', {
        alias: 'p',
        type: 'string',
        default: '/**/*.*',
        description: 'the pattern to use to search files into source-dir'
    })
    .options('ignore', {
        alias: 'i',
        type: 'string',
        description: 'a list of folder/files to ignore'
    })
    .options('test', {
        alias: 't',
        type: 'boolean',
        description: 'Execute tests'
    })
    .demandCommand(2, 'source-dir destination-dir are required')
    .parse();

if (argv.test) {
    test()
} else {
    const sourcePath = normalizePath(argv._[0]);
    const targetPath = normalizePath(argv._[1]);
    const targetCss = getTargetCss(targetPath, argv.css);

    if (fs.existsSync(sourcePath)) {
        let ignore = [];
        if (argv.ignore) {
            ignore = argv.ignore.split(',');
        }

        main(sourcePath, targetPath, targetCss, argv.silent, argv.pattern, ignore);
    } else {
        console.error("SOURCE_PATH is wrong: " + sourcePath);
    }
}

function getTargetCss(targetPath, css) {
    if (css) {
        return path.join(targetPath, css);
    } else {
        return null;
    }
}

//#################
//##  FUNCTIONS  ##
//#################

/**
 * main
 * @param {string} sourcePath
 * @param {string} targetPath
 * @param {string|null} targetCss
 * @param {boolean} silent
 * @param {string} pattern
 * @param {string[]} ignore
 */
async function main(sourcePath, targetPath, targetCss, silent = false, pattern, ignore) {

    const files = await glob(sourcePath + pattern, {'ignore' : ignore});

    for (let i = 0; i < files.length; i++) {
        const currentFile = files[i];
        const sourceFilename = path.basename(currentFile);
        const targetFilePath = getOutputPath(currentFile, sourcePath, targetPath);

        if (!silent) {
            console.log(
                "Running on -> " + currentFile,
            );
        }

        if (path.extname(sourceFilename) === ".adoc") {
            const targetFilePathHtml = targetFilePath.replace(/.adoc$/, ".html");
            adocToHtml(currentFile, targetFilePathHtml, targetCss);
        } else {
            copyFile(currentFile, targetFilePath);
        }
    }
}

/**
 * create the html from an adoc file
 * @param {string} sourceFile
 * @param {string} targetFile
 * @param {string|null} targetCss
 */
function adocToHtml(sourceFile, targetFile, targetCss) {
    const options = Object.assign({}, config.adoc_params);
    if (targetCss) {
        options.attributes = "linkcss stylesheet=" + getRelativeCssFile(targetFile, targetCss);
    }

    const sourceContent = fs.readFileSync(sourceFile);
    // noinspection JSUnresolvedFunction
    const rawHtml = adoc.convert(sourceContent.toString(), options);
    const html = rawHtml.replace(regexAdoc2Html, 'href="$1.html"')
    saveFile(html, targetFile);
}

/**
 * copy sourceFilePath into targetFilePath
 * @param {string} sourceFilePath
 * @param {string} targetFilePath
 */
function copyFile(sourceFilePath, targetFilePath) {
    fs.mkdirSync(path.dirname(targetFilePath), {
        recursive: true
    });
    fs.copyFileSync(sourceFilePath, targetFilePath);
}

/**
 * write output content into targetFilePath
 * @param {string} outputContent
 * @param {string} targetFilePath
 */
function saveFile(outputContent, targetFilePath) {
    fs.mkdirSync(path.dirname(targetFilePath), {
        recursive: true
    });
    fs.writeFileSync(targetFilePath, outputContent);
}

/**
 * compute target path based on source and base path
 * @param {string} sourcePath
 * @param {string} sourceBase
 * @param {string} targetBase
 * @return {string} the target path
 */
function getOutputPath(sourcePath, sourceBase, targetBase) {
    return sourcePath.replace(sourceBase, targetBase);
}

/**
 * return the relative path to the css file
 * @param {string} targetFile
 * @param {string} cssFile
 * @return {string}
 */
function getRelativeCssFile(targetFile, cssFile) {
    return path.join(path.relative(path.dirname(targetFile), path.dirname(cssFile)),path.basename(cssFile));
}

/**
 * normalize path and change \ to /
 * @param {string} inputPath
 * @return {string}
 */
function normalizePath(inputPath) {
    return path.normalize(inputPath).replace(/\\/g, '/');
}

function test() {

    test_GetOutputPath1();
    test_GetOutputPath2();
    test_GetOutputPath3();

    adocToHtml('./test/adoc-manual/it-IT/adoc/aggiungere_documenti.adoc', './test/html-manual/it-IT/adoc/aggiungere_documenti.html', './test/html-manual/css/style.css');
    adocToHtml('test/adoc-manual/it-IT/adoc/aggiungere_documenti.adoc', 'test/html-manual/it-IT/adoc/aggiungere_documenti.html', 'test/html-manual/css/style.css');

    console.log('done!');
}

function test_GetOutputPath1() {
    testGetOutputPath(
        '.\\test\\adoc-manual\\it-IT\\adoc\\test_1.adoc',
        '.\\test\\adoc-manual',
        '.\\test\\html-manual',
        '.\\test\\html-manual\\it-IT\\adoc\\test_1.adoc'
    );
}

function test_GetOutputPath2() {

    testGetOutputPath(
        'test\\adoc-manual\\it-IT\\adoc\\test_1.adoc',
        'test\\adoc-manual',
        'test\\html-manual',
        'test\\html-manual\\it-IT\\adoc\\test_1.adoc'
    )
}

function test_GetOutputPath3() {
    let sourcePath = 'test\\adoc-manual\\it-IT\\adoc\\test_1.adoc';
    let sourceBase = 'test';
    let targetBase = 'testTarget';
    let expectedTargetPath = 'testTarget\\adoc-manual\\it-IT\\adoc\\test_1.adoc';
    testGetOutputPath(sourcePath, sourceBase, targetBase, expectedTargetPath);
}

/**
 * @param {string} sourcePath
 * @param {string} sourceBase
 * @param {string} targetBase
 * @param {string} expectedTargetPath
 */
function testGetOutputPath(sourcePath, sourceBase, targetBase, expectedTargetPath) {
    const targetPath = getOutputPath(sourcePath, sourceBase, targetBase);
    console.assert(targetPath === expectedTargetPath, 'Different! ' + expectedTargetPath + ' - ' + targetPath);
}