/**
 * WD Pre-Test Engine - ES Module entry point
 *
 * All Web Design pre-assessment pages import { initPreTest } from this file.
 * It dynamically loads quizLogic.js (which sets window.initPreTest and all
 * onclick handlers) and delegates to it, so WD and CS pages share one engine.
 */

let _engine = null;
let _pending = null;

function loadQuizEngine() {
    if (_engine) return Promise.resolve(_engine);
    if (_pending) return _pending;

    _pending = new Promise((resolve, reject) => {
        // If quizLogic.js was already loaded by another path (e.g. preTestLogicCS.js), reuse it.
        if (typeof window !== 'undefined' && window.__quizLogicInitPreTest) {
            _engine = window.__quizLogicInitPreTest;
            resolve(_engine);
            return;
        }

        const s = document.createElement('script');
        s.src = '/js/quizLogic.js';
        s.onload = () => {
            // quizLogic.js sets window.initPreTest = its own initPreTest when it loads.
            // Capture it before anything can overwrite window.initPreTest again.
            _engine = window.__quizLogicInitPreTest || window.initPreTest;
            resolve(_engine);
        };
        s.onerror = () => reject(new Error('[preTestLogic] Failed to load /js/quizLogic.js'));
        document.head.appendChild(s);
    });

    return _pending;
}

/**
 * Main entry point used by all WD pre-assessment pages.
 * Accepts the same config object as quizLogic's initPreTest.
 */
export async function initPreTest(config) {
    const engine = await loadQuizEngine();
    if (typeof engine !== 'function') {
        throw new Error('[preTestLogic] Quiz engine did not export initPreTest correctly.');
    }
    return engine(config);
}
