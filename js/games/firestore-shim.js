/**
 * firestore-shim.js
 *
 * The four multiplayer review-game engines (jeopardy.js, hollywood.js,
 * millionaire.js, smarter.js) were built against the real Firebase
 * Firestore v9 modular SDK: window.doc / getDoc / setDoc / updateDoc /
 * onSnapshot. When the site moved off Firebase onto its own server and
 * MariaDB, none of those five globals were ever redefined -- they were
 * just undefined -- and every game's multiplayer setup was additionally
 * gated behind `roomID && roomID !== "solo" && dbRef`, where dbRef is
 * always passed in as null (see review_games_logic.js's setup() calls),
 * so that whole branch never even ran. "Join room" silently did nothing.
 *
 * This file implements the exact same five-function call surface (the
 * engines themselves are untouched) against two small REST endpoints
 * backed by a single JSON-blob-per-room table (server/routes/gameRooms.js).
 * There's no real-time push available without adding a WebSocket server,
 * so onSnapshot is implemented as polling -- fast enough for a classroom
 * buzzer game, not truly instant. Must load before jeopardy.js/hollywood.js/
 * millionaire.js/smarter.js on every page that includes them.
 */
(function () {
    const POLL_MS = 900;

    window.doc = function (db, ...segments) {
        return { path: segments.map(String).join('/') };
    };

    window.getDoc = async function (docRef) {
        const res = await fetch(`/api/game-room?path=${encodeURIComponent(docRef.path)}`);
        const body = res.ok ? await res.json() : { exists: false, data: null };
        return {
            exists: () => !!body.exists,
            data: () => body.data || undefined
        };
    };

    window.setDoc = async function (docRef, data) {
        await fetch('/api/game-room', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: docRef.path, data })
        });
    };

    window.updateDoc = async function (docRef, updates) {
        await fetch('/api/game-room', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: docRef.path, updates })
        });
    };

    // Real Firestore fires the callback immediately with the current state,
    // then again on every subsequent remote change. Polling reproduces
    // both: the first successful fetch always differs from the sentinel
    // `undefined` starting value, and later callbacks only fire when the
    // fetched JSON actually changed, so a render loop tied to this callback
    // doesn't thrash on every poll tick when nothing moved.
    window.onSnapshot = function (docRef, callback) {
        let lastJson;
        let stopped = false;

        async function poll() {
            if (stopped) return;
            try {
                const res = await fetch(`/api/game-room?path=${encodeURIComponent(docRef.path)}`);
                const body = res.ok ? await res.json() : { exists: false, data: null };
                const json = JSON.stringify(body);
                if (json !== lastJson) {
                    lastJson = json;
                    callback({
                        exists: () => !!body.exists,
                        data: () => body.data || undefined
                    });
                }
            } catch (e) { /* transient network hiccup -- next poll retries */ }
            if (!stopped) setTimeout(poll, POLL_MS);
        }

        poll();
        return function unsubscribe() { stopped = true; };
    };
})();
