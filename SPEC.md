# Expansions — spec (prototype v1)

Status: draft for David and Chloe to review. Date: 25 October 2026.

Items marked **[default]** are Claude's choices where the brief didn't say. Comment on any you'd like changed.

## 1. What it is

An iPad web app for practising algebraic expansion at GCSE (Year 11) level. You install it on the home screen from a web address (https). It's built to be quick to open, with sessions of 10–20 minutes, using Apple Pencil or a finger.

- Name: **Expansions**
- Main user: Chloe. Friends can use it on their own iPads, and each iPad keeps its own history.
- Design: simple and crisp, with a yellow accent. Light or dark follows the iPad's setting. No sound.

## 2. Screens

The app has four screens.

### 2.1 Menu (home)

- The title "Expansions", with the current streak beside it (e.g. "3-day streak").
- One card per level, in a column:
  - Level name and an example question.
  - Two buttons: **Practise** and **Timed**.
  - Your personal best time, if you have one.
  - A locked level is greyed out with a lock and the words "Get 10/10 on Level N to unlock".
- A **History** button.

### 2.2 Question

- **Top bar:**
  - Quit (×), which asks "Quit this set? This set won't be saved."
  - "Level 1 · Question 3 of 10".
  - Score so far.
  - A stopwatch, in timed mode only.
- **Question:** large and centred, e.g. (x + 3)(x − 4).
- **Scratchpad** (most of the screen):
  - You can write with Pencil or finger.
  - Tools: pen, eraser, undo, redo and clear, plus three ink colours (black or white to match the theme, blue, red).
  - It's wiped at each new question and never saved.
- **Answer area** (bottom):
  - **Preview line:** "I read: x² − x − 12", updated as you type or write. This lets you check the app has read your answer properly.
  - **Answer box:** takes Scribble or typing.
  - **Keypad:** 0–9, x, +, −, the powers ² ³ ⁴, delete and clear. **[default]** The keypad replaces the iPad keyboard, so the keyboard doesn't cover the scratchpad. A keyboard button brings the iPad keyboard up if you want it.
  - **Check** button.
- **After Check:** the answer area shows the result and a **Next** button (section 4.5).

### 2.3 Results (end of set)

- The score in large type, e.g. 8½/10. Confetti on 10/10.
- In timed mode: the time, and "New personal best!" if you beat it.
- "Level 2 unlocked!" when that happens.
- Any badges earned in this set.
- A list of the 10 questions, each with your final answer and the mark.
- Buttons: **Back up to iCloud Drive**, **Try again** and **Menu**.

### 2.4 History

- **Stats row:** current streak, best streak and sets completed.
- **Personal bests:** the fastest timed 10/10 for each level.
- **Badges:** a grid; unearned badges show greyed out.
- **Sets:** a list, newest first. Each shows date and time, level, mode, score, and time if it was timed.
- **Restore from backup** at the bottom (section 6.3).

## 3. Questions

### 3.1 Levels

| Level | Type | Example | Answer |
|---|---|---|---|
| 1 | linear × linear | (x + 3)(x − 4) | x² − x − 12 |
| 2 | linear × quadratic | (2x − 5)(x² + 3x − 20) | 2x³ + x² − 55x + 100 |
| 3 | quadratic × quadratic | (x² + 3x + 2)(x² + 3x + 2) | x⁴ + 6x³ + 13x² + 12x + 4 |

- More question types will be added above Level 3 later.

### 3.2 Number rules

- The only letter is x.
- **Coefficients:** whole numbers from −10 to 10.
  - A coefficient of 0 means the term isn't shown. You never see "0x".
- **Large numbers:** ±12, ±15 or ±20 appear in about 1 question in 5, at most one per question.
  - They're only ever the plain number at the end of a bracket, never in front of x.
- **Number in front of x or x² (the leading coefficient)** **[default]**:
  - It's 1 about half the time, otherwise 2–5.
  - It's negative in about 1 question in 10.
- **Bracket shapes:**
  - A linear bracket always has both terms, e.g. (2x − 5), never (2x).
  - A quadratic bracket always has x², plus at least one other term, e.g. (x² + 5) or (x² + 3x).
- Terms are allowed to cancel when it happens naturally, e.g. (x + 3)(x − 3) = x² − 9.
- The same question never appears twice in one set.

### 3.3 Unlocking levels

- Level 1 is unlocked from the start.
- A **Practise** set scoring 10/10 unlocks the next level.
- 10/10 means every question fully right on the first attempt.
- You can only pick unlocked levels.

## 4. Answering and marking

### 4.1 What you can enter

Accepted characters:
- Digits and x (a capital X is read as x).
- Plus, and minus in any form (hyphen, − or –).
- Powers written as ² ³ ⁴ or ^2 ^3 ^4.
- Spaces, which are ignored.

### 4.2 Rejected before marking (a hint is shown and no attempt is used)

| You wrote | Hint |
|---|---|
| 1x, 1x², −1x | Write x, not 1x |
| x^1 | Write x, not x¹ |
| + −3x, − −3x, ++ | Use one sign: write − 3x, not + −3x |
| 0x, 0x², + 0 | Leave out terms that are 0 |
| x2 (power written as a normal digit) | Use the power button: x², not x2 |
| + at the very start **[default]** | No + needed at the start |
| brackets, =, ×, letters other than x, anything else unreadable | Write just the expanded answer |

### 4.3 How an answer is marked

The app adds up the terms for each power and compares the totals with the correct answer.

| Result | Marks on first attempt |
|---|---|
| Correct, collected, powers in descending order | 1 |
| Correct and collected, but powers in a different order | 1, with the tip "Write powers from highest to lowest" |
| Correct total, but like terms not collected (a power appears more than once) | ½, with the tip "Collect like terms" |
| Wrong | One retry (section 4.4) |

### 4.4 The retry

- After a wrong answer you get one more attempt.
- On the retry:
  - right (in any order): ½
  - not collected: ½
  - wrong: 0
- After a second wrong answer, the worked solution is shown (section 4.5).
- A set's score is the total of its marks, in halves, out of 10.

### 4.5 Worked solution

The worked solution uses the grid method. For (x + 3)(x − 4):

|    | x  | −4  |
|----|----|-----|
| x  | x² | −4x |
| +3 | 3x | −12 |

Then: x² − 4x + 3x − 12 = **x² − x − 12**

The same layout is used with bigger grids for Levels 2 (2 × 3) and 3 (3 × 3).

## 5. Timed mode

- A stopwatch starts when the first question appears and stops when the tenth is marked.
- Marking and retries are the same as in Practise.
- Your personal best is the fastest timed 10/10 for each level.
- **[default]** Timed sets count towards streaks and badges, but don't unlock levels.

## 6. Progress, streaks and storage

### 6.1 Streaks

- A streak is the number of calendar days in a row with at least one finished set. Any mode and any score counts.
- Days follow the iPad's local time.
- Today's streak isn't broken until a whole day is missed.
- A quit set doesn't count.

### 6.2 Badges [default list]

| Badge | Earned when |
|---|---|
| First steps | First finished set |
| Perfect | First 10/10 |
| Level 2 | Level 2 unlocked |
| Level 3 | Level 3 unlocked |
| On a roll | 3-day streak |
| Week strong | 7-day streak |
| Unstoppable | 30-day streak |
| Against the clock | First timed 10/10 |
| Century | 100 questions fully right first time, across all sets |

### 6.3 Storage and backup

- History is kept on the iPad as one JSON document:
  - `version`
  - `unlockedLevel`
  - `sets`: each has start and end times, level, mode, score, duration and whether it was 10/10
  - `badges`: each has a badge id and the date earned
- Streaks and personal bests are worked out from `sets` when needed, not stored separately.
- **Backup:** after every set, the results screen offers **Back up to iCloud Drive**.
  - It opens the iPad share sheet with the file `expansions-backup-YYYY-MM-DD.json`, and you choose Save to Files → iCloud Drive.
  - You can skip it.
- **Restore:** on the History screen, pick a backup file.
  - It's checked first, then it replaces the current history after you confirm.
- **Use the home-screen icon.** The home-screen app and a Safari tab keep separate histories, so always open it from the icon.
- I believe home-screen web apps are exempt from Safari's rule that clears unused site data after 7 days. **UNVERIFIED:** confirm by leaving the app unopened for more than 7 days on the iPad. Backups protect against it either way.

## 7. Look and feel

- **Font:** the iPad's system font. Powers are shown as proper superscripts and minus as a true "−".
- **Colours:**
  - Light: white background, near-black text.
  - Dark: near-black background, light text.
  - Both use a yellow accent for main buttons and highlights, with dark text on yellow so it's easy to read.
- **Layout:**
  - Large tap targets.
  - Works in portrait and landscape.
  - No clutter: one main action per screen.
- **Effects:** confetti on 10/10. A small badge pop-up when you earn one.

## 8. Technical approach

- **Code:** plain HTML, CSS and JavaScript, with no framework and no build step.
  - The maths logic (question generator, answer reader and marker, streak and best-time calculations) goes in separate modules with no screen code, so it can be tested on its own.
- **Home-screen app:**
  - A web app manifest gives the icon and full-screen launch.
  - A service worker lets it run offline after the first load.
- **Hosting:**
  - A public GitHub repository, `git-hub-user-888/expansions`, served by GitHub Pages at `https://git-hub-user-888.github.io/expansions/`.
  - No NAS3 remote.
  - No personal data goes in the repository.
- **Tests:**
  - Node's built-in test runner (`node --test`), with no extra packages.
  - Dates in tests come from the date functions, never fixed timestamps, and include a daylight-saving change for streaks.

## 9. Marker tests (replaces "try to fool the marker")

Each row becomes an automated test. Rows 1–19 use the question (x + 3)(x − 4), correct answer x² − x − 12, unless stated.

| # | Answer entered | Expected |
|---|---|---|
| 1 | x^2-x-12 | 1 mark |
| 2 | x²−x−12 (superscript, true minus) | 1 mark |
| 3 | ` x ^ 2 - x - 12 ` (extra spaces) | 1 mark |
| 4 | X^2–X–12 (capital X, en dash) | 1 mark |
| 5 | -x-12+x^2 | 1 mark + order tip |
| 6 | x^2+3x-4x-12 | ½ (not collected) |
| 7 | x^2-x-12-12+12 | ½ (not collected) |
| 8 | x^2-1x-12 | rejected: "Write x, not 1x" |
| 9 | x^2-x^1-12 | rejected: "Write x, not x¹" |
| 10 | x^2+-x-12 | rejected: one sign |
| 11 | x^2-x-12+0x | rejected: leave out 0 terms |
| 12 | x2-x-12 | rejected: use the power button |
| 13 | +x^2-x-12 | rejected: no + at start |
| 14 | (x+3)(x-4) | rejected: write just the expanded answer |
| 15 | x^2-x-12= | rejected: write just the expanded answer |
| 16 | x^2+x-12 (sign error) | wrong |
| 17 | x^2-x+12 | wrong |
| 18 | x^2-12 (missing term) | wrong |
| 19 | x^2 × x - 12 | rejected: unreadable |
| 20 | (x+3)(x−3): x^2-9 | 1 mark |
| 21 | (x+3)(x−3): x^2+3x-3x-9 | ½ (not collected) |
| 22 | (x+3)(x−3): x^2+0x-9 | rejected: leave out 0 terms |
| 23 | (2x−5)(x²+3x−20): 2x^3+x^2-55x+100 | 1 mark |
| 24 | (2x−5)(x²+3x−20): 2x^3+1x^2-55x+100 | rejected: "Write x², not 1x²" |
| 25 | (2x−5)(x²+3x−20): 2x^3+6x^2-5x^2-55x+100 | ½ (not collected) |

**Flow tests:**
- A wrong answer, then a right one, scores ½.
- A wrong answer, then a not-collected one, scores ½.
- Two wrong answers score 0 and show the worked solution.
- A rejected entry doesn't use up an attempt.
- 10 × 1 mark unlocks the next level; 9½ doesn't.
- A timed 10/10 doesn't unlock a level.

**Generator tests** (1,000 generated questions per level):
- Every answer matches multiplying out the brackets.
- No 0 coefficients are shown.
- Bracket shapes follow section 3.2.
- 12, 15 or 20 appears in 15–25% of questions, and never in front of x.
- No question repeats within a set.

## 10. How it will be checked

1. All automated tests pass (the count will be reported).
2. Run it in Safari on the iPad simulator: complete a Practise set and a Timed set, check unlocking, and save and restore a backup.
3. Publish to GitHub Pages. You then add it to Chloe's iPad home screen and test with Pencil.

## 11. Not in v1

- More question types above Level 3.
- Progress charts.
- Several users on one iPad.
- Saving scratchpad working.
- Automatic iCloud sync.
- Sound.
- A native App Store app.
