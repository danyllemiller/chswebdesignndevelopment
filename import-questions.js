// import-questions.js
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const registry = {
  'join-the-developers-guild.html': 'wd-ch1-exam',
  'the-rules-how-not-to-get-sued.html': 'wd-ch2-exam',
  'the-why-intro-to-uiux.html': 'wd-ch4-exam',
  'the-blueprint.html': 'wd-ch3-exam',
  'the-bones-intro-to-html.html': 'wd-ch5-exam',
  'the-clothes-intro-to-css.html': 'wd-ch6-exam',
  'the-style-advanced-css-layout.html': 'wd-ch7-exam',
  'sights-sounds-making-it-pop-html-media.html': 'wd-ch8-exam',
  'the-brains-intro-to-javascript.html': 'wd-ch9-exam',
  'the-game-dev-advanced-js-game-logic.html': 'wd-ch10-exam',
  'the-cloud-collaboration-hosting.html': 'wd-ch11-exam',
  'the-manager-cms-platforms.html': 'wd-ch12-exam',
  'the-network-intro-to-apis.html': 'wd-ch13-exam',
  'the-brain-databases.html': 'wd-ch14-exam',
  'the-game-never-ends.html': 'wd-ch15-exam',
  'the-final-boss-going-live.html': 'wd-ch16-exam',
  'cs-unit-1-exam.html': 'cs-u1-exam',
  'cs-unit-2-exam.html': 'cs-u2-exam',
  'cs-unit-3-exam.html': 'cs-u3-exam',
  'cs-unit-4-exam.html': 'cs-u4-exam',
  'cs-unit-5-exam.html': 'cs-u5-exam'
};

async function main() {
  const connection = await mysql.createConnection({
    host: 'localhost', user: 'root', password: 'chs_password', database: 'chs_gradebook'
  });

  console.log('Resetting question table...');
  await connection.query('SET FOREIGN_KEY_CHECKS = 0;');
  await connection.query('TRUNCATE TABLE questions;');
  await connection.query('SET FOREIGN_KEY_CHECKS = 1;');

  const examDir = path.join(__dirname, 'live-site', 'exams');
  
  for (const [filename, examId] of Object.entries(registry)) {
    const filePath = path.join(examDir, filename);
    if (!fs.existsSync(filePath)) {
      console.warn(`Skipping: ${filename} (Not found)`);
      continue;
    }
    
    // Ensure exam exists in metadata table
    await connection.execute(
      'INSERT IGNORE INTO exams (exam_id, title) VALUES (?, ?)',
      [examId, examId.replace(/-/g, ' ').toUpperCase()]
    );

    console.log(`Importing ${filename} -> ${examId}`);
    const content = fs.readFileSync(filePath, 'utf8');
    
    const regex = /question:\s*["'](.*?)["']\s*,\s*options:\s*\[\s*(.*?)\s*\]/gs;
    let match;
    let count = 0;
    
    while ((match = regex.exec(content)) !== null) {
      const qText = match[1];
      // Clean and ensure we have at least 4 slots
      const rawOpts = match[2].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(o => o.trim().replace(/^["']|["']$/g, ''));
      const opts = [
        rawOpts[0] || '',
        rawOpts[1] || '',
        rawOpts[2] || '',
        rawOpts[3] || ''
      ];
      
      await connection.execute(
        `INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d) VALUES (?, ?, ?, ?, ?, ?)`,
        [examId, qText, opts[0], opts[1], opts[2], opts[3]]
      );
      count++;
    }
    console.log(`  -> Found ${count} questions.`);
  }
  
  await connection.end();
  console.log('Import Complete!');
}
main();