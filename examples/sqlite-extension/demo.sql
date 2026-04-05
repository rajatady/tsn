-- Load the TypeScript-compiled fuzzy scoring function
.load ./build/fuzzy_score

-- Create a users table
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    name TEXT,
    email TEXT,
    city TEXT
);

-- Insert 10K rows
.timer on

-- Generate test data using a recursive CTE
WITH RECURSIVE
  names(n) AS (
    VALUES ('Alice Smith'), ('Bob Jones'), ('Charlie Brown'), ('Diana Davis'),
           ('Eve Wilson'), ('Frank Moore'), ('Grace Taylor'), ('Hank Clark'),
           ('Ivy Hall'), ('Jack Lee'), ('Alice Jones'), ('Bob Smith'),
           ('Charlie Davis'), ('Diana Moore'), ('Eve Taylor'), ('Frank Clark'),
           ('Grace Hall'), ('Hank Lee'), ('Ivy Wilson'), ('Jack Brown'),
           ('Alice Brown'), ('Bob Davis'), ('Charlie Moore'), ('Diana Taylor')
  ),
  cities(c) AS (
    VALUES ('New York'), ('London'), ('Tokyo'), ('Berlin'),
           ('Sydney'), ('Paris'), ('Toronto'), ('Mumbai')
  ),
  cnt(x) AS (
    VALUES (1) UNION ALL SELECT x+1 FROM cnt WHERE x < 10000
  )
INSERT INTO users (name, email, city)
SELECT
  n,
  LOWER(REPLACE(n, ' ', '.')) || x || '@example.com',
  c
FROM cnt
JOIN names ON (x % 24) + 1 = (SELECT COUNT(*) FROM names WHERE names.n <= names.n)
JOIN cities ON (x % 8) + 1 = (SELECT COUNT(*) FROM cities WHERE cities.c <= cities.c)
ORDER BY x;

-- Use a simpler insert approach
DELETE FROM users;

WITH RECURSIVE cnt(x) AS (VALUES (1) UNION ALL SELECT x+1 FROM cnt WHERE x < 10000)
INSERT INTO users (name, email, city)
SELECT
  CASE (x % 10)
    WHEN 0 THEN 'Alice Smith'
    WHEN 1 THEN 'Bob Jones'
    WHEN 2 THEN 'Charlie Brown'
    WHEN 3 THEN 'Diana Davis'
    WHEN 4 THEN 'Eve Wilson'
    WHEN 5 THEN 'Frank Moore'
    WHEN 6 THEN 'Grace Taylor'
    WHEN 7 THEN 'Hank Clark'
    WHEN 8 THEN 'Ivy Hall'
    ELSE 'Jack Lee'
  END,
  'user' || x || '@example.com',
  CASE (x % 5)
    WHEN 0 THEN 'New York'
    WHEN 1 THEN 'London'
    WHEN 2 THEN 'Tokyo'
    WHEN 3 THEN 'Berlin'
    ELSE 'Sydney'
  END
FROM cnt;

SELECT '=== Table created with ' || COUNT(*) || ' rows ===' FROM users;

-- Now use the TypeScript-compiled fuzzy_score function in SQL!
SELECT '=== Fuzzy search: "ali" ===';
SELECT name, city, fuzzy_score(name, 'ali') as score
FROM users
WHERE fuzzy_score(name, 'ali') > 0
GROUP BY name, city
ORDER BY score DESC
LIMIT 5;

SELECT '';
SELECT '=== Fuzzy search: "frank m" ===';
SELECT name, city, fuzzy_score(name, 'frank m') as score
FROM users
WHERE fuzzy_score(name, 'frank m') > 0
GROUP BY name, city
ORDER BY score DESC
LIMIT 5;

SELECT '';
SELECT '=== Benchmark: fuzzy_score on all 10K rows ===';
.timer on
SELECT COUNT(*) as matches, AVG(fuzzy_score(name, 'ali')) as avg_score
FROM users
WHERE fuzzy_score(name, 'ali') > 0;
