// @ts-check

const fetch = require('node-fetch');
const getUrlsToArray = require("get-urls-to-array");
const cp = require('child_process');
const cliProgress = require('cli-progress');

/**
 * @param {string} command
 * @param {{cwd?: string, quiet?: boolean}} [options]
 * @returns {Promise<{ stdout: string, stderr: string }>}
 */
const exec = async (command, options) => {
    if (!options?.quiet) {
        console.log(`Running: ${command}`);
    }
    return new Promise((resolve, reject) => {
        const child = cp.exec(command, { cwd: options?.cwd }, (error, stdout, stderr) => {
            if (error) {
                return reject(error);
            }
            resolve({ stdout, stderr });
        });
        if (!options?.quiet) {
            child.stdout.pipe(process.stdout);
        }
        child.stderr.pipe(process.stderr);
    });
};

let at = 0;
const step = 100;
const pBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

const mimeType = encodeURIComponent("image/jpeg");
const fetchNew = () => {
    console.log(`Fetching page ${at / step + 1}`)
    fetch(`https://commons.wikimedia.org/w/index.php?title=Special:MIMESearch&limit=${step}&offset=${at}&mime=${mimeType}`).then((res) => {
        if (res.ok) {
            return res.text();
        } else {
            throw new Error("End " + res.status);
        }
    }).then(async (data) => {
        const images = getUrlsToArray(data).filter(url => new URL(url).hostname === 'upload.wikimedia.org');
        pBar.start(step, 0);
        for (const image of images) {
            pBar.increment(1);
            try {
                await exec(`wget -P output/ --quiet '${image.slice(0, 300)}'`, {quiet: true});
            } catch { }
        }
        pBar.stop();
        at = at + step;
        fetchNew();
    });
}

fetchNew();