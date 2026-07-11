# local-video-sv

Stream your personal video collection from your computer to any device on your home network.

## What It Does

- Watch videos stored on your computer from your phone, tablet, or other devices
- Organize videos in folders
- Automatic subtitles (SRT format)
- Works with most video formats (MP4, MKV, WebM, MOV, AVI)
- Dark theme interface, easy to use

## Before You Start

Install these programs (they're free):
- **Node.js** — [Download here](https://nodejs.org/) (choose LTS version)
- **FFmpeg** — [Download here](https://ffmpeg.org/download.html)

## Quick Start

### 1. Get the Project
```bash
git clone https://github.com/cololaborde/local-video-sv.git
cd local-video-sv
```

### 2. Install Packages
```bash
npm install
```

### 3. Add Your Videos
Put your video files in the videos folder. You can organize them in subfolders:
```bash
videos/
├── Movies/
│   ├── Action/
│   │   └── Inception.mp4
│   └── Comedy/
│       └── The Grand Budapest Hotel.mkv
└── TV Shows/
    └── Breaking Bad/
        └── Episode 1.mp4
```

### 4. Add Subtitles (Optional)
If you have subtitles, add them in the same folder as the video with the same name:

- Inception.mp4 + Inception.srt ✅

### 5. Start the Server
```bash
npm start
```

You'll see:


```bash
Servidor iniciado
http://localhost:3000
```

## How to Watch

### On the Same Computer

Open your browser and go to: http://localhost:3000

### On Your Phone/Tablet/Other Device
1. Find your computer's IP address:

    - Windows: Open Command Prompt, type ipconfig, look for "IPv4 Address" (like 192.168.1.5)
    - Mac/Linux: Open Terminal, type hostname -I

2. On your phone, open: http://192.168.1.5:3000 (replace with your IP)

3. Click any video to play

4. Use the video controls to play, pause, go fullscreen, etc.

5. Subtitles appear automatically if available