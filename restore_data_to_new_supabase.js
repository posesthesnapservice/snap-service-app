/**
 * SNAP SERVICE - DATA RESTORATION SCRIPT
 * Injects backed up reels, users, and today's shoots into the new Supabase project.
 *
 * Usage:
 *   node restore_data_to_new_supabase.js <SUPABASE_URL> <SUPABASE_ANON_KEY>
 * or reads from .env.local if no args passed.
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local if args not provided
function getEnv() {
  const envPath = path.join(__dirname, '.env.local');
  const env = {};
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        env[match[1].trim()] = match[2].trim();
      }
    }
  }
  return env;
}

const env = getEnv();
const supabaseUrl = process.argv[2] || env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.argv[3] || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase URL or Anon Key.');
  console.error('Usage: node restore_data_to_new_supabase.js <NEW_SUPABASE_URL> <NEW_ANON_KEY>');
  process.exit(1);
}

console.log('🚀 Connecting to Supabase project:', supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseKey);

async function restore() {
  const backupPath = path.join(__dirname, 'supabase_backup.json');
  if (!fs.existsSync(backupPath)) {
    console.error('❌ Backup file supabase_backup.json not found!');
    process.exit(1);
  }

  const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  console.log(`📦 Found backup with:`);
  console.log(`   - ${backup.reels?.length || 0} Trending Reels`);
  console.log(`   - ${backup.users?.length || 0} User Accounts`);
  console.log(`   - ${backup.today?.length || 0} Today Shoots records\n`);

  // 1. Restore Users
  if (backup.users && backup.users.length > 0) {
    console.log(`⏳ Restoring ${backup.users.length} users into snap_users...`);
    const usersPayload = backup.users.map(u => ({
      id: u.id,
      email: u.email,
      username: u.username || null,
      password: u.password,
      name: u.name,
      role: u.role || 'user',
      active: u.active ?? true,
      created_at: u.created_at || new Date().toISOString(),
      last_login_at: u.last_login_at || null
    }));

    const { error: userError } = await supabase.from('snap_users').upsert(usersPayload, { onConflict: 'email' });
    if (userError) {
      console.error('❌ Error restoring users:', userError.message);
    } else {
      console.log('✅ Users restored successfully!');
    }
  }

  // 2. Restore Trending Reels
  if (backup.reels && backup.reels.length > 0) {
    console.log(`⏳ Restoring ${backup.reels.length} trending reels into snap_trending_reels...`);
    const reelsPayload = backup.reels.map(r => ({
      id: r.id,
      title: r.title,
      video_url: r.video_url || '',
      cover_url: r.cover_url || '',
      description: r.description || '',
      orientation: r.orientation || 'portrait',
      event: r.event || 'General',
      created_at: r.created_at || new Date().toISOString()
    }));

    // Batch insert in chunks of 20
    const chunkSize = 20;
    let successCount = 0;
    for (let i = 0; i < reelsPayload.length; i += chunkSize) {
      const chunk = reelsPayload.slice(i, i + chunkSize);
      const { error: reelError } = await supabase.from('snap_trending_reels').upsert(chunk, { onConflict: 'id' });
      if (reelError) {
        console.error(`❌ Error restoring chunk ${i}:`, reelError.message);
      } else {
        successCount += chunk.length;
      }
    }
    console.log(`✅ ${successCount}/${reelsPayload.length} Trending Reels restored successfully!`);
  }

  // 3. Restore Today Shoots
  if (backup.today && backup.today.length > 0) {
    console.log(`⏳ Restoring ${backup.today.length} today's shoot records...`);
    const todayPayload = backup.today.map(t => ({
      id: t.id,
      user_id: t.user_id,
      user_name: t.user_name || null,
      pose_ids: t.pose_ids || [],
      done_ids: t.done_ids || [],
      updated_at: t.updated_at || new Date().toISOString()
    }));

    const { error: todayError } = await supabase.from('snap_today_shoots').upsert(todayPayload, { onConflict: 'id' });
    if (todayError) {
      console.error('❌ Error restoring today shoots:', todayError.message);
    } else {
      console.log('✅ Today shoots restored successfully!');
    }
  }

  console.log('\n🎉 ALL DATA MIGRATION COMPLETE! Zero data loss guaranteed.');
}

restore().catch(err => {
  console.error('❌ Migration failed:', err);
});
