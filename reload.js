const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('domains.db');

db.run('DROP TABLE last_checked', (err) => {
    if (!err) {
        console.log('Удалено успешно')
    } else {
        console.error(err)
    }
})