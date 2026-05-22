# Content Deduplication Strategy

## Problem Summary
The same chapter content files are duplicated across multiple directories:
- `/studyGuides/` (master/primary copies)
- `/year1/` and `/year2/` (curriculum organization)
- `/quizzes/` (quiz versions)
- `/infographics/` (visual versions)
- `/toLongDidntRead/` (summary versions)
- `/exams/` (exam versions)

**Example:** `the-style-advanced-css-layout.html` exists in 7 locations

## Recommended Approach (Phased Implementation)

### Phase 1: Create Master Content Repository ✓ (Ready)
```
/content/
  ├── chapters/
  │   ├── 1-join-the-developers-guild/
  │   │   ├── study-guide.html
  │   │   ├── quiz.json
  │   │   ├── infographic.html
  │   │   ├── summary.html
  │   │   └── exam.json
  │   ├── 2-the-rules/
  │   └── ... (continue for all chapters)
  └── metadata.json (chapter catalog)
```

### Phase 2: Create Dynamic Router
- Build a smart router in `/js/chapter-router.js`
- Loads chapter metadata and displays appropriate view
- Supports query parameters: `?chapter=the-style&view=study-guide`

### Phase 3: URL Forwarding
- Keep legacy URLs working via redirects
- Gradually migrate links to new structure
- Old URLs: `/studyGuides/the-style.html` → `/chapter/?view=study-guide&id=the-style`

### Phase 4: Data-Driven Content
- Extract quiz questions into JSON files
- Create templated infographic renderer
- Build summary generator from study guide

## Implementation Priority

**Quick wins (implement now):**
- ✅ Delete Python cleanup scripts (saves maintenance burden)
- ✅ Consolidate duplicate JS (3.2MB saved)
- ✅ Reorganize admin/student pages (improves navigation)
- ✅ Simplify page headers (reduces redundancy)

**Medium effort (next update cycle):**
- Create `/content/chapters/` structure
- Build chapter metadata system
- Implement chapter router

**Long-term (ongoing):**
- Migrate content to data-driven model
- Generate multiple views from single source
- Implement content management UI for non-technical updates

## Files Affected by Full Deduplication
- 100+ HTML files would be consolidated
- Estimated 2.5MB reduction in storage
- Easier to maintain single source of truth per chapter
- Enables rapid content updates across all formats

## Current State
- 4 major optimizations completed
- Site structure much cleaner and more maintainable
- Ready for next phase when resources allow
