const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://efdinvkvicawcqiqpixe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmZGludmt2aWNhd2NxaXFwaXhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MjIzMTIsImV4cCI6MjA5MzM5ODMxMn0.7lzb40vnoTuv4DlDf90_u_LzE6Veq_dmYLDIlwHZUwM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  // 1. Authenticate or register
  const email = 'test_debug@anime.local';
  const password = 'Test_password123!';
  
  let { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (authError) {
    console.log('Login failed, registering...', authError.message);
    const { data: regData, error: regError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username: 'test_debug' } }
    });
    if (regError) {
      console.error('Registration failed:', regError);
      return;
    }
    authData = regData;
  }
  
  const user = authData.user;
  console.log('Logged in as:', user.id);
  
  // 2. Try inserting into user_lists
  const animeId = "1";
  console.log('Trying to insert into user_lists...');
  const { error: listError } = await supabase
    .from('user_lists')
    .upsert({
      user_id: user.id,
      anime_id: animeId,
      title: 'Cowboy Bebop',
      image: 'https://cdn.myanimelist.net/images/anime/4/19644.jpg',
      episodes: 26,
      watched_episodes: 1,
      rating: 10,
      status: 'watching'
    }, { onConflict: 'user_id, anime_id, status' });
    
  if (listError) {
    console.error('user_lists error:', listError);
  } else {
    console.log('user_lists insert successful!');
  }
  
  // 3. Try fetching user_lists
  const { data: fetchList, error: fetchError } = await supabase
    .from('user_lists')
    .select('*')
    .eq('user_id', user.id);
  console.log('user_lists fetch:', fetchError || fetchList);
  
  // 4. Try inserting into comments
  console.log('Trying to insert into comments...');
  const { error: commentError } = await supabase
    .from('comments')
    .insert({
      anime_id: animeId,
      user_id: user.id,
      username: 'test_debug',
      content: 'This is a test comment',
      rating: 10
    });
    
  if (commentError) {
    console.error('comments error:', commentError);
  } else {
    console.log('comments insert successful!');
  }
}

test();
