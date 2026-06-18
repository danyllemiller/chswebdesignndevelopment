/**
 * WEB DESIGN PRE-TEST ENGINE (DIAGNOSTIC EDITION)
 * WEB DESIGN VERSION - Uses MariaDB for gradebook (not Google Sheets)
 * 
 * This is the Web Design version of preTestLogic.
 * Use this file for all Web Design pre-assessments.
 */

import { initPreTest } from '/js/preTestLogic.js';

// Auto-configure for Web Design
const wdConfig = {
    trackType: 'webdesign'
};

// Export init function with Web Design preset
export function initWDPretest(config) {
    return initPreTest({
        ...config,
        trackType: 'webdesign'
    });
}
