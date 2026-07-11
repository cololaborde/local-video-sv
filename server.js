import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const VIDEO_DIR = path.join(__dirname, "videos");

app.use(express.static(path.join(__dirname, "public")));

const VIDEO_EXT = [".mp4", ".mkv", ".webm", ".mov", ".avi"];
const SUB_EXT = [".srt"];

function getLibrary() {

    if (!fs.existsSync(VIDEO_DIR))
        return [];

    return fs.readdirSync(VIDEO_DIR, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(dir => {

            const folder = path.join(VIDEO_DIR, dir.name);

            const files = fs.readdirSync(folder);

            const video = files.find(f =>
                VIDEO_EXT.includes(path.extname(f).toLowerCase())
            );

            const subtitle = files.find(f =>
                SUB_EXT.includes(path.extname(f).toLowerCase())
            );

            if (!video)
                return null;

            return {
                id: encodeURIComponent(dir.name),
                title: dir.name,
                video,
                subtitle
            };

        })
        .filter(Boolean);

}

app.get("/api/videos", (req, res) => {
    res.json(getLibrary());
});

app.get("/video/:folder", (req, res) => {

    const folder = decodeURIComponent(req.params.folder);

    const dir = path.join(VIDEO_DIR, folder);

    if (!fs.existsSync(dir))
        return res.sendStatus(404);

    const video = fs.readdirSync(dir).find(f =>
        VIDEO_EXT.includes(path.extname(f).toLowerCase())
    );

    if (!video)
        return res.sendStatus(404);

    const file = path.join(dir, video);

    res.writeHead(200, {
        "Content-Type": "video/mp4",
        "Transfer-Encoding": "chunked",
        "Accept-Ranges": "none"
    });

    const ffmpeg = spawn("ffmpeg", [
        "-i", file,

        // Copia el video si ya es H264
        "-c:v", "copy",

        // Convierte el audio a AAC
        "-c:a", "aac",
        "-b:a", "192k",
        "-ac", "2",

        // Optimizado para streaming
        "-movflags", "frag_keyframe+empty_moov",

        "-f", "mp4",

        "-"
    ]);

    ffmpeg.stdout.pipe(res);

    ffmpeg.stderr.on("data", d => {
        console.log(d.toString());
    });

    ffmpeg.on("close", () => {
        res.end();
    });

    req.on("close", () => {
        ffmpeg.kill("SIGKILL");
    });

});

app.get("/subtitle/:folder", (req, res) => {

    const folder = decodeURIComponent(req.params.folder);

    const dir = path.join(VIDEO_DIR, folder);

    if (!fs.existsSync(dir))
        return res.sendStatus(404);

    const subtitle = fs.readdirSync(dir).find(f =>
        SUB_EXT.includes(path.extname(f).toLowerCase())
    );

    if (!subtitle)
        return res.sendStatus(404);

    res.type("text/vtt");

    const srt = fs.readFileSync(path.join(dir, subtitle), "utf8");

    // Conversión SRT -> VTT
    const vtt =
        "WEBVTT\n\n" +
        srt.replace(/\r/g, "")
            .replace(/(\d\d:\d\d:\d\d),(\d\d\d)/g, "$1.$2");

    res.send(vtt);

});

const PORT = 3000;

app.listen(PORT, "0.0.0.0", () => {

    console.log(`Servidor iniciado`);

    console.log(`http://localhost:${PORT}`);

});