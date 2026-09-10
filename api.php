<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$dbFile = __DIR__ . '/database.sqlite';
if (!file_exists($dbFile)) { http_response_code(500); echo json_encode(['ok'=>false,'error'=>'Database not initialized. Open setup.php first.']); exit; }
try {
  $pdo = new PDO('sqlite:' . $dbFile);
  $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
  $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
  $pdo->exec('PRAGMA foreign_keys = ON');
  $pdo->exec("CREATE TABLE IF NOT EXISTS message_pins (message_id INTEGER PRIMARY KEY, pinned_by INTEGER NOT NULL, pinned_at TEXT NOT NULL, FOREIGN KEY(message_id) REFERENCES messages(id) ON DELETE CASCADE, FOREIGN KEY(pinned_by) REFERENCES users(id) ON DELETE CASCADE)");
} catch (Throwable $e) { http_response_code(500); echo json_encode(['ok'=>false,'error'=>'SQLite/PDO is not enabled in PHP.']); exit; }

function out($data,$status=200){ http_response_code($status); echo json_encode($data,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES); exit; }
function body(){ $raw=file_get_contents('php://input'); $j=json_decode($raw,true); return is_array($j)?$j:$_POST; }
function now(){ return gmdate('c'); }
function uid(){ return $_SESSION['uid'] ?? null; }
function auth(){ if(!uid()) out(['ok'=>false,'error'=>'Authentication required'],401); return (int)$_SESSION['uid']; }
function cleanUser($u){ if(!$u) return null; unset($u['password_hash']); return $u; }
function origin(){ return rtrim((isset($_SERVER['HTTPS'])&&$_SERVER['HTTPS']!=='off'?'https':'http').'://'.$_SERVER['HTTP_HOST'],'/'); }
function mediaUrl($p){ return $p ? origin().'/Nura/'.ltrim($p,'/').'?v='.rawurlencode((string)filemtime(__DIR__.'/'.ltrim($p,'/'))) : ''; }
function conv(PDO $pdo,$cid,$uid){ $s=$pdo->prepare('SELECT c.* FROM conversations c JOIN conversation_members cm ON cm.conversation_id=c.id WHERE c.id=? AND cm.user_id=?'); $s->execute([$cid,$uid]); return $s->fetch(); }
function message(PDO $pdo,$mid,$uid){ $s=$pdo->prepare('SELECT m.*,u.username,u.display_name,u.avatar_url,(SELECT 1 FROM message_pins p WHERE p.message_id=m.id) is_pinned FROM messages m JOIN users u ON u.id=m.sender_id WHERE m.id=? AND EXISTS(SELECT 1 FROM conversation_members cm WHERE cm.conversation_id=m.conversation_id AND cm.user_id=?)'); $s->execute([$mid,$uid]); return $s->fetch(); }
function mapMessage($m,$uid){
  if(!$m) return null;
  $m['mine']=(int)$m['sender_id']===$uid; $m['is_pinned']=(int)($m['is_pinned']??0)===1; $m['avatar_url']=mediaUrl($m['avatar_url']);
  if($m['attachment_url']) $m['attachment_url']=mediaUrl($m['attachment_url']);
  if($m['reply_to_id']) { /* reply body is hydrated separately in chat query */ }
  return $m;
}
$action=$_GET['action']??'';
try {
  if($action==='register'){
    $b=body(); $username=trim($b['username']??''); $password=$b['password']??''; $name=trim($b['display_name']??'');
    if(!preg_match('/^[A-Za-z0-9_\.]{3,24}$/',$username)) out(['ok'=>false,'error'=>'Username must be 3-24 chars'],422);
    if(strlen($password)<8) out(['ok'=>false,'error'=>'Password must be at least 8 chars'],422);
    if($name==='') $name=$username;
    $q=$pdo->prepare('SELECT id FROM users WHERE username=?');$q->execute([$username]);if($q->fetch())out(['ok'=>false,'error'=>'Username is already taken'],409);
    $s=$pdo->prepare('INSERT INTO users(username,password_hash,display_name,bio,last_seen,created_at) VALUES(?,?,?,?,?,?)');$s->execute([$username,password_hash($password,PASSWORD_DEFAULT),$name,trim($b['bio']??''),now(),now()]);$_SESSION['uid']=(int)$pdo->lastInsertId();
    $q=$pdo->prepare('SELECT * FROM users WHERE id=?');$q->execute([$_SESSION['uid']]);out(['ok'=>true,'user'=>cleanUser($q->fetch())]);
  }
  if($action==='login'){
    $b=body();$identity=trim($b['identity']??'');$password=$b['password']??'';$q=$pdo->prepare('SELECT * FROM users WHERE username=? OR phone=? LIMIT 1');$q->execute([$identity,$identity]);$u=$q->fetch();
    if(!$u||!password_verify($password,$u['password_hash']))out(['ok'=>false,'error'=>'Invalid username or password'],422);$_SESSION['uid']=(int)$u['id'];$pdo->prepare('UPDATE users SET last_seen=? WHERE id=?')->execute([now(),$u['id']]);out(['ok'=>true,'user'=>cleanUser($u)]);
  }
  if($action==='logout'){ session_destroy(); out(['ok'=>true]); }
  if($action==='me'){
    if(!uid()) out(['ok'=>true,'authenticated'=>false]);$q=$pdo->prepare('SELECT * FROM users WHERE id=?');$q->execute([uid()]);$u=$q->fetch();if(!$u)out(['ok'=>true,'authenticated'=>false]);$u=cleanUser($u);$u['avatar_url']=mediaUrl($u['avatar_url']);$u['banner_url']=mediaUrl($u['banner_url']);out(['ok'=>true,'authenticated'=>true,'user'=>$u]);
  }

  $user=auth(); $pdo->prepare('UPDATE users SET last_seen=? WHERE id=?')->execute([now(),$user]);

  if($action==='update_profile'){
    $b=body();$allowed=['display_name','bio','website_url','instagram_url','x_url','linkedin_url'];$set=[];$vals=[];
    foreach($allowed as $k) if(array_key_exists($k,$b)){$set[]="$k=?";$vals[]=trim((string)$b[$k]);}
    if(isset($b['username'])){ $un=trim($b['username']); if(!preg_match('/^[A-Za-z0-9_\.]{3,24}$/',$un)) out(['ok'=>false,'error'=>'Invalid username'],422);$set[]='username=?';$vals[]=$un; }
    if(!$set)out(['ok'=>false,'error'=>'Nothing to update'],422);
    try{$vals[]=$user;$pdo->prepare('UPDATE users SET '.implode(',',$set).' WHERE id=?')->execute($vals);}catch(PDOException $e){if(stripos($e->getMessage(),'UNIQUE')!==false)out(['ok'=>false,'error'=>'Username is already taken'],409);throw $e;}
    $q=$pdo->prepare('SELECT * FROM users WHERE id=?');$q->execute([$user]);$u=cleanUser($q->fetch());$u['avatar_url']=mediaUrl($u['avatar_url']);$u['banner_url']=mediaUrl($u['banner_url']);out(['ok'=>true,'user'=>$u]);
  }
  if($action==='upload_profile_media'){
    if(!isset($_FILES['file']))out(['ok'=>false,'error'=>'File missing'],422);$kind=$_POST['kind']??'avatar';if(!in_array($kind,['avatar','banner'],true))out(['ok'=>false,'error'=>'Invalid media kind'],422);$f=$_FILES['file'];if($f['error']!==UPLOAD_ERR_OK)out(['ok'=>false,'error'=>'Upload failed'],422);if($f['size']>10*1024*1024)out(['ok'=>false,'error'=>'Max image size is 10MB'],422);
    $mime=(new finfo(FILEINFO_MIME_TYPE))->file($f['tmp_name']);$ext=['image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp','image/gif'=>'gif'][$mime]??null;if(!$ext)out(['ok'=>false,'error'=>'Only JPG, PNG, WEBP or GIF'],422);
    $folder=__DIR__.'/uploads';if(!is_dir($folder))mkdir($folder,0775,true);$name='uploads/'.($kind==='banner'?'banner_':'avatar_').date('Ymd_His').'_'.bin2hex(random_bytes(6)).'.'.$ext;if(!move_uploaded_file($f['tmp_name'],__DIR__.'/'.$name))out(['ok'=>false,'error'=>'Could not store upload'],500);$col=$kind==='banner'?'banner_url':'avatar_url';$pdo->prepare("UPDATE users SET $col=? WHERE id=?")->execute([$name,$user]);out(['ok'=>true,'url'=>mediaUrl($name)]);
  }
  if($action==='search_users'){
    $qtxt=trim($_GET['q']??'');if($qtxt==='')out(['ok'=>true,'users'=>[]]);$s=$pdo->prepare("SELECT id,username,display_name,bio,avatar_url,banner_url,last_seen,instagram_url,x_url,linkedin_url,website_url FROM users WHERE id<>? AND is_active=1 AND (username LIKE ? OR display_name LIKE ?) ORDER BY display_name LIMIT 30");$like='%'.$qtxt.'%';$s->execute([$user,$like,$like]);$rows=$s->fetchAll();foreach($rows as &$r){$r['avatar_url']=mediaUrl($r['avatar_url']);$r['banner_url']=mediaUrl($r['banner_url']);}out(['ok'=>true,'users'=>$rows]);
  }
  if($action==='list_chats'){
    $sql="SELECT c.id,c.type,c.title,c.avatar_url,c.created_at,(SELECT m2.body FROM messages m2 WHERE m2.conversation_id=c.id AND m2.deleted_at IS NULL ORDER BY m2.id DESC LIMIT 1) last_body,(SELECT m2.message_type FROM messages m2 WHERE m2.conversation_id=c.id AND m2.deleted_at IS NULL ORDER BY m2.id DESC LIMIT 1) last_type,(SELECT m2.created_at FROM messages m2 WHERE m2.conversation_id=c.id AND m2.deleted_at IS NULL ORDER BY m2.id DESC LIMIT 1) last_message_at FROM conversations c JOIN conversation_members cm ON cm.conversation_id=c.id AND cm.user_id=? ORDER BY COALESCE(last_message_at,c.created_at) DESC";
    $s=$pdo->prepare($sql);$s->execute([$user]);$chats=$s->fetchAll();$m=$pdo->prepare('SELECT u.id,u.username,u.display_name,u.bio,u.avatar_url,u.banner_url,u.last_seen,u.instagram_url,u.x_url,u.linkedin_url,u.website_url FROM conversation_members cm JOIN users u ON u.id=cm.user_id WHERE cm.conversation_id=? AND u.id<>? LIMIT 1');$un=$pdo->prepare('SELECT COUNT(*) n FROM messages x WHERE x.conversation_id=? AND x.sender_id<>? AND x.deleted_at IS NULL AND NOT EXISTS(SELECT 1 FROM message_reads r WHERE r.message_id=x.id AND r.user_id=?)');
    foreach($chats as &$c){$m->execute([$c['id'],$user]);$other=$m->fetch();$c['other']=$other;if($other)$c['other']['avatar_url']=mediaUrl($other['avatar_url']);$c['avatar_url']=mediaUrl($c['avatar_url']);$un->execute([$c['id'],$user,$user]);$c['unread']=(int)$un->fetch()['n'];}
    out(['ok'=>true,'chats'=>$chats]);
  }
  if($action==='create_direct'){
    $b=body();$target=(int)($b['user_id']??0);if(!$target||$target===$user)out(['ok'=>false,'error'=>'Invalid user'],422);$q=$pdo->prepare('SELECT id FROM users WHERE id=? AND is_active=1');$q->execute([$target]);if(!$q->fetch())out(['ok'=>false,'error'=>'User not found'],404);
    $q=$pdo->prepare("SELECT c.id FROM conversations c JOIN conversation_members a ON a.conversation_id=c.id AND a.user_id=? JOIN conversation_members b ON b.conversation_id=c.id AND b.user_id=? WHERE c.type='direct' LIMIT 1");$q->execute([$user,$target]);$row=$q->fetch();if($row)out(['ok'=>true,'conversation_id'=>(int)$row['id']]);
    $pdo->beginTransaction();$pdo->prepare("INSERT INTO conversations(type,created_by,created_at) VALUES('direct',?,?)")->execute([$user,now()]);$cid=(int)$pdo->lastInsertId();$i=$pdo->prepare('INSERT INTO conversation_members(conversation_id,user_id,joined_at) VALUES(?,?,?)');$i->execute([$cid,$user,now()]);$i->execute([$cid,$target,now()]);$pdo->commit();out(['ok'=>true,'conversation_id'=>$cid]);
  }
  if($action==='chat'){
    $cid=(int)($_GET['id']??0);if(!conv($pdo,$cid,$user))out(['ok'=>false,'error'=>'Conversation not found'],404);
    $sql="SELECT m.id,m.conversation_id,m.sender_id,m.body,m.message_type,m.attachment_url,m.attachment_name,m.reply_to_id,m.created_at,m.edited_at,m.deleted_at,u.username,u.display_name,u.avatar_url,(SELECT 1 FROM message_pins p WHERE p.message_id=m.id) is_pinned,ru.display_name reply_sender,ru.avatar_url reply_sender_avatar,rm.body reply_body FROM messages m JOIN users u ON u.id=m.sender_id LEFT JOIN messages rm ON rm.id=m.reply_to_id LEFT JOIN users ru ON ru.id=rm.sender_id WHERE m.conversation_id=? AND m.deleted_at IS NULL ORDER BY m.id DESC LIMIT 150";
    $s=$pdo->prepare($sql);$s->execute([$cid]);$msgs=array_reverse($s->fetchAll());foreach($msgs as &$m){$m=mapMessage($m,$user);if($m['reply_sender_avatar'])$m['reply_sender_avatar']=mediaUrl($m['reply_sender_avatar']);if($m['is_pinned'])$m['is_pinned']=true;}
    $read=$pdo->prepare('SELECT id FROM messages WHERE conversation_id=? AND sender_id<>? AND deleted_at IS NULL');$read->execute([$cid,$user]);$ir=$pdo->prepare('INSERT OR REPLACE INTO message_reads(message_id,user_id,read_at) VALUES(?,?,?)');foreach($read as $r)$ir->execute([$r['id'],$user,now()]);
    $pm=$pdo->prepare("SELECT m.id,m.body,m.sender_id,m.created_at,u.display_name FROM messages m JOIN message_pins p ON p.message_id=m.id JOIN users u ON u.id=m.sender_id WHERE m.conversation_id=? AND m.deleted_at IS NULL ORDER BY p.pinned_at DESC");$pm->execute([$cid]);$pins=$pm->fetchAll();out(['ok'=>true,'messages'=>$msgs,'pinned_messages'=>$pins]);
  }
  if($action==='send_message'){
    $b=body();$cid=(int)($b['conversation_id']??0);if(!conv($pdo,$cid,$user))out(['ok'=>false,'error'=>'Conversation not found'],404);$text=(string)($b['body']??'');$type=$b['message_type']??'text';$reply=(int)($b['reply_to_id']??0)?:null;if(!in_array($type,['text','audio','image','file'],true))$type='text';if(trim($text)===''&&empty($b['attachment_url']))out(['ok'=>false,'error'=>'Message is empty'],422);
    if($reply){$q=$pdo->prepare('SELECT id FROM messages WHERE id=? AND conversation_id=? AND deleted_at IS NULL');$q->execute([$reply,$cid]);if(!$q->fetch())$reply=null;}
    $pdo->prepare('INSERT INTO messages(conversation_id,sender_id,body,message_type,attachment_url,attachment_name,reply_to_id,created_at) VALUES(?,?,?,?,?,?,?,?)')->execute([$cid,$user,$text,$type,$b['attachment_url']??'',$b['attachment_name']??'',$reply,now()]);out(['ok'=>true,'message_id'=>(int)$pdo->lastInsertId()]);
  }
  if($action==='upload_chat_media'){
    $cid=(int)($_POST['conversation_id']??0);if(!conv($pdo,$cid,$user))out(['ok'=>false,'error'=>'Conversation not found'],404);if(!isset($_FILES['file']))out(['ok'=>false,'error'=>'File missing'],422);$f=$_FILES['file'];if($f['error']!==UPLOAD_ERR_OK)out(['ok'=>false,'error'=>'Upload failed'],422);if($f['size']>15*1024*1024)out(['ok'=>false,'error'=>'Max file size is 15MB'],422);
    $mime=(new finfo(FILEINFO_MIME_TYPE))->file($f['tmp_name']);$map=['image/jpeg'=>['jpg','image'],'image/png'=>['png','image'],'image/webp'=>['webp','image'],'application/pdf'=>['pdf','file'],'text/plain'=>['txt','file'],'audio/webm'=>['webm','audio'],'audio/ogg'=>['ogg','audio'],'audio/mp4'=>['m4a','audio'],'audio/mpeg'=>['mp3','audio']];if(!isset($map[$mime]))out(['ok'=>false,'error'=>'This file type is not allowed'],422);[$ext,$type]=$map[$mime];$dir=__DIR__.'/uploads/chat';if(!is_dir($dir))mkdir($dir,0775,true);$name='uploads/chat/'.date('Ymd_His').'_'.bin2hex(random_bytes(7)).'.'.$ext;if(!move_uploaded_file($f['tmp_name'],__DIR__.'/'.$name))out(['ok'=>false,'error'=>'Upload failed'],500);$pdo->prepare('INSERT INTO messages(conversation_id,sender_id,body,message_type,attachment_url,attachment_name,created_at) VALUES(?,?,?,?,?,?,?)')->execute([$cid,$user,'',$type,$name,$f['name'],now()]);out(['ok'=>true,'message_id'=>(int)$pdo->lastInsertId()]);
  }
  if($action==='edit_message'){
    $b=body();$mid=(int)($b['message_id']??0);$text=trim((string)($b['body']??''));if($text==='')out(['ok'=>false,'error'=>'Message cannot be empty'],422);$q=$pdo->prepare('UPDATE messages SET body=?,edited_at=? WHERE id=? AND sender_id=? AND deleted_at IS NULL');$q->execute([$text,now(),$mid,$user]);if($q->rowCount()===0)out(['ok'=>false,'error'=>'Message not found or cannot be edited'],404);out(['ok'=>true]);
  }
  if($action==='delete_message'){
    $b=body();$mid=(int)($b['message_id']??0);$q=$pdo->prepare('UPDATE messages SET deleted_at=?,body="",attachment_url="" WHERE id=? AND sender_id=? AND deleted_at IS NULL');$q->execute([now(),$mid,$user]);if($q->rowCount()===0)out(['ok'=>false,'error'=>'Message not found or cannot be deleted'],404);$pdo->prepare('DELETE FROM message_pins WHERE message_id=?')->execute([$mid]);out(['ok'=>true]);
  }
  if($action==='toggle_pin'){
    $b=body();$mid=(int)($b['message_id']??0);$m=message($pdo,$mid,$user);if(!$m)out(['ok'=>false,'error'=>'Message not found'],404);$q=$pdo->prepare('SELECT message_id FROM message_pins WHERE message_id=?');$q->execute([$mid]);if($q->fetch()){$pdo->prepare('DELETE FROM message_pins WHERE message_id=?')->execute([$mid]);out(['ok'=>true,'pinned'=>false]);}$pdo->prepare('INSERT INTO message_pins(message_id,pinned_by,pinned_at) VALUES(?,?,?)')->execute([$mid,$user,now()]);out(['ok'=>true,'pinned'=>true]);
  }
  out(['ok'=>false,'error'=>'Unknown action'],404);
} catch(Throwable $e){ out(['ok'=>false,'error'=>$e->getMessage()],500); }
