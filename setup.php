<?php
// Open http://localhost/Nura/setup.php once.
$dbPath = __DIR__ . '/database.sqlite';
header('Content-Type: text/html; charset=utf-8');
try {
  $pdo = new PDO('sqlite:' . $dbPath);
  $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
  $pdo->exec('PRAGMA foreign_keys = ON');
  $sql = file_get_contents(__DIR__ . '/schema.sql');
  $pdo->exec($sql);
  // Upgrade an older database whose messages table did not allow audio.
  $tableSql = $pdo->query("SELECT sql FROM sqlite_master WHERE type='table' AND name='messages'")->fetchColumn() ?: '';
  if (stripos($tableSql, "'audio'") === false) {
    $pdo->exec('PRAGMA foreign_keys = OFF');
    $pdo->beginTransaction();
    try {
      $pdo->exec('CREATE TABLE IF NOT EXISTS message_reads_backup AS SELECT * FROM message_reads');
      $pdo->exec('CREATE TABLE IF NOT EXISTS message_pins_backup AS SELECT * FROM message_pins');
      $pdo->exec('ALTER TABLE messages RENAME TO messages_legacy');
      $pdo->exec("CREATE TABLE messages (id INTEGER PRIMARY KEY AUTOINCREMENT, conversation_id INTEGER NOT NULL, sender_id INTEGER NOT NULL, body TEXT DEFAULT '', message_type TEXT NOT NULL DEFAULT 'text' CHECK(message_type IN ('text','image','file','audio','system')), attachment_url TEXT DEFAULT '', attachment_name TEXT DEFAULT '', reply_to_id INTEGER, created_at TEXT NOT NULL, edited_at TEXT, deleted_at TEXT, FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE, FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY(reply_to_id) REFERENCES messages(id) ON DELETE SET NULL)");
      $pdo->exec('INSERT INTO messages(id,conversation_id,sender_id,body,message_type,attachment_url,attachment_name,reply_to_id,created_at,edited_at,deleted_at) SELECT id,conversation_id,sender_id,body,message_type,attachment_url,attachment_name,reply_to_id,created_at,edited_at,deleted_at FROM messages_legacy');
      $pdo->exec('DROP TABLE messages_legacy');
      $pdo->exec('DROP TABLE IF EXISTS message_reads');
      $pdo->exec('CREATE TABLE message_reads (message_id INTEGER NOT NULL, user_id INTEGER NOT NULL, read_at TEXT NOT NULL, PRIMARY KEY(message_id,user_id), FOREIGN KEY(message_id) REFERENCES messages(id) ON DELETE CASCADE, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE)');
      $pdo->exec('INSERT OR IGNORE INTO message_reads SELECT message_id,user_id,read_at FROM message_reads_backup');
      $pdo->exec('DROP TABLE IF EXISTS message_reads_backup');
      $pdo->exec('DROP TABLE IF EXISTS message_pins');
      $pdo->exec("CREATE TABLE message_pins (message_id INTEGER PRIMARY KEY, pinned_by INTEGER NOT NULL, pinned_at TEXT NOT NULL, FOREIGN KEY(message_id) REFERENCES messages(id) ON DELETE CASCADE, FOREIGN KEY(pinned_by) REFERENCES users(id) ON DELETE CASCADE)");
      $pdo->exec('INSERT OR IGNORE INTO message_pins SELECT message_id,pinned_by,pinned_at FROM message_pins_backup');
      $pdo->exec('DROP TABLE IF EXISTS message_pins_backup');
      $pdo->exec('CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, id DESC)');
      $pdo->commit();
    } catch (Throwable $migrationError) {
      if ($pdo->inTransaction()) $pdo->rollBack();
      throw $migrationError;
    } finally {
      $pdo->exec('PRAGMA foreign_keys = ON');
    }
  }
  $pdo->exec("CREATE TABLE IF NOT EXISTS message_pins (message_id INTEGER PRIMARY KEY, pinned_by INTEGER NOT NULL, pinned_at TEXT NOT NULL, FOREIGN KEY(message_id) REFERENCES messages(id) ON DELETE CASCADE, FOREIGN KEY(pinned_by) REFERENCES users(id) ON DELETE CASCADE)");
  $pdo->exec("CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, id DESC)");
  if (!is_dir(__DIR__ . '/uploads')) mkdir(__DIR__ . '/uploads', 0775, true);
  if (!is_dir(__DIR__ . '/uploads/chat')) mkdir(__DIR__ . '/uploads/chat', 0775, true);
  $demoPassword = 'Nura12345'; $now = gmdate('c');
  $stmt = $pdo->prepare("INSERT OR IGNORE INTO users (username,password_hash,display_name,bio,last_seen,created_at) VALUES (?,?,?,?,?,?)");
  $stmt->execute(['demo', password_hash($demoPassword, PASSWORD_DEFAULT), 'Demo User', 'Welcome to Nura ✨', $now, $now]);
  echo '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Nura Setup</title><style>body{font-family:Arial;background:#0f1014;color:#fff;padding:32px;line-height:1.7}code{background:#242630;padding:3px 7px;border-radius:7px;color:#fac9df}a{color:#fac9df}</style></head><body><h1>Nura is ready ✨</h1><p>SQLite schema is installed and migrations have been applied.</p><p>Demo: <code>demo</code> / <code>'.htmlspecialchars($demoPassword).'</code></p><p><a href="index.html">Open Nura</a></p></body></html>';
} catch (Throwable $e) {
  http_response_code(500); echo '<h1>Setup failed</h1><pre>'.htmlspecialchars($e->getMessage()).'</pre>';
}
