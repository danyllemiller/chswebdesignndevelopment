# Prompt: Build the Guided Notebook (Word Doc) for WD1 and WD2

Paste the Master Prompt once, then paste the matching Course Brief (WD1 or WD2) right after it.
Run the whole thing twice — once per course — since these produce two separate Word documents.
Attach `admin/lesson-plan-binder.html` to the session; it is the only source of truth for content.

---

## THE MASTER PROMPT

> You are building a printable student "Guided Notebook" in Microsoft Word for a Nevada high school
> Web Design and Development course. This is a physical consumable workbook students fill in by hand,
> one page per real lesson day, built entirely from the real lesson plans in the attached
> `admin/lesson-plan-binder.html` file. Do not invent content, standards, vocabulary, or activities that
> aren't already in that file — this is a transformation of real material into a fill-in notebook format,
> not new curriculum writing.
>
> ### Reading the source file
>
> Each chapter in the binder is a `<section class="chapter">` containing:
> - A `chapter-head`/`chapter-meta` block (chapter number, title, duration, standards, CFA date) and an
>   "Instructional Strategies Used This Chapter" box.
> - A `sched-table` listing every real lesson day in order ("Day N of M"), each with a topic.
> - One `<div class="lesson">` per day, containing a `dl.phases` list — `<dt>` phase names (Engage,
>   Explore, Explain, Elaborate, sometimes Evaluate) each paired with a `<dd>` holding that phase's real
>   content: discussion hooks ("Ask: ..."), direct instruction content, and — inside Elaborate — a
>   `card lab` or `card milestone` block with a real lab/project title, objective, numbered instructions,
>   and a "Turn In" line. Many lessons also have an `exit-ticket` block.
> - Capstone/project blocks (`card milestone` outside a numbered lesson) and summative `assess` blocks
>   between chapters.
>
> The Do Now prompt embedded in each day (`doNowPrompt` in the site's live data, visible in the day's
> Engage phase) already includes a wireframe-sketch instruction tied to that day's real content — use
> that same day's real topic as the basis for the notebook page's wireframe/mockup task too (see below),
> adapted for a hand-sketched page rather than a spoken warm-up.
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
> **3. One page per real lesson day, in the exact order the binder lists them**, each page containing:
> - A header: Chapter number/title, "Day N of M," and that day's real topic (from the sched-table).
> - **The day's actual learning objective(s)**, copied from the lesson's content, as a "Today I will be
>   able to..." line(s).
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
> - **A wireframe/mockup box**: a blank device frame outline — rotate phone, tablet, and desktop frames
>   day to day (roughly even rotation across the three) — labeled with a short sketch prompt you write
>   from that specific day's real topic (e.g. a day on accessible forms gets "Sketch a wireframe of an
>   accessible contact form"; a day on color theory gets "Mock up a hero section using a 60-30-10 color
>   split"). Every single day gets one of these, even days whose core content isn't visually a
>   "page" — if the day's topic isn't naturally a web page element, tie it to the Capstone/Agency project
>   the chapter is already building toward instead of skipping it.
> - **An exit ticket line** at the bottom, using the lesson's real exit-ticket content where the binder
>   has one, otherwise restating the day's objective as a one-line self-check.
>
> **4. A milestone/project page** wherever the binder has a `card milestone` or capstone block between
> lessons — restate the real project brief, objective, and numbered instructions as a worksheet, with a
> line for the student's Project Team name.
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

> Build the notebook for Web Design 1 — Chapters 1 through 8 in the binder, including the Capstone pages
> between chapters (Community App after Ch4, Q1/Q2 HTML after Ch5, Year 1 Portfolio after Ch8) and the
> Chapter 1 and Chapter 5 Re-teach/retest days. 96 real lesson days total across the 7 chapters plus
> capstones — confirm your page count lands close to that once you're done; if it's off, you likely
> skipped or merged a day, which isn't allowed.

---

## COURSE BRIEF: WEB DESIGN 2

> Build the notebook for Web Design 2 — Chapters 9 through 16 in the binder, including the Boot Camp
> recertification days at the start, the capstone/studio blocks between chapters, the EOP Review & Exam
> block, and "The Agency Studio" 28-day dual-project sprint sequence at the end. 107 real lesson days
> total — confirm your page count lands close to that once you're done.
