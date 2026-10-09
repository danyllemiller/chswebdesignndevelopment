# Prompt: Build the Guided Notebook (Word Doc) for WD1 and WD2

Paste the Master Prompt once, then paste the matching Course Brief (WD1 or WD2) right after it.
Run the whole thing twice — once per course — since these produce two separate Word documents.

Attach **both** of these files to the session:
- `curriculum/wd-daily-agenda-full.json` — the complete, authoritative day-by-day content: every real
  lesson day for both courses (96 WD1 days, 107 WD2 days — including Boot Camp, the capstones, and the
  28-day Agency Studio sprints, none of which exist anywhere else as structured data). This is the
  primary content source.
- `admin/lesson-plan-binder.html` — secondary. Its day-by-day detail is incomplete (only 77 of 96 WD1
  days and 72 of 107 WD2 days are written out there; capstones are one paragraph, and Boot Camp/the
  Agency Studio aren't in it at all), so don't rely on it for per-day content. Use it only for each
  chapter's overview block: duration, standards, CFA date, and the "Instructional Strategies Used This
  Chapter" box.

---

## THE MASTER PROMPT

> You are building a printable student "Guided Notebook" in Microsoft Word for a Nevada high school
> Web Design and Development course. This is a physical consumable workbook students fill in by hand,
> one page per real lesson day, built entirely from two real source files (attached). Do not invent
> content, standards, vocabulary, or activities that aren't already in them — this is a transformation
> of real material into a fill-in notebook format, not new curriculum writing.
>
> ### Reading the source files
>
> **`wd-daily-agenda-full.json`** is the primary source — an object with `wd1` and `wd2` arrays, each a
> list of `{ block_num, content }` entries in day order. `content` has:
> - `chapterLabel` — e.g. "Chapter 1: The Developer's World · Day 1 of 14" — gives you the chapter,
>   topic, and "Day N of M" for that specific lesson's unit.
> - `objective` — array of the day's real learning objective(s).
> - `standards` — array of the real standards this day addresses; `standardsNote`, if present, adds
>   context.
> - `doNowType` + `doNowPrompt` — the real warm-up. `doNowPrompt` already contains a real wireframe-sketch
>   instruction tied to that day's topic (naming a device — phone, tablet, or desktop — and a specific
>   thing to sketch), followed by the day's actual discussion/reflection question after "Then,". Use the
>   wireframe-sketch portion directly for this page's wireframe/mockup box (see below), and the portion
>   after "Then," as this day's discussion/reflection hook.
> - `tasksTitle` + `tasksList` — the real lesson title and its ordered list of real tasks/activities for
>   the day (what actually happens in class, including any lab/milestone by name).
> - `exitTicket` — the real one-line exit check for the day, where present.
> - `milestone` — populated on days that are a real project/capstone milestone, naming it.
>
> **`admin/lesson-plan-binder.html`** is secondary — its day-by-day detail is incomplete (only 77 of 96
> WD1 days and 72 of 107 WD2 days are written out there; capstones are one paragraph, and Boot Camp/the
> Agency Studio aren't in it at all). Use it only for each chapter's overview: duration, full standards
> list, CFA date, and the "Instructional Strategies Used This Chapter" box (`chapter-head`/`chapter-meta`
> plus the `card tracker` box right after it). Where it DOES have a day written out in more depth than
> the JSON (the real 5E `dl.phases` content, `card lab`/`card milestone` objective and numbered
> instructions), use that richer version for that day's activity block instead of just `tasksList`.
>
> ### Document structure
>
> **1. Cover page.** Course name, "Guided Notebook," a line for the student's name and period.
>
> **2. Front matter — three tracker pages, one page each:**
> - **My Elbow Partners** — a table with 4 rows, one per quarter (label them Quarter 1-4), each row with
>   blank lines for a partner's name and the date the pairing started.
> - **My 4-Square Group** — a table with 4 rows (one per quarter), each row with four blank name lines
>   arranged as a small 2x2 grid label ("4-Square") plus a date line.
> - **My Project Team** — a table with 4 rows (one per quarter), each row with 3-4 blank name lines (a
>   project team is 3-4 students) and a line for which chapter/project the team is for.
>
> **3. One page per real lesson day, in the exact order the JSON array lists them (`block_num` order)**,
> each page containing:
> - A header: Chapter number/title and "Day N of M," both parsed straight from that day's `chapterLabel`.
> - **The day's actual learning objective(s)**, from `objective`, as a "Today I will be able to..."
>   line(s).
> - **One activity block matched to the real 5E phase that best fits it**, built from that phase's real
>   content — pick ONE of these formats per page based on what that day's content actually is, don't
>   force the same format onto every page:
>   - *Fill-in-the-blank*: for a phase that defines real vocabulary/concepts (pull the actual terms and
>     definitions from the Explain phase content) — sentences with blanks for the key term, 4-6 terms.
>   - *Discussion questions*: for an Engage-phase hook or a concept with real debate/judgment calls in the
>     source content — 2-3 open questions lifted directly from or closely adapted from that day's real
>     "Ask:" hook and Explain content.
>   - *Think Alone, Then Pair-Share*: for content where a student reasons individually first — a "Think"
>     box (write your own answer) followed by a "Share" box (what did your elbow partner say, what did
>     you agree or disagree on).
>   - *Group work*: for an Elaborate-phase lab/milestone that's naturally collaborative — restate the
>     real lab's objective and numbered instructions as a worksheet with blanks/checkboxes for each real
>     step, plus a line for which 4-Square group or Project Team did it.
> - **A wireframe/mockup box**: a blank device frame outline matching whichever device (phone, tablet, or
>   desktop) that day's real `doNowPrompt` names, with the sketch instruction from that same prompt as
>   the page's label — don't write a new one, the real one is already there and already tied to that
>   day's actual topic. Every single day has a `doNowPrompt` with one of these, so every page gets a box.
> - **An exit ticket line** at the bottom, from `exitTicket` where present, otherwise restating the day's
>   objective as a one-line self-check.
>
> **4. A milestone/project page** for every day where `milestone` is populated, or whose `chapterLabel`
> names a Capstone/Studio block — restate the real project brief from `tasksList` as a worksheet, with a
> line for the student's Project Team name. Cross-reference `admin/lesson-plan-binder.html`'s matching
> `card milestone` block for the fuller objective/instructions text when one exists.
>
> ### Formatting
>
> - Standard 8.5x11, one lesson day per page (don't compress two days onto one page even if short).
> - Consistent running header per page: Chapter N: Title | Day X of Y.
> - Leave generous blank writing space under every prompt/question — this is a notebook, not a quiz.
> - No answer key — this ships blank for students to fill in.
>
> ### Deliverable
>
> One Word document covering every lesson day in the course brief below, in order, front matter first.

---

## COURSE BRIEF: WEB DESIGN 1

> Build the notebook from the `wd1` array in `wd-daily-agenda-full.json` — all 96 entries, in
> `block_num` order, with no skipping or merging. That array already includes the Capstone pages between
> chapters (Community App, Q1/Q2 HTML, Year 1 Portfolio) and the Chapter 1 and Chapter 5 Re-teach/retest
> days — you don't need to identify these separately, just process every entry in order. Your finished
> page count should be 96 (plus the 4 front-matter pages and cover); if it's off, you skipped or merged
> a day, which isn't allowed.

---

## COURSE BRIEF: WEB DESIGN 2

> Build the notebook from the `wd2` array in `wd-daily-agenda-full.json` — all 107 entries, in
> `block_num` order, with no skipping or merging. That array already includes the Boot Camp
> recertification days at the start, the capstone/studio blocks between chapters, the EOP Review & Exam
> block, and "The Agency Studio" 28-day dual-project sprint sequence at the end — you don't need to
> identify these separately, just process every entry in order. Your finished page count should be 107
> (plus the 4 front-matter pages and cover); if it's off, you skipped or merged a day, which isn't
> allowed.
