#!/usr/bin/env python3
"""
CLI Batch Recorder & Looper for Heavy Metal & Space Rock Bands:
  1. The Gates of Slumber
  2. Liege Lord
  3. Heir Apparent (Graceful Inheritance - 1986)
  4. Manilla Road
  5. Ironsword
  6. Brocas Helm
  7. Hawkwind
"""

import os
import sys
import uuid
import json
import time
import shutil
import argparse
import subprocess
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_MEDIA_DIR = BASE_DIR / "media"
DEFAULT_MEDIA_DIR.mkdir(parents=True, exist_ok=True)

NODE_PATH = r"D:\Code\nodejs\node.exe"
if not os.path.exists(NODE_PATH):
    NODE_PATH = "node"

TARGET_BANDS = [
    {
        "id": "gates_of_slumber",
        "name": "The Gates of Slumber",
        "query": "The Gates of Slumber Conqueror full album",
        "default_title": "The Gates of Slumber - Conqueror"
    },
    {
        "id": "liege_lord",
        "name": "Liege Lord",
        "query": "Liege Lord Master Control full album",
        "default_title": "Liege Lord - Master Control"
    },
    {
        "id": "heir_apparent",
        "name": "Heir Apparent",
        "query": "Heir Apparent Graceful Inheritance full album 1986",
        "default_title": "Heir Apparent - Graceful Inheritance (1986)"
    },
    {
        "id": "manilla_road",
        "name": "Manilla Road",
        "query": "Manilla Road Crystal Logic full album",
        "default_title": "Manilla Road - Crystal Logic"
    },
    {
        "id": "ironsword",
        "name": "Ironsword",
        "query": "Ironsword None But the Brave full album",
        "default_title": "Ironsword - None But the Brave"
    },
    {
        "id": "brocas_helm",
        "name": "Brocas Helm",
        "query": "Brocas Helm Defender of the Crown full album",
        "default_title": "Brocas Helm - Defender of the Crown"
    },
    {
        "id": "hawkwind",
        "name": "Hawkwind",
        "query": "Hawkwind Warrior on the Edge of Time full album",
        "default_title": "Hawkwind - Warrior on the Edge of Time"
    },
    {
        "id": "bal_sagoth",
        "name": "Bal-Sagoth",
        "query": "Bal-Sagoth Starfire Burning Upon the Ice-Veiled Throne of Ultima Thule full album",
        "default_title": "Bal-Sagoth - Starfire Burning"
    },
    {
        "id": "cirith_ungol",
        "name": "Cirith Ungol",
        "query": "Cirith Ungol King of the Dead full album",
        "default_title": "Cirith Ungol - King of the Dead"
    },
    {
        "id": "blind_guardian_early",
        "name": "(Early) Blind Guardian",
        "query": "Blind Guardian Battalions of Fear full album",
        "default_title": "Blind Guardian - Battalions of Fear (1988)"
    },
    {
        "id": "ashbury",
        "name": "Ashbury",
        "query": "Ashbury Endless Skies full album 1983",
        "default_title": "Ashbury - Endless Skies (1983)"
    },
    {
        "id": "riot",
        "name": "Riot",
        "query": "Riot Thundersteel full album",
        "default_title": "Riot - Thundersteel"
    },
    {
        "id": "omen",
        "name": "Omen",
        "query": "Omen Battle Cry full album 1984",
        "default_title": "Omen - Battle Cry (1984)"
    },
    {
        "id": "oracle",
        "name": "Oracle",
        "query": "Oracle As Darkness Reigns full album 1989",
        "default_title": "Oracle - As Darkness Reigns (1989)"
    },
    {
        "id": "heavy_load",
        "name": "Heavy Load",
        "query": "Heavy Load Death or Glory full album",
        "default_title": "Heavy Load - Death or Glory"
    },
    {
        "id": "attacker",
        "name": "Attacker",
        "query": "Attacker Battle at Helms Deep full album 1985",
        "default_title": "Attacker - Battle at Helm's Deep (1985)"
    },
    {
        "id": "manowar",
        "name": "Manowar",
        "query": "Manowar Into Glory Ride full album",
        "default_title": "Manowar - Into Glory Ride"
    }
]


def sanitize(name):
    return "".join(c for c in name if c.isalnum() or c in (" ", "-", "_", ".", "(", ")")).strip()[:100]


def check_tools():
    missing = []
    if not shutil.which("yt-dlp"):
        missing.append("yt-dlp")
    if not shutil.which("ffmpeg"):
        missing.append("ffmpeg")
    if missing:
        print(f"[ERROR] Required tool(s) not found in PATH: {', '.join(missing)}")
        sys.exit(1)


def search_first_video(query):
    is_direct = query.startswith("http://") or query.startswith("https://") or "youtube.com/" in query or "youtu.be/" in query
    if is_direct:
        print(f"  -> Inspecting YouTube URL: '{query}'...")
        cmd = [
            "yt-dlp",
            "--js-runtimes", f"node:{NODE_PATH}",
            "--no-update",
            "--dump-json",
            "--no-playlist",
            query
        ]
    else:
        print(f"  -> Searching YouTube for: '{query}'...")
        cmd = [
            "yt-dlp",
            "--js-runtimes", f"node:{NODE_PATH}",
            "--no-update",
            "--dump-json",
            "--flat-playlist",
            f"ytsearch1:{query}"
        ]
    proc = subprocess.run(cmd, capture_output=True, text=True, errors="replace")
    for line in proc.stdout.strip().split("\n"):
        if not line:
            continue
        try:
            data = json.loads(line)
            vid = data.get("id") or data.get("url")
            title = data.get("title") or query
            if vid:
                return {
                    "id": vid,
                    "title": title,
                    "url": f"https://www.youtube.com/watch?v={vid}"
                }
        except Exception:
            continue
    return None


def record_and_loop_video(url, title, loop_count=3, media_dir=DEFAULT_MEDIA_DIR):
    media_dir = Path(media_dir)
    safe_title = sanitize(title)
    unique = uuid.uuid4().hex[:6]
    raw_file = media_dir / f"{safe_title}_{unique}_raw.mp4"
    std_file = media_dir / f"{safe_title}_{unique}.mp4"
    looped_file = media_dir / f"{safe_title}_{unique}_looped_{loop_count}x.mp4"

    print(f"\n[RECORDING] {title}")
    print(f"  URL: {url}")
    print(f"  Downloading video & audio as MP4...")

    dl_cmd = [
        "yt-dlp",
        "--js-runtimes", f"node:{NODE_PATH}",
        "--no-update",
        "--no-playlist",
        "--format", "bestvideo[vcodec^=avc1][ext=mp4]+bestaudio[acodec^=mp4a]/bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
        "--merge-output-format", "mp4",
        "-o", str(raw_file),
        url
    ]

    res = subprocess.run(dl_cmd, capture_output=True, text=True, errors="replace")
    if res.returncode != 0 or not raw_file.exists():
        dl_fb = [
            "yt-dlp",
            "--js-runtimes", f"node:{NODE_PATH}",
            "--no-update",
            "--no-playlist",
            "-f", "mp4",
            "-o", str(raw_file),
            url
        ]
        res_fb = subprocess.run(dl_fb, capture_output=True, text=True, errors="replace")
        if res_fb.returncode != 0 or not raw_file.exists():
            print(f"  [FAIL] Failed to download {title}")
            return None

    # Apply faststart for instant streaming/playback
    print(f"  Applying faststart optimization...")
    ff_std = [
        "ffmpeg", "-y",
        "-i", str(raw_file),
        "-c", "copy",
        "-movflags", "+faststart",
        str(std_file)
    ]
    subprocess.run(ff_std, capture_output=True)
    if not std_file.exists():
        raw_file.rename(std_file)
    else:
        try:
            raw_file.unlink()
        except Exception:
            pass

    # Create looped copy if loop_count > 1
    if loop_count > 1:
        print(f"  Generating {loop_count}x looped MP4 set...")
        ff_loop = [
            "ffmpeg", "-y",
            "-stream_loop", str(loop_count - 1),
            "-i", str(std_file),
            "-c", "copy",
            "-movflags", "+faststart",
            str(looped_file)
        ]
        res_loop = subprocess.run(ff_loop, capture_output=True)
        if res_loop.returncode != 0 or not looped_file.exists():
            # Fallback re-encode
            ff_loop_re = [
                "ffmpeg", "-y",
                "-stream_loop", str(loop_count - 1),
                "-i", str(std_file),
                "-c:v", "libx264", "-preset", "ultrafast",
                "-c:a", "aac",
                "-movflags", "+faststart",
                str(looped_file)
            ]
            subprocess.run(ff_loop_re, capture_output=True)

        if looped_file.exists():
            print(f"  [SUCCESS] Looped file created: {looped_file.name} ({round(looped_file.stat().st_size / (1024*1024), 2)} MB)")
            return str(looped_file)

    print(f"  [SUCCESS] Single track created: {std_file.name} ({round(std_file.stat().st_size / (1024*1024), 2)} MB)")
    return str(std_file)


def create_master_looped_set(media_dir=DEFAULT_MEDIA_DIR, loop_count=2, out_name="Master_Looped_Set"):
    media_dir = Path(media_dir)
    # Collect all standalone mp4 files (excluding existing looped sets)
    candidates = [p for p in media_dir.glob("*.mp4") if "looped" not in p.name and "concat" not in p.name]
    if not candidates:
        # If no standalone, take whatever mp4s are present
        candidates = [p for p in media_dir.glob("*.mp4") if "concat" not in p.name and out_name not in p.name]

    if not candidates:
        print("[ERROR] No MP4 files found in media folder to assemble into a looped set.")
        return None

    print(f"\n[ASSEMBLING MASTER LOOPED SET] ({len(candidates)} tracks, {loop_count}x loop)")
    out_file = media_dir / f"{sanitize(out_name)}_{uuid.uuid4().hex[:6]}.mp4"
    txt_file = media_dir / f"concat_{uuid.uuid4().hex[:6]}.txt"

    with open(txt_file, "w", encoding="utf-8") as f:
        for c in candidates:
            clean_path = str(c.resolve()).replace("\\", "/")
            f.write(f"file '{clean_path}'\n")

    cmd = [
        "ffmpeg", "-y",
        "-stream_loop", str(max(0, loop_count - 1)),
        "-f", "concat",
        "-safe", "0",
        "-i", str(txt_file),
        "-c", "copy",
        "-movflags", "+faststart",
        str(out_file)
    ]
    res = subprocess.run(cmd, capture_output=True)
    try:
        txt_file.unlink()
    except Exception:
        pass

    if res.returncode != 0 or not out_file.exists():
        # Fallback re-encode
        print("  Re-encoding during concat for uniform stream compatibility...")
        cmd_re = [
            "ffmpeg", "-y",
            "-stream_loop", str(max(0, loop_count - 1)),
            "-f", "concat",
            "-safe", "0",
            "-i", str(txt_file),
            "-c:v", "libx264", "-preset", "veryfast",
            "-c:a", "aac",
            "-movflags", "+faststart",
            str(out_file)
        ]
        subprocess.run(cmd_re, capture_output=True)

    if out_file.exists():
        print(f"  [SUCCESS] Master Looped Set compiled: {out_file.name} ({round(out_file.stat().st_size / (1024*1024), 2)} MB)")
        return str(out_file)
    else:
        print("  [FAIL] Failed to build master looped set.")
        return None


def main():
    parser = argparse.ArgumentParser(description="Heavy Metal & Space Rock YouTube Looped MP4 Batch Recorder")
    parser.add_argument("--all", action="store_true", help="Record and loop all 7 target bands automatically")
    parser.add_argument("--band", type=str, help="Record a specific band (e.g. 'liege_lord', 'hawkwind', 'heir_apparent')")
    parser.add_argument("--query", type=str, help="Custom YouTube search query")
    parser.add_argument("--loop", type=int, default=3, help="Number of times to loop the MP4 (default: 3)")
    parser.add_argument("--concat", action="store_true", help="Concatenate all recorded MP4s into a single master looped set")
    parser.add_argument("--media-dir", type=str, default=str(DEFAULT_MEDIA_DIR), help="Output directory for MP4 files")

    args = parser.parse_args()
    check_tools()

    print("==================================================================")
    print("  HEAVY METAL & SPACE ROCK YOUTUBE LOOPED MP4 RECORDER")
    print(f"  Media Directory: {args.media_dir}")
    print(f"  Loop Repetitions: {args.loop}x")
    print("==================================================================")

    if args.all:
        print(f"Recording all 7 bands ({len(TARGET_BANDS)} items)...")
        recorded = []
        for band in TARGET_BANDS:
            print(f"\n--- Processing: {band['name']} ---")
            item = search_first_video(band["query"])
            if item:
                out = record_and_loop_video(item["url"], f"{band['name']} - {item['title']}", loop_count=args.loop, media_dir=args.media_dir)
                if out:
                    recorded.append(out)
            else:
                print(f"  No YouTube results found for '{band['query']}'.")
            time.sleep(1)

        print("\nAll 7 bands processed!")
        if args.concat or True:
            create_master_looped_set(media_dir=args.media_dir, loop_count=2, out_name="Seven_Bands_Master_Looped_Set")
        return

    if args.band:
        target = next((b for b in TARGET_BANDS if b["id"] == args.band.lower() or b["name"].lower() == args.band.lower()), None)
        if not target:
            print(f"Band '{args.band}' not found in presets. Known presets: {', '.join(b['id'] for b in TARGET_BANDS)}")
            return
        item = search_first_video(target["query"])
        if item:
            record_and_loop_video(item["url"], f"{target['name']} - {item['title']}", loop_count=args.loop, media_dir=args.media_dir)
        return

    if args.query:
        item = search_first_video(args.query)
        if item:
            record_and_loop_video(item["url"], item["title"], loop_count=args.loop, media_dir=args.media_dir)
        return

    if args.concat:
        create_master_looped_set(media_dir=args.media_dir, loop_count=args.loop)
        return

    parser.print_help()


if __name__ == "__main__":
    main()
