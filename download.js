// @ts-check

const fetch = require("node-fetch");
const getUrlsToArray = require("get-urls-to-array");
const cp = require("child_process");
const cliProgress = require("cli-progress");
const inquirer = require("inquirer");
const { ArgumentParser } = require("argparse");

const parser = new ArgumentParser({
  description: "WikiMedia Downloader",
});

parser.add_argument("-l", "--limit", {
  help: "Limit of how many files to download",
  type: "int",
});

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
    const child = cp.exec(
      command,
      { cwd: options?.cwd },
      (error, stdout, stderr) => {
        if (error) {
          return reject(error);
        }
        resolve({ stdout, stderr });
      }
    );
    if (!options?.quiet) {
      child.stdout.pipe(process.stdout);
    }
    child.stderr.pipe(process.stderr);
  });
};

let at = 0;
const step = 100;
const pBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

const fetchNew = (/** @type {string[]} */ mimeTypes) => {
  for (const mimeType of mimeTypes) {
    console.log(`\nFetching page ${at / step + 1} of ${mimeType}`);
    fetch(
      `https://commons.wikimedia.org/w/index.php?title=Special:MIMESearch&limit=${step}&offset=${at}&mime=${encodeURIComponent(
        mimeType
      )}`
    )
      .then((res) => {
        if (res.ok) {
          return res.text();
        } else {
          const newTypes = mimeTypes.shift();
          if (newTypes) {
            fetchNew();
          } else {
            console.log("Done, exiting.");
            process.exit();
          }
        }
      })
      .then(async (data) => {
        const images = getUrlsToArray(data).filter(
          (url) => new URL(url).hostname === "upload.wikimedia.org"
        );
        pBar.start(step, 0);
        for (const image of images) {
          if (at++ >= parser.parse_args().limit) {
            pBar.stop();
            console.log("Limit reached");
            process.exit();
          }
          pBar.increment(1);
          try {
            await exec(`wget -P output/ --quiet '${image.slice(0, 300)}'`, {
              quiet: true,
            });
          } catch {}
        }
        pBar.stop();
        fetchNew(mimeTypes);
      });
  }
};

const possibleMimeTypes = [
  "application/*",
  "application/ogg",
  "application/pdf",
  "application/sla",
  "audio/*",
  "audio/midi",
  "audio/mpeg",
  "audio/wav",
  "audio/webm",
  "audio/x-flac",
  "image/*",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/svg+xml",
  "image/tiff",
  "image/vnd.djvu",
  "image/webp",
  "image/x-xcf",
  "video/*",
  "video/mpeg",
  "video/webm",
];

const inquirerConverted = possibleMimeTypes.map((type) => {
  return { name: type };
});

if (parser.parse_args().help) {
  inquirer
    .prompt([
      {
        type: "checkbox",
        message: "Select mime types to download",
        name: "mimeTypes",
        choices: [...inquirerConverted],
        validate(answer) {
          if (answer.length < 1) {
            return "You must choose at least one mime type.";
          }

          return true;
        },
      },
    ])
    .then((mimeTypes) => {
      fetchNew(mimeTypes.mimeTypes);
    });
}
