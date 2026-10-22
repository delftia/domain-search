const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();

// Вставьте свой API-ключ здесь
const API_KEY = 'at_FFKQArfqAZwkanFaNZHpLNN18bFQO';
const tld = '.ai';

// Алфавит и настройки длины доменов
const alphabet = 'abcdefghijklmnopqrstuvwxyz';
const minLength = 2;
const maxLength = 2; // Для тестирования оставим 2 символа

// Подключение к SQLite базе данных
const db = new sqlite3.Database('domains.db');

// Создание таблиц для хранения доменов и состояния
db.serialize(() => {
  // Таблица для свободных доменов
  db.run(`CREATE TABLE IF NOT EXISTS available_domains (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domain TEXT
  )`);

  // Таблица для хранения состояния
  db.run(`CREATE TABLE IF NOT EXISTS last_checked (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domain TEXT
  )`);
});

// Функция для вставки доступного домена в базу данных
function insertAvailableDomain(domain) {
  db.run(`INSERT INTO available_domains (domain) VALUES (?)`, [domain], function (err) {
    if (err) {
      return console.log('Ошибка при добавлении домена в базу данных:', err.message);
    }
    console.log(`Домен ${domain} добавлен в базу данных!`);
  });
}

// Функция для обновления последнего проверенного домена
function updateLastCheckedDomain(domain) {
  db.run(`DELETE FROM last_checked`);
  db.run(`INSERT INTO last_checked (domain) VALUES (?)`, [domain], function (err) {
    if (err) {
      return console.log('Ошибка при обновлении последнего проверенного домена:', err.message);
    }
    console.log(`Последний проверенный домен обновлен на ${domain}`);
  });
}

// Функция для получения последнего проверенного домена
function getLastCheckedDomain(callback) {
  db.get(`SELECT domain FROM last_checked ORDER BY id DESC LIMIT 1`, (err, row) => {
    if (err) {
      return console.log('Ошибка при получении последнего проверенного домена:', err.message);
    }
    callback(row ? row.domain : null);
  });
}

// Функция для проверки доступности домена через WhoisXML API
async function checkDomainAvailability(domain) {
  const url = `https://domain-availability.whoisxmlapi.com/api/v1?apiKey=${API_KEY}&domainName=${domain}`;

  try {
    const response = await axios.get(url, { timeout: 4000 });

    if (response.status === 200 && response.data.DomainInfo) {
      const isAvailable = response.data.DomainInfo.domainAvailability === "AVAILABLE";
      console.log(`Проверка домена ${domain}: ${response.data.DomainInfo.domainAvailability}`);
      return isAvailable; // True, если домен свободен
    } else {
      console.log(`Ошибка ответа API для домена ${domain}`);
      return null;
    }
  } catch (error) {
    if (error.response && error.response.status === 403) {
      console.error(`Ошибка 403: доступ к API ограничен для домена ${domain}`);
      return null;
    } else {
      console.error(`Ошибка при запросе к API для домена ${domain}:`, error.message);
    }
  }
}

// Генерация комбинаций букв
function* combinations(alphabet, length, start) {
  const chars = alphabet.split('');
  const indices = Array(length).fill(0);

  // Устанавливаем начальное значение, если продолжение с последнего домена
  if (start) {
    for (let i = 0; i < start.length; i++) {
      indices[i] = chars.indexOf(start[i]);
    }
  }

  while (true) {
    yield indices.map(i => chars[i]).join('');
    let pos = length - 1;

    while (pos >= 0) {
      if (indices[pos] < chars.length - 1) {
        indices[pos]++;
        break;
      } else {
        indices[pos] = 0;
        pos--;
      }
    }

    if (pos < 0) break;
  }
}

// Функция для проверки доменов определенной длины
async function checkDomainsOfLength(length, lastCheckedDomain) {
  console.log(`\nПроверяем домены длиной ${length} символов:`);

  const start = lastCheckedDomain ? lastCheckedDomain.slice(0, length) : null;

  for (let combination of combinations(alphabet, length, start)) {
    const domain = combination + tld;
    console.log(`Проверяем домен: ${domain}`); // Логирование для отслеживания
    const isAvailable = await checkDomainAvailability(domain);

    if (isAvailable === null) {
      console.log(`Не удалось проверить ${domain}`);
      updateLastCheckedDomain(domain); // Обновляем последний проверенный домен при ошибке
      break;
    } else if (isAvailable) {
      console.log(`Домен ${domain} доступен!`);
      insertAvailableDomain(domain); // Вставляем свободный домен в базу
    } else {
      console.log(`Домен ${domain} уже занят.`);
    }

    updateLastCheckedDomain(domain); // Обновляем последний проверенный домен после проверки
  }
}

// Основная функция для поочередной проверки доменов от минимальной длины до максимальной
(async () => {
  getLastCheckedDomain(async (lastCheckedDomain) => {
    let startLength = minLength;

    // Определяем длину последнего проверенного домена
    if (lastCheckedDomain) {
      startLength = lastCheckedDomain.length - tld.length;
    }

    for (let length = startLength; length <= maxLength; length++) {
      await checkDomainsOfLength(length, lastCheckedDomain);
      lastCheckedDomain = null; // Чтобы продолжить с начала для следующей длины
    }
  });
})();
