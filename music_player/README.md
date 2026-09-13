# Chronicles of Iron & Cosmos: Heavy Metal & Space Rock YouTube Player & Looper

A specialized music and video player with YouTube search integration, automated high-definition MP4 recording, and seamless loop generation for swords & sorcery and space rock bands:

1. **The Gates of Slumber** (*Conqueror*, *Suffer No Guilt*) - Crushing epic doom metal
2. **Liege Lord** (*Master Control*, *Burn to My Touch*) - High-octane US power/speed metal
3. **Heir Apparent** (*Graceful Inheritance*, 1986 Debut) - Melodic progressive US power metal
4. **Manilla Road** (*Crystal Logic*, *Open the Gates*, *The Deluge*) - Pioneers of epic heavy metal
5. **Ironsword** (*None But the Brave*, *Overlords of Chaos*) - Robert E. Howard / Conan barbarian metal
6. **Brocas Helm** (*Defender of the Crown*, *Black Death*) - Cult epic heavy metal
7. **Hawkwind** (*Warrior on the Edge of Time*, *Space Ritual*) - Moorcock-collaborating space rock
8. **Bal-Sagoth** (*Starfire Burning Upon the Ice-Veiled Throne of Ultima Thule*) - Hyperborean symphonic metal
9. **Cirith Ungol** (*King of the Dead*, *Frost and Fire*) - Dark fantasy epic doom legends
10. **(Early) Blind Guardian** (*Battalions of Fear*, *Follow the Blind*, *Tales from the Twilight World*) - Speed metal Tolkien hymns
11. **Ashbury** (*Endless Skies*, 1983) - Cult proto-metal & fantasy folk rock
12. **Riot** (*Thundersteel*, *Fire Down Under*) - High-velocity US power & speed metal
13. **Omen** (*Battle Cry*, *Warning of Danger*) - Blood & iron sword & sorcery power metal
14. **Oracle** (*As Darkness Reigns*, 1989) - Cult progressive US power metal
15. **Heavy Load** (*Death or Glory*, *Stronger Than Evil*) - First Swedish heavy metal legends
16. **Attacker** (*Battle at Helm's Deep*, 1985) - High-speed Tolkien power metal
17. **Manowar** (*Into Glory Ride*, *Hail to England*, *Battle Hymns*) - Kings of True Heavy Metal

---

## Quick Start (Web Player)

### Option 1: One-Click Windows Launcher
Double-click:
```
music_player/run_player.bat
```
This boots the local server and automatically launches your browser to:
[http://localhost:5050](http://localhost:5050)

### Option 2: Command Line
```powershell
python music_player/server.py
```
Then navigate to `http://localhost:5050` in any web browser.

---

## Features & Controls

- **Curated 7-Band Shelf**: Single-click search and recording for all 7 target bands and key albums.
- **Dual Playback**:
  - **Offline Looped MP4 Vault**: Plays your downloaded files directly from disk with zero latency.
  - **YouTube Stream Preview**: Live stream preview before recording.
- **Triple Loop Modes**:
  - `🔂 Loop Track`: HTML5 seamless loop repeating the current track endlessly.
  - `🔁 Loop Set`: Continuously loops through your entire recorded playlist.
  - `➡️ No Loop`: Standard sequential playback.
- **MP4 Recording & Loop Generator**:
  - Downloads YouTube streams using `yt-dlp` in 720p/1080p H.264 + AAC.
  - Automatically creates seamless looped versions (e.g. 2x, 3x, 5x loop) using `ffmpeg -stream_loop`.
  - Applies faststart optimization for instant browser streaming and seeking.
- **⚔️ Master Looped Set Compiler**:
  - Click `Compile Master Looped Set` in the library to stitch all recorded MP4s into a single continuous master video using FFmpeg concat.
- **⚡ Batch Record All 7 Bands**:
  - One-click automated background downloader that fetches top albums/tracks for all 7 bands in sequence.

---

## Standalone Headless CLI (`record_looped_set.py`)

You can also download and generate looped MP4 sets directly from the terminal without opening the browser:

```powershell
# Record and loop all 7 bands automatically (3x loop each)
python music_player/record_looped_set.py --all --loop 3

# Record a specific band preset
python music_player/record_looped_set.py --band liege_lord --loop 3
python music_player/record_looped_set.py --band hawkwind --loop 2
python music_player/record_looped_set.py --band heir_apparent --loop 2

# Custom YouTube search query
python music_player/record_looped_set.py --query "The Gates of Slumber Suffer No Guilt full album" --loop 3

# Assemble all downloaded MP4s into a single master continuous looped video
python music_player/record_looped_set.py --concat --loop 2
```

---

## File Structure

- `server.py`: Local HTTP/REST backend handling search, downloads, looping, and byte-range video streaming.
- `record_looped_set.py`: Standalone CLI batch runner.
- `run_player.bat`: Windows quick launcher.
- `static/index.html`: Web player UI structure.
- `static/style.css`: Dark fantasy / heavy metal aesthetic styling.
- `static/app.js`: Interactive frontend player, YouTube search, and job polling.
- `media/`: Local storage for recorded MP4s, looped sets, and `library.json` metadata.
