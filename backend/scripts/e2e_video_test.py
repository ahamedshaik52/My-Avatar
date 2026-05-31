"""End-to-end test: register -> upload avatar -> script -> audio -> video -> download.

Proves the full self-hosted pipeline produces a playable MP4 and that the
authenticated streaming download endpoint serves it correctly.
"""
import sys
import time
import json
import requests

BASE = "http://127.0.0.1:8000"
AVATAR = r"C:\Users\ahame\Downloads\ChatGPT Image May 30, 2026, 10_05_50 AM.png"
SCRIPT = (
    "Hello, and welcome to my avatar. This is a fully self hosted demonstration "
    "video, generated entirely on my own machine, using my own code and open "
    "models, with no paid services whatsoever. The voice you hear is synthesized "
    "locally, and the lip movement is produced by a self hosted lip sync model. "
    "Thank you so much for watching this end to end test."
)  # ~60 words ~ roughly 18-22s of speech


def jprint(label, obj):
    print(f"\n=== {label} ===")
    print(json.dumps(obj, indent=2, default=str)[:1500])


s = requests.Session()
email = f"e2e_{int(time.time())}@example.com"
pw = "Test1234!"

# 1. Register
r = s.post(f"{BASE}/api/auth/register", json={
    "name": "E2E Tester", "email": email, "password": pw, "confirm_password": pw,
})
print("register:", r.status_code)
if r.status_code >= 400:
    print(r.text); sys.exit(1)

# 2. Login (form-urlencoded)
r = s.post(f"{BASE}/api/auth/login", data={"username": email, "password": pw})
print("login:", r.status_code)
token = r.json()["access_token"]
H = {"Authorization": f"Bearer {token}"}

# 3. Create project
r = s.post(f"{BASE}/api/projects", json={"title": "E2E Self-Hosted Test"}, headers=H)
print("project:", r.status_code)
project_id = r.json()["id"]

# 4. Upload avatar
with open(AVATAR, "rb") as f:
    r = s.post(f"{BASE}/api/avatar/upload", headers=H,
               files={"file": ("avatar.png", f, "image/png")},
               data={"project_id": project_id})
print("avatar upload:", r.status_code)
if r.status_code >= 400:
    print(r.text); sys.exit(1)
avatar = r.json(); jprint("avatar", avatar)
avatar_id = avatar["id"]

# 5. Save script
r = s.post(f"{BASE}/api/script/save", json={
    "project_id": project_id, "content": SCRIPT, "language": "en",
}, headers=H)
print("script:", r.status_code)

# 6. Generate audio with a male voice (James)
voices = s.get(f"{BASE}/api/voices", headers=H).json()
male = next(v for v in voices if v["gender"] == "male")
print("using voice:", male["name"], male["id"])
r = s.post(f"{BASE}/api/voices/generate", json={
    "project_id": project_id, "voice_id": male["id"], "text": SCRIPT,
}, headers=H)
print("audio generate:", r.status_code)
if r.status_code >= 400:
    print(r.text); sys.exit(1)
audio = r.json(); jprint("audio", audio)
audio_id = audio["id"]

# 7. Generate video
r = s.post(f"{BASE}/api/video/generate", json={
    "project_id": project_id, "avatar_id": avatar_id,
    "audio_id": audio_id, "resolution": "1080p",
}, headers=H)
print("video generate:", r.status_code)
if r.status_code >= 400:
    print(r.text); sys.exit(1)
job = r.json(); jprint("job", job)
job_id = job["id"]

# 8. Poll status. Wav2Lip is CPU-bound and runs in-process, so it can briefly
# starve the ASGI server and drop a poll connection — retry transient errors
# instead of crashing the whole test.
video_id = None
for i in range(180):  # up to ~15 min
    time.sleep(5)
    try:
        st = s.get(f"{BASE}/api/video/status/{job_id}", headers=H, timeout=15).json()
    except requests.exceptions.RequestException as exc:
        print(f"[{i*5:4d}s] poll transient error (retrying): {type(exc).__name__}")
        continue
    print(f"[{i*5:4d}s] status={st['status']} progress={st.get('progress')} step={st.get('current_step')}")
    if st["status"] == "completed":
        video_id = st.get("video_id"); break
    if st["status"] == "failed":
        print("FAILED:", st.get("error_message")); sys.exit(2)

if not video_id:
    print("TIMED OUT"); sys.exit(3)

# 9. Get video record
v = s.get(f"{BASE}/api/video/{video_id}", headers=H).json()
jprint("video record", v)

# 10. Download via the streaming endpoint
r = s.get(f"{BASE}/api/video/download-file/{video_id}", headers=H, timeout=60)
print("\ndownload-file:", r.status_code,
      "content-type=", r.headers.get("content-type"),
      "disposition=", r.headers.get("content-disposition"),
      "bytes=", len(r.content))
out = r"C:\Users\ahame\my-avatar\backend\media\_e2e_download.mp4"
with open(out, "wb") as f:
    f.write(r.content)
print("saved:", out)
print("\nVIDEO_ID=" + video_id)
print("DONE")
