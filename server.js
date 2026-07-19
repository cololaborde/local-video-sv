import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import { execFile } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const VIDEO_DIR = path.resolve(__dirname, "videos");

app.use(express.static(path.join(__dirname, "public")));


const VIDEO_EXT = [".mp4", ".mkv", ".webm", ".mov", ".avi"];
const SUB_EXT = [".srt"];

function toUrlPath(p) {
    return p.split(path.sep).join("/");
}

function safeResolve(relative = "") {
    const target = path.resolve(VIDEO_DIR, relative);
    if (target !== VIDEO_DIR && !target.startsWith(VIDEO_DIR + path.sep)) {
        throw new Error("Ruta inválida");
    }
    return target;
}

function findSubtitle(dir, videoFile) {
    const files = fs.readdirSync(dir);
    const base = path.basename(videoFile, path.extname(videoFile));

    let sub = files.find(f =>
        SUB_EXT.includes(path.extname(f).toLowerCase()) &&
        path.basename(f, path.extname(f)) === base
    );

    if (!sub) {
        sub = files.find(f => SUB_EXT.includes(path.extname(f).toLowerCase()));
    }

    return sub || null;
}


app.get("/api/browse", (req, res) => {

    try {
        const rel = req.query.path ? String(req.query.path) : "";
        const dir = safeResolve(rel);

        if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
            return res.status(404).json({ error: "Directorio no encontrado" });
        }

        const entries = fs.readdirSync(dir, { withFileTypes: true });

        const dirs = [];
        const videos = [];

        for (const entry of entries) {

            const entryRel = rel ? path.join(rel, entry.name) : entry.name;

            if (entry.isDirectory()) {
                dirs.push({
                    name: entry.name,
                    path: toUrlPath(entryRel)
                });
                continue;
            }

            const ext = path.extname(entry.name).toLowerCase();

            if (VIDEO_EXT.includes(ext)) {
                const subtitle = findSubtitle(dir, entry.name);
                videos.push({
                    name: entry.name,
                    path: toUrlPath(entryRel),
                    subtitlePath: subtitle
                        ? toUrlPath(rel ? path.join(rel, subtitle) : subtitle)
                        : null
                });
            }
        }

        dirs.sort((a, b) => a.name.localeCompare(b.name));
        videos.sort((a, b) => a.name.localeCompare(b.name));

        res.json({ path: toUrlPath(rel), dirs, videos });

    } catch (e) {
        res.status(400).json({ error: e.message });
    }

});

function getVideoCodec(file) {
    return new Promise((resolve, reject) => {
        execFile("ffprobe", [
            "-v", "error",
            "-select_streams", "v:0",
            "-show_entries", "stream=codec_name",
            "-of", "default=noprint_wrappers=1:nokey=1",
            file
        ], (err, stdout) => {
            if (err) return reject(err);
            resolve(stdout.trim());
        });
    });
}

app.get("/video", async (req, res) => {

    try {
        const rel = req.query.path ? String(req.query.path) : "";
        if (!rel) return res.sendStatus(400);

        const file = safeResolve(rel);

        if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
            return res.sendStatus(404);
        }

        let codec;
        try {
            codec = await getVideoCodec(file);
        } catch {
            codec = null;
        }

        const COPYABLE_CODECS = ["h264"];

        const videoArgs = COPYABLE_CODECS.includes(codec)
            ? ["-c:v", "copy"]
            : ["-c:v", "libx264", "-preset", "veryfast", "-crf", "23"];

        res.writeHead(200, {
            "Content-Type": "video/mp4",
            "Transfer-Encoding": "chunked",
            "Accept-Ranges": "none"
        });

        const ffmpeg = spawn("ffmpeg", [
            "-i", file,

            ...videoArgs,

            "-c:a", "aac",
            "-b:a", "192k",
            "-ac", "2",

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

    } catch (e) {
        res.sendStatus(400);
    }

});

app.get("/subtitle/download", (req, res) => {
    try {
        const rel = req.query.path ? String(req.query.path) : "";
        if (!rel) return res.sendStatus(400);

        const file = safeResolve(rel);

        if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
            return res.sendStatus(404);
        }

        res.download(file);

    } catch {
        res.sendStatus(400);
    }
});

const PORT = 3000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor iniciado`);
    console.log(`http://localhost:${PORT}`);
});