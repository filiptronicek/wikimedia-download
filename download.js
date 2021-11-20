// @ts-check

const fs = require('fs'),
    http = require('http'),
    https = require('https');
const Stream = require('stream').Transform;
const fetch = require('node-fetch');
const getUrlsToArray = require("get-urls-to-array");

const downloadImageFromURL = (url, filename, callback) => {
    let client = http;
    if (url.toString().indexOf("https") === 0) {
        // @ts-ignore
        client = https;
    }

    client.request(url, function (response) {
        const data = new Stream();
        response.on('data', function (chunk) {
            data.push(chunk);
        });
        response.on('end', function () {
            fs.writeFileSync("./output/"+filename, data.read());
        });
    }).end();
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
    }).then((data) => {
        const images = getUrlsToArray(data).filter(url => new URL(url).hostname === 'upload.wikimedia.org');
        for (const image of images) {
            downloadImageFromURL(image, new URL(image).pathname.split("/").at(-1).slice(0, 150));
        }
        at = at + step;
        fetchNew();
    });
}

fetchNew();