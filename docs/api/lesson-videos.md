# Lesson videos: stored picks (backend spec)

**Goal:** each app lesson plays one stored, curated YouTube video. The app stops searching YouTube itself, so it uses no daily quota. The coach AI picks the videos, using the OpenRouter key that is already on the backend. Admins can override any pick.

**Lesson key:** the app's lessons are bundled in the app. Each one has a stable id, which is the key everywhere below: for example `clip-01` or `yt-12` (prefixes `clip`, `gbp`, `gen`, `men`, `yt`, `afl`, `crl`, `dpl`), 197 in total across all journeys. These ids are not backend `Lesson.id`s.

## Storage

Table `lesson_videos`:

| column | type | notes |
|---|---|---|
| `lessonKey` | text PK | the app lesson id, for example `clip-01` |
| `videoId` | text | YouTube id |
| `title`, `channelTitle`, `thumbnailUrl` | text | snapshot from YouTube |
| `durationSeconds` | int | |
| `source` | enum `ai` \| `admin` | `admin` = picked or pasted by a human; the AI never replaces these |
| `reason` | text null | the AI's one-line justification |
| `pickedAt`, `checkedAt` | timestamptz | `checkedAt` = last time the AI re-checked for something better |

## App endpoint

`GET /api/v1/lesson-videos` (access-token). Honors `videos.enabled`: when it is off, return `403 VIDEOS_DISABLED`.

```json
{ "data": { "clip-01": { "videoId": "abc", "title": "...", "channelTitle": "...", "thumbnailUrl": "...", "durationSeconds": 561 } } }
```

- Return all rows (~200, small).
- Set `Cache-Control: max-age=3600`.
- The app fetches it once per launch.

## Admin endpoints (permission `content:write`)

- `GET /api/v1/admin/lesson-videos`: all rows, including `source`, `reason` and `checkedAt`.
- `PUT /api/v1/admin/lesson-videos/{lessonKey}` with `{ "url": "https://youtu.be/..." }`:
  - Sets the video by hand with `source=admin`.
  - Returns `400 INVALID_VIDEO_URL` for a bad link.
- `DELETE /api/v1/admin/lesson-videos/{lessonKey}`: clears the video. The AI may then pick again.
- `POST /api/v1/admin/lesson-videos/{lessonKey}/ai-pick` with body `{ "lesson": { "title", "category", "summary", "learn": [] }, "force": false }`:
  - Runs the AI pick below.
  - Returns `{ picked, reason, query, considered, replaced }`.
  - Use `force: true` to replace an `admin` row too.

## AI pick (server side, OpenRouter)

1. **Search.** Run YouTube `search.list` for `"<title> <category> tutorial for beginners"` with `type=video`, `videoDuration=medium` (4–20 min), `relevanceLanguage=en` and `maxResults=10`. Then call `videos.list` to get durations and descriptions. That costs about 101 quota units.
2. **Drop clearly unsuitable videos before asking the model:**
   - shorter than 3 min or longer than 30 min
   - channels ending in " - Topic", VEVO, or named "Records"/"Music"
   - titles containing music, mix, lyrics, lofi, beats, playlist, ambient, relaxing, sleep, song, album, official audio/video, asmr
3. **Ask the model.** If a video is already stored, include it as candidate 0 marked "current". The model returns `{choice, reason, searchQuery}`. Use this system prompt (same as the admin dashboard):

   > You pick the single best YouTube video to accompany a lesson in an app that coaches beginners to their first revenue online. Judge on: how directly it teaches this lesson's exact skill; practical step-by-step value a beginner can act on today; credible creator (no get-rich-quick hype, fake gurus, income screenshots); reasonably current; 5–25 min ideal. Never pick music, songs, mixes, ambient/lo-fi tracks, or anything that is not a person explaining the skill. Keep the current video unless a candidate is clearly better. If none fits, return choice -1 with a better searchQuery.

4. **Retry once if nothing fits.** If `choice` is -1, search once with the model's `searchQuery`, then ask again.
5. **Store the result.** Save the winner with `source=ai` and set `checkedAt=now`.

## Daily refresh job (keeps picks good within quota)

- **When:** run once a day.
- **Which lessons:** take up to `videos.dailyRefreshBudget` lessons, a new setting with default 30, which is about 3,000 of the 10,000 daily units. Lessons with no video come first, then the oldest `checkedAt`.
- **What it does:** run the AI pick on each one. Never touch `source=admin` rows.
- **Stop early:** when YouTube returns `quotaExceeded`.

**Result:** all ~200 lessons get filled within about a week. After that, each lesson is re-checked for a better video roughly once a month. The app itself spends 0 quota.
