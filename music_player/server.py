"""
Heavy Metal & Space Rock YouTube Music Player & Looped MP4 Recorder Backend
Serves local web interface, interfaces with yt-dlp and ffmpeg for recording and looping.
"""

import os
import sys
import json
import uuid
import time
import shutil
import urllib.parse
import subprocess
import threading
from pathlib import Path
from http import HTTPStatus
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn

# Configuration & Paths
BASE_DIR = Path(__file__).resolve().parent
MEDIA_DIR = BASE_DIR / "media"
STATIC_DIR = BASE_DIR / "static"
METADATA_FILE = MEDIA_DIR / "library.json"

MEDIA_DIR.mkdir(parents=True, exist_ok=True)
STATIC_DIR.mkdir(parents=True, exist_ok=True)

# Node path for yt-dlp JS runtime if available
NODE_PATH = r"D:\Code\nodejs\node.exe"
if not os.path.exists(NODE_PATH):
    NODE_PATH = "node"

# Curated Band Presets
PRESETS = [
    {
        "id": "gates_of_slumber",
        "name": "The Gates of Slumber",
        "genre": "Epic Doom Metal",
        "query": "The Gates of Slumber Conqueror full album",
        "badge": "Doom / S&S",
        "description": "Crushing, sorrow-laden traditional doom metal steeped in swords & sorcery.",
        "suggested_tracks": [
            "The Gates of Slumber - Conqueror",
            "The Gates of Slumber - Suffer No Guilt",
            "The Gates of Slumber - The Hymn for the End",
            "The Gates of Slumber - Ice Worm"
        ]
    },
    {
        "id": "liege_lord",
        "name": "Liege Lord",
        "genre": "US Power / Speed Metal",
        "query": "Liege Lord Master Control full album",
        "badge": "Power / Speed",
        "description": "High-octane technical US power metal with soaring vocals and blazing riffs.",
        "suggested_tracks": [
            "Liege Lord - Master Control (Full Album)",
            "Liege Lord - Burn to My Touch",
            "Liege Lord - Freedom's Rise",
            "Liege Lord - Cast Out"
        ]
    },
    {
        "id": "heir_apparent",
        "name": "Heir Apparent (Graceful Inheritance)",
        "genre": "US Power / Progressive Metal",
        "query": "Heir Apparent Graceful Inheritance full album 1986",
        "badge": "First Album 1986",
        "description": "The legendary 1986 debut album 'Graceful Inheritance', a masterwork of melodic US power metal.",
        "suggested_tracks": [
            "Heir Apparent - Graceful Inheritance (Full Album 1986)",
            "Heir Apparent - Tear Down the Walls",
            "Heir Apparent - Hands of Doom",
            "Heir Apparent - Another Candle"
        ]
    },
    {
        "id": "manilla_road",
        "name": "Manilla Road",
        "genre": "Epic Heavy Metal",
        "query": "Manilla Road Crystal Logic full album",
        "badge": "Epic Metal Gods",
        "description": "Pioneers of epic metal led by Mark 'The Shark' Shelton. Robert E. Howard and mythology-infused anthems.",
        "suggested_tracks": [
            "Manilla Road - Crystal Logic (Full Album)",
            "Manilla Road - Open the Gates (Full Album)",
            "Manilla Road - The Deluge (Full Album)",
            "Manilla Road - Necropolis"
        ]
    },
    {
        "id": "ironsword",
        "name": "Ironsword",
        "genre": "Barbarian Epic Metal",
        "query": "Ironsword None But the Brave full album",
        "badge": "Conan / Howardian",
        "description": "Raw, unrelenting barbarian heavy metal dedicated to the Hyborian tales of Robert E. Howard.",
        "suggested_tracks": [
            "Ironsword - None But the Brave (Full Album)",
            "Ironsword - Overlords of Chaos (Full Album)",
            "Ironsword - Return of the Warrior",
            "Ironsword - Servants of Phobos"
        ]
    },
    {
        "id": "brocas_helm",
        "name": "Brocas Helm",
        "genre": "Epic Speed / Heavy Metal",
        "query": "Brocas Helm Defender of the Crown full album",
        "badge": "Cult Legends",
        "description": "San Francisco epic metal legends famed for frantic basslines and wild battle anthems.",
        "suggested_tracks": [
            "Brocas Helm - Defender of the Crown (Full Album)",
            "Brocas Helm - Black Death (Full Album)",
            "Brocas Helm - Cry of the Banshee",
            "Brocas Helm - Into the Crypts of Rays"
        ]
    },
    {
        "id": "hawkwind",
        "name": "Hawkwind",
        "genre": "Space Rock / Moorcockian",
        "query": "Hawkwind Warrior on the Edge of Time full album",
        "badge": "Moorcock / Space Rock",
        "description": "Cosmic space rock pioneers who collaborated directly with fantasy author Michael Moorcock.",
        "suggested_tracks": [
            "Hawkwind - Warrior on the Edge of Time (Full Album)",
            "Hawkwind - Space Ritual (Full Album)",
            "Hawkwind - Master of the Universe",
            "Hawkwind - Sonic Attack"
        ]
    },
    {
        "id": "bal_sagoth",
        "name": "Bal-Sagoth",
        "genre": "Symphonic Cosmic Metal",
        "query": "Bal-Sagoth Starfire Burning Upon the Ice-Veiled Throne of Ultima Thule full album",
        "badge": "Hyperborean / Cosmic",
        "description": "Bombastic baroque symphonic metal chronicling hyperborean sorcery, antediluvian empires, and elder gods.",
        "suggested_tracks": [
            "Bal-Sagoth - Starfire Burning Upon the Ice-Veiled Throne of Ultima Thule",
            "Bal-Sagoth - Battle Magic (Full Album)",
            "Bal-Sagoth - The Chthonic Chronicles",
            "Bal-Sagoth - The Splendour of a Thousand Swords"
        ]
    },
    {
        "id": "cirith_ungol",
        "name": "Cirith Ungol",
        "genre": "Epic Heavy / Doom Metal",
        "query": "Cirith Ungol King of the Dead full album",
        "badge": "Moorcock / Tolkien",
        "description": "Dark fantasy heavy metal pioneers featuring Tim Baker's razor voice and Michael Whelan Elric art.",
        "suggested_tracks": [
            "Cirith Ungol - King of the Dead (Full Album)",
            "Cirith Ungol - Frost and Fire (Full Album)",
            "Cirith Ungol - Master of the Pit",
            "Cirith Ungol - Black Machine"
        ]
    },
    {
        "id": "blind_guardian_early",
        "name": "(Early) Blind Guardian",
        "genre": "Epic Speed Metal",
        "query": "Blind Guardian Battalions of Fear full album",
        "badge": "Early Speed / Tolkien",
        "description": "Furious high-speed Teutonic metal from the golden 1988-1990 era celebrating Middle-earth.",
        "suggested_tracks": [
            "Blind Guardian - Battalions of Fear (Full Album 1988)",
            "Blind Guardian - Follow the Blind (Full Album 1989)",
            "Blind Guardian - Tales from the Twilight World (Full Album 1990)",
            "Blind Guardian - Majesty",
            "Blind Guardian - Valhalla"
        ]
    },
    {
        "id": "ashbury",
        "name": "Ashbury",
        "genre": "Proto-Metal / Folk Rock",
        "query": "Ashbury Endless Skies full album 1983",
        "badge": "Endless Skies 1983",
        "description": "Cult Arizona acoustic/electric hard rock and fantasy melodic majesty from 1983.",
        "suggested_tracks": [
            "Ashbury - Endless Skies (Full Album 1983)",
            "Ashbury - The Warning",
            "Ashbury - Twilight",
            "Ashbury - Mystery Man"
        ]
    },
    {
        "id": "riot",
        "name": "Riot",
        "genre": "Speed / US Power Metal",
        "query": "Riot Thundersteel full album",
        "badge": "Thundersteel / USPM",
        "description": "Mark Reale's high-speed metal powerhouse, famous for blistering riffs, Tony Moore's vocals, and Fire Down Under.",
        "suggested_tracks": [
            "Riot - Thundersteel (Full Album)",
            "Riot - Fire Down Under (Full Album)",
            "Riot - Swords and Tequila",
            "Riot - Flight of the Warrior"
        ]
    },
    {
        "id": "omen",
        "name": "Omen",
        "genre": "US Epic Power Metal",
        "query": "Omen Battle Cry full album 1984",
        "badge": "Battle Cry 1984",
        "description": "True blood-and-iron sword & sorcery metal led by Kenny Powell and J.D. Kimball.",
        "suggested_tracks": [
            "Omen - Battle Cry (Full Album 1984)",
            "Omen - Warning of Danger (Full Album 1985)",
            "Omen - The Axeman",
            "Omen - Teeth of the Hydra"
        ]
    },
    {
        "id": "oracle",
        "name": "Oracle",
        "genre": "Progressive US Power Metal",
        "query": "Oracle As Darkness Reigns full album 1989",
        "badge": "Cult USPM 1989",
        "description": "Florida cult US power metal masterpiece 'As Darkness Reigns' (1989), filled with intricate riffcraft.",
        "suggested_tracks": [
            "Oracle - As Darkness Reigns (Full Album 1989)",
            "Oracle - Prisoner (Of Your Own Design)",
            "Oracle - The Watcher",
            "Oracle - Nightmares"
        ]
    },
    {
        "id": "heavy_load",
        "name": "Heavy Load",
        "genre": "First Swedish Heavy Metal",
        "query": "Heavy Load Death or Glory full album",
        "badge": "Swedish Legends",
        "description": "The first true Swedish heavy metal band: Viking pride, heroic barbarism, and towering guitar harmonies.",
        "suggested_tracks": [
            "Heavy Load - Death or Glory (Full Album)",
            "Heavy Load - Stronger Than Evil (Full Album)",
            "Heavy Load - Singing Swords",
            "Heavy Load - Might for Right"
        ]
    },
    {
        "id": "attacker",
        "name": "Attacker",
        "genre": "US Speed / Power Metal",
        "query": "Attacker Battle at Helms Deep full album 1985",
        "badge": "Helms Deep 1985",
        "description": "High-octane New Jersey speed metal fury inspired by Tolkien's siege of the Hornburg.",
        "suggested_tracks": [
            "Attacker - Battle at Helm's Deep (Full Album 1985)",
            "Attacker - The Second Coming (Full Album 1988)",
            "Attacker - Slayer's Blade",
            "Attacker - Disciple of Doom"
        ]
    },
    {
        "id": "manowar",
        "name": "Manowar",
        "genre": "Kings of True Heavy Metal",
        "query": "Manowar Into Glory Ride full album",
        "badge": "Kings of Metal",
        "description": "The undisputed champions of sword & sorcery heavy metal, crushing drums, and operatic warrior power.",
        "suggested_tracks": [
            "Manowar - Into Glory Ride (Full Album)",
            "Manowar - Hail to England (Full Album)",
            "Manowar - Battle Hymns (Full Album)",
            "Manowar - Secret of Steel",
            "Manowar - Gates of Valhalla"
        ]
    }
]

JOBS = {}
JOBS_LOCK = threading.Lock()


def load_library_metadata():
    if METADATA_FILE.exists():
        try:
            with open(METADATA_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}


def save_library_metadata(data):
    try:
        with open(METADATA_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"[Error] Failed to save metadata: {e}")


def update_job(job_id, **kwargs):
    with JOBS_LOCK:
        if job_id in JOBS:
            JOBS[job_id].update(kwargs)


def sanitize_filename(name):
    clean = "".join(c for c in name if c.isalnum() or c in (" ", "-", "_", ".", "(", ")")).strip()
    return clean[:120] or "track"


def get_youtube_title(url):
    """Quickly extracts the actual video title from YouTube using yt-dlp."""
    try:
        cmd = [
            "yt-dlp",
            "--js-runtimes", f"node:{NODE_PATH}",
            "--no-update",
            "--no-playlist",
            "--print", "%(title)s",
            url
        ]
        proc = subprocess.run(cmd, capture_output=True, text=True, errors="replace", timeout=20)
        if proc.returncode == 0 and proc.stdout.strip():
            return proc.stdout.strip().split("\n")[0].strip()
    except Exception as e:
        print(f"[Title Resolution Error] {e}")
    return None


def run_yt_search(query, limit=8):
    """Executes yt-dlp to search YouTube or inspect direct URL, returning list of metadata dicts."""
    is_direct_url = query.startswith("http://") or query.startswith("https://") or "youtube.com/" in query or "youtu.be/" in query
    if is_direct_url:
        cmd = [
            "yt-dlp",
            "--js-runtimes", f"node:{NODE_PATH}",
            "--no-update",
            "--dump-json",
            "--no-playlist",
            query
        ]
    else:
        cmd = [
            "yt-dlp",
            "--js-runtimes", f"node:{NODE_PATH}",
            "--no-update",
            "--dump-json",
            "--flat-playlist",
            f"ytsearch{limit}:{query}"
        ]
    try:
        proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding="utf-8", errors="replace")
        stdout, stderr = proc.communicate(timeout=35)
        results = []
        for line in stdout.strip().split("\n"):
            if not line:
                continue
            try:
                item = json.loads(line)
                video_id = item.get("id") or item.get("url")
                if not video_id:
                    continue
                thumbnails = item.get("thumbnails") or []
                thumb = thumbnails[-1].get("url") if thumbnails else f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"
                duration = item.get("duration")
                duration_str = item.get("duration_string")
                if not duration_str and duration:
                    m, s = divmod(int(duration), 60)
                    h, m = divmod(m, 60)
                    duration_str = f"{h}:{m:02d}:{s:02d}" if h else f"{m}:{s:02d}"

                results.append({
                    "id": video_id,
                    "title": item.get("title") or "Unknown Title",
                    "channel": item.get("uploader") or item.get("channel") or "Unknown Artist",
                    "duration": duration,
                    "duration_string": duration_str or "--:--",
                    "thumbnail": thumb,
                    "url": f"https://www.youtube.com/watch?v={video_id}"
                })
            except Exception:
                continue
        return results
    except Exception as e:
        print(f"[Search Error] {e}")
        return []


def record_video_task(job_id, url, title_hint="Track", loop_count=1, make_looped_copy=False):
    """Downloads video via yt-dlp, standardizes to MP4, and optionally creates looped set version."""
    try:
        # If title_hint is generic or a URL, resolve real title from YouTube
        clean_hint = (title_hint or "").strip()
        if not clean_hint or clean_hint.lower() in ("track", "youtube", "unknown", "youtube video") or clean_hint.startswith("http://") or clean_hint.startswith("https://") or "youtube" in clean_hint.lower():
            update_job(job_id, status="resolving", progress=5, message="Resolving video title from YouTube...")
            real_title = get_youtube_title(url)
            if real_title:
                title_hint = real_title
                update_job(job_id, title=title_hint)
            elif not clean_hint or clean_hint.startswith("http"):
                title_hint = "YouTube Track"

        update_job(job_id, status="downloading", progress=15, message="Downloading media stream from YouTube...")
        raw_slug = sanitize_filename(title_hint)
        unique_prefix = uuid.uuid4().hex[:6]
        raw_filename = f"{raw_slug}_{unique_prefix}.mp4"
        raw_path = MEDIA_DIR / raw_filename

        dl_cmd = [
            "yt-dlp",
            "--js-runtimes", f"node:{NODE_PATH}",
            "--no-update",
            "--no-playlist",
            "--format", "bestvideo[vcodec^=avc1][ext=mp4]+bestaudio[acodec^=mp4a]/bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
            "--merge-output-format", "mp4",
            "-o", str(raw_path),
            url
        ]

        proc = subprocess.run(dl_cmd, capture_output=True, text=True, errors="replace")
        if proc.returncode != 0 or not raw_path.exists():
            dl_fallback = [
                "yt-dlp",
                "--js-runtimes", f"node:{NODE_PATH}",
                "--no-update",
                "--no-playlist",
                "-f", "mp4",
                "-o", str(raw_path),
                url
            ]
            proc_fb = subprocess.run(dl_fallback, capture_output=True, text=True, errors="replace")
            if proc_fb.returncode != 0 or not raw_path.exists():
                raise RuntimeError(f"yt-dlp download failed: {proc.stderr[-300:]}")

        update_job(job_id, status="processing", progress=60, message="Applying faststart & checking MP4 compatibility...")

        opt_path = MEDIA_DIR / f"{raw_slug}_{unique_prefix}_std.mp4"
        ffmpeg_faststart = [
            "ffmpeg", "-y",
            "-i", str(raw_path),
            "-c", "copy",
            "-movflags", "+faststart",
            str(opt_path)
        ]
        res_opt = subprocess.run(ffmpeg_faststart, capture_output=True)
        if res_opt.returncode == 0 and opt_path.exists():
            try:
                raw_path.unlink()
            except Exception:
                pass
            final_single_path = opt_path
        else:
            final_single_path = raw_path

        files_recorded = [final_single_path.name]

        looped_filename = None
        if make_looped_copy and loop_count > 1:
            update_job(job_id, status="looping", progress=80, message=f"Creating seamless {loop_count}x looped MP4...")
            looped_filename = f"{raw_slug}_{unique_prefix}_looped_{loop_count}x.mp4"
            looped_path = MEDIA_DIR / looped_filename

            ffmpeg_loop = [
                "ffmpeg", "-y",
                "-stream_loop", str(loop_count - 1),
                "-i", str(final_single_path),
                "-c", "copy",
                "-movflags", "+faststart",
                str(looped_path)
            ]
            res_loop = subprocess.run(ffmpeg_loop, capture_output=True)
            if res_loop.returncode == 0 and looped_path.exists():
                files_recorded.append(looped_filename)
            else:
                ffmpeg_loop_reencode = [
                    "ffmpeg", "-y",
                    "-stream_loop", str(loop_count - 1),
                    "-i", str(final_single_path),
                    "-c:v", "libx264", "-preset", "ultrafast",
                    "-c:a", "aac",
                    "-movflags", "+faststart",
                    str(looped_path)
                ]
                res_re = subprocess.run(ffmpeg_loop_reencode, capture_output=True)
                if res_re.returncode == 0 and looped_path.exists():
                    files_recorded.append(looped_filename)

        meta = load_library_metadata()
        for fname in files_recorded:
            fpath = MEDIA_DIR / fname
            is_loop_file = "looped_" in fname
            display_title = f"{title_hint} (Looped {loop_count}x)" if is_loop_file else title_hint
            meta[fname] = {
                "filename": fname,
                "title": display_title,
                "original_title": title_hint,
                "url": url,
                "size_mb": round(fpath.stat().st_size / (1024 * 1024), 2) if fpath.exists() else 0,
                "is_looped": is_loop_file,
                "loop_count": loop_count if is_loop_file else 1,
                "created_at": time.time()
            }
        save_library_metadata(meta)

        update_job(
            job_id,
            status="completed",
            progress=100,
            message="Recorded successfully!",
            output_files=files_recorded,
            primary_file=looped_filename or final_single_path.name
        )

    except Exception as e:
        print(f"[Job {job_id} Error] {e}")
        update_job(job_id, status="failed", progress=100, error=str(e))


def build_master_looped_set_task(job_id, file_list, loop_count=2, output_name="Master_Looped_Set"):
    """Concatenates multiple recorded MP4s and loops the entire compilation."""
    try:
        update_job(job_id, status="compiling", progress=20, message="Gathering and verifying tracks for master set...")
        safe_name = sanitize_filename(output_name)
        target_name = f"{safe_name}_{uuid.uuid4().hex[:6]}.mp4"
        target_path = MEDIA_DIR / target_name

        concat_txt = MEDIA_DIR / f"concat_{uuid.uuid4().hex[:6]}.txt"
        valid_files = []
        for f in file_list:
            p = MEDIA_DIR / f
            if p.exists():
                valid_files.append(p)

        if not valid_files:
            raise ValueError("No valid MP4 files found in library to concatenate.")

        with open(concat_txt, "w", encoding="utf-8") as f:
            for p in valid_files:
                clean_p = str(p).replace("\\", "/")
                f.write(f"file '{clean_p}'\n")

        update_job(job_id, status="compiling", progress=50, message=f"Concatenating and looping set {loop_count}x...")

        cmd = [
            "ffmpeg", "-y",
            "-stream_loop", str(max(0, loop_count - 1)),
            "-f", "concat",
            "-safe", "0",
            "-i", str(concat_txt),
            "-c", "copy",
            "-movflags", "+faststart",
            str(target_path)
        ]
        res = subprocess.run(cmd, capture_output=True)
        try:
            concat_txt.unlink()
        except Exception:
            pass

        if res.returncode != 0 or not target_path.exists():
            cmd_reencode = [
                "ffmpeg", "-y",
                "-stream_loop", str(max(0, loop_count - 1)),
                "-f", "concat",
                "-safe", "0",
                "-i", str(concat_txt),
                "-c:v", "libx264", "-preset", "veryfast",
                "-c:a", "aac",
                "-movflags", "+faststart",
                str(target_path)
            ]
            res_re = subprocess.run(cmd_reencode, capture_output=True)
            if res_re.returncode != 0 or not target_path.exists():
                raise RuntimeError(f"FFmpeg concat failed: {res.stderr}")

        meta = load_library_metadata()
        meta[target_name] = {
            "filename": target_name,
            "title": f"{output_name} ({len(valid_files)} tracks, {loop_count}x loop)",
            "original_title": output_name,
            "url": "local://compilation",
            "size_mb": round(target_path.stat().st_size / (1024 * 1024), 2),
            "is_looped": True,
            "is_master_set": True,
            "loop_count": loop_count,
            "created_at": time.time()
        }
        save_library_metadata(meta)

        update_job(
            job_id,
            status="completed",
            progress=100,
            message="Master Looped Set compiled successfully!",
            primary_file=target_name
        )

    except Exception as e:
        print(f"[Master Set Error] {e}")
        update_job(job_id, status="failed", progress=100, error=str(e))


class MusicPlayerHandler(BaseHTTPRequestHandler):
    """Custom HTTP Request Handler supporting JSON REST APIs and Streaming Range Requests."""

    def log_message(self, format, *args):
        if "GET /api/jobs" in args[0] or "GET /static" in args[0]:
            return
        super().log_message(format, *args)

    def send_json(self, data, status=HTTPStatus.OK):
        content = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(content)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(content)

    def do_OPTIONS(self):
        self.send_response(HTTPStatus.NO_CONTENT)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Range")
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        if path == "/api/status":
            self.send_json({
                "status": "online",
                "ytdlp_available": shutil.which("yt-dlp") is not None,
                "ffmpeg_available": shutil.which("ffmpeg") is not None,
                "node_available": os.path.exists(NODE_PATH) or shutil.which("node") is not None,
                "media_count": len(list(MEDIA_DIR.glob("*.mp4")))
            })
            return

        if path == "/api/presets":
            self.send_json({"presets": PRESETS})
            return

        if path == "/api/search":
            q = query.get("q", [""])[0].strip()
            limit = int(query.get("limit", [8])[0])
            if not q:
                self.send_json({"error": "Missing search query parameter 'q'"}, status=HTTPStatus.BAD_REQUEST)
                return
            results = run_yt_search(q, limit=limit)
            self.send_json({"query": q, "results": results})
            return

        if path == "/api/jobs":
            with JOBS_LOCK:
                self.send_json({"jobs": list(JOBS.values())})
            return

        if path == "/api/library":
            meta = load_library_metadata()
            disk_files = []
            for p in sorted(MEDIA_DIR.glob("*.mp4"), key=os.path.getmtime, reverse=True):
                fname = p.name
                info = meta.get(fname, {
                    "filename": fname,
                    "title": fname.replace(".mp4", "").replace("_", " "),
                    "size_mb": round(p.stat().st_size / (1024 * 1024), 2),
                    "created_at": os.path.getmtime(p),
                    "is_looped": "looped" in fname
                })
                disk_files.append(info)
            self.send_json({"library": disk_files})
            return

        if path.startswith("/media/"):
            filename = urllib.parse.unquote(path[7:])
            filepath = (MEDIA_DIR / filename).resolve()
            if not str(filepath).startswith(str(MEDIA_DIR.resolve())) or not filepath.exists():
                self.send_error(HTTPStatus.NOT_FOUND, "Media file not found")
                return
            self.serve_file_with_range(filepath, "video/mp4")
            return

        if path == "/" or path == "/index.html":
            target = STATIC_DIR / "index.html"
            self.serve_file(target, "text/html; charset=utf-8")
            return

        static_file = (STATIC_DIR / path.lstrip("/")).resolve()
        if str(static_file).startswith(str(STATIC_DIR.resolve())) and static_file.exists() and static_file.is_file():
            mime = "text/plain"
            if static_file.suffix == ".css":
                mime = "text/css"
            elif static_file.suffix == ".js":
                mime = "application/javascript"
            elif static_file.suffix in (".png", ".jpg", ".jpeg", ".webp", ".ico"):
                mime = f"image/{static_file.suffix.lstrip('.')}"
            self.serve_file(static_file, mime)
            return

        self.send_error(HTTPStatus.NOT_FOUND, "Resource not found")

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        try:
            length = int(self.headers.get("Content-Length", 0))
            body_bytes = self.rfile.read(length) if length > 0 else b"{}"
            data = json.loads(body_bytes.decode("utf-8")) if body_bytes else {}
        except Exception:
            self.send_json({"error": "Invalid JSON payload"}, status=HTTPStatus.BAD_REQUEST)
            return

        if path in ("/api/record", "/api/add_urls"):
            raw_urls = data.get("urls")
            single_url = data.get("url")
            urls = []
            if isinstance(raw_urls, list):
                urls.extend([u.strip() for u in raw_urls if isinstance(u, str) and u.strip()])
            elif isinstance(raw_urls, str) and raw_urls.strip():
                urls.extend([u.strip() for u in raw_urls.splitlines() if u.strip()])

            if single_url and isinstance(single_url, str) and single_url.strip() and single_url.strip() not in urls:
                urls.append(single_url.strip())

            title = data.get("title", "")
            loop_count = int(data.get("loop_count", 1))
            make_looped = bool(data.get("make_looped", loop_count > 1))

            if not urls:
                self.send_json({"error": "Missing 'url' or 'urls' parameter"}, status=HTTPStatus.BAD_REQUEST)
                return

            jobs_created = []
            for item_url in urls:
                job_id = uuid.uuid4().hex[:8]
                display_title = title if (title and len(urls) == 1) else "YouTube Video"
                with JOBS_LOCK:
                    JOBS[job_id] = {
                        "id": job_id,
                        "type": "record",
                        "title": display_title,
                        "url": item_url,
                        "status": "queued",
                        "progress": 0,
                        "message": "Enqueued download...",
                        "created_at": time.time()
                    }

                t = threading.Thread(
                    target=record_video_task,
                    args=(job_id, item_url, display_title, loop_count, make_looped),
                    daemon=True
                )
                t.start()
                jobs_created.append({"job_id": job_id, "url": item_url, "title": display_title})

            self.send_json({
                "status": "accepted",
                "job_id": jobs_created[0]["job_id"] if len(jobs_created) == 1 else None,
                "jobs": jobs_created,
                "count": len(jobs_created),
                "title": jobs_created[0]["title"] if len(jobs_created) == 1 else f"{len(jobs_created)} tracks"
            })
            return

        if path == "/api/record_all_presets":
            loop_count = int(data.get("loop_count", 2))
            
            def batch_runner():
                for band in PRESETS:
                    query = band["query"]
                    results = run_yt_search(query, limit=1)
                    if results:
                        top = results[0]
                        sub_job_id = uuid.uuid4().hex[:8]
                        with JOBS_LOCK:
                            JOBS[sub_job_id] = {
                                "id": sub_job_id,
                                "type": "record",
                                "title": f"{band['name']} - {top['title']}",
                                "url": top["url"],
                                "status": "queued",
                                "progress": 0,
                                "message": f"Starting download for {band['name']}...",
                                "created_at": time.time()
                            }
                        record_video_task(sub_job_id, top["url"], f"{band['name']} - {top['title']}", loop_count=loop_count)
                        time.sleep(1)

            threading.Thread(target=batch_runner, daemon=True).start()
            self.send_json({"status": "accepted", "message": "Batch recording of all 7 bands started in background."})
            return

        if path == "/api/create_looped_set":
            files = data.get("files", [])
            loop_count = int(data.get("loop_count", 2))
            set_name = data.get("name", "Epic_Heavy_Metal_Looped_Set")

            if not files:
                files = [p.name for p in MEDIA_DIR.glob("*.mp4") if "looped" not in p.name]

            if not files:
                self.send_json({"error": "No files available to compile into a looped set."}, status=HTTPStatus.BAD_REQUEST)
                return

            job_id = uuid.uuid4().hex[:8]
            with JOBS_LOCK:
                JOBS[job_id] = {
                    "id": job_id,
                    "type": "master_set",
                    "title": set_name,
                    "status": "queued",
                    "progress": 0,
                    "message": "Enqueued master set compilation...",
                    "created_at": time.time()
                }

            threading.Thread(
                target=build_master_looped_set_task,
                args=(job_id, files, loop_count, set_name),
                daemon=True
            ).start()

            self.send_json({"status": "accepted", "job_id": job_id})
            return

        self.send_error(HTTPStatus.NOT_FOUND, "Action not found")

    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        if path.startswith("/api/library/"):
            filename = urllib.parse.unquote(path[13:])
            filepath = (MEDIA_DIR / filename).resolve()
            if filepath.exists() and str(filepath).startswith(str(MEDIA_DIR.resolve())):
                try:
                    filepath.unlink()
                    meta = load_library_metadata()
                    if filename in meta:
                        del meta[filename]
                        save_library_metadata(meta)
                    self.send_json({"status": "deleted", "filename": filename})
                    return
                except Exception as e:
                    self.send_json({"error": str(e)}, status=HTTPStatus.INTERNAL_SERVER_ERROR)
                    return
            self.send_error(HTTPStatus.NOT_FOUND, "File not found")
            return
        self.send_error(HTTPStatus.NOT_FOUND)

    def serve_file(self, filepath, mime_type):
        try:
            with open(filepath, "rb") as f:
                content = f.read()
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", mime_type)
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)
        except Exception as e:
            self.send_error(HTTPStatus.INTERNAL_SERVER_ERROR, str(e))

    def serve_file_with_range(self, filepath, mime_type):
        """Streams media files handling HTTP 206 Partial Content Range requests."""
        file_size = os.path.getsize(filepath)
        range_header = self.headers.get("Range")

        if not range_header:
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", mime_type)
            self.send_header("Content-Length", str(file_size))
            self.send_header("Accept-Ranges", "bytes")
            self.end_headers()
            with open(filepath, "rb") as f:
                shutil.copyfileobj(f, self.wfile)
            return

        try:
            range_spec = range_header.strip().split("=")[1]
            parts = range_spec.split("-")
            start = int(parts[0]) if parts[0] else 0
            end = int(parts[1]) if parts[1] else file_size - 1
            if end >= file_size:
                end = file_size - 1
            length = end - start + 1
        except Exception:
            self.send_error(HTTPStatus.REQUESTED_RANGE_NOT_SATISFIABLE)
            return

        self.send_response(HTTPStatus.PARTIAL_CONTENT)
        self.send_header("Content-Type", mime_type)
        self.send_header("Content-Range", f"bytes {start}-{end}/{file_size}")
        self.send_header("Content-Length", str(length))
        self.send_header("Accept-Ranges", "bytes")
        self.end_headers()

        with open(filepath, "rb") as f:
            f.seek(start)
            remaining = length
            chunk_size = 64 * 1024
            while remaining > 0:
                read_amount = min(chunk_size, remaining)
                chunk = f.read(read_amount)
                if not chunk:
                    break
                self.wfile.write(chunk)
                remaining -= len(chunk)


class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True


def run_server(port=5050):
    server_address = ("", port)
    httpd = ThreadedHTTPServer(server_address, MusicPlayerHandler)
    print("=" * 60)
    print("  HEAVY METAL & SPACE ROCK YOUTUBE PLAYER & LOOPER")
    print(f"  Listening at http://localhost:{port}")
    print(f"  Media storage: {MEDIA_DIR}")
    print("=" * 60)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down player server...")
        httpd.server_close()


if __name__ == "__main__":
    port = 5050
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            pass
    run_server(port)
