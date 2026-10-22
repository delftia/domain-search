const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('domains.db');

db.all('SELECT * FROM available_domains', (err, rows) => {
    console.log(rows)
})