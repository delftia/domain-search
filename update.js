const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('domains.db');

db.run('INSERT INTO last_checked (domain) VALUES (?)', ['cm.net'], (err) => {
    if (!err) {
        console.log('Заполнено успешно')
    } else {
        console.error(err)
    }
})