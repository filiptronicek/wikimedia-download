// @ts-check

const fs = require('fs'),
    http = require('http'),
    https = require('https');
const Stream = require('stream').Transform;
const fetch = require('node-fetch');
const getUrlsToArray = require("get-urls-to-array");
const cp = require('child_process');

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

const mimeType = encodeURIComponent("image/jpeg");
const fetchNew = () => {
    console.log("Fetching")
    fetch(`https://commons.wikimedia.org/w/index.php?title=Special:MIMESearch&limit=${step}&offset=${at}&mime=${mimeType}`).then((res) => {
        console.log(res.status)
        if (res.ok) {
            return res.text();
        } else {
            throw new Error("End " + res.status);
        }
    }).then(async (data) => {
        const images = getUrlsToArray(data).filter(url => new URL(url).hostname === 'upload.wikimedia.org');
        for (const image of images) {
            console.log(image);
            try {
                await exec(`wget -P output/ '${image.slice(0, 300)}'`);
            } catch { }
        }
        at = at + step;
        fetchNew();
    });
}

fetchNew();