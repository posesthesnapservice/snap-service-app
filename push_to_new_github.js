/**
 * SNAP SERVICE - PUSH TO NEW GITHUB REPO
 * Pushes all code and latest commits directly to the new GitHub account.
 *
 * Usage:
 *   node push_to_new_github.js <NEW_REPO_URL> <GITHUB_TOKEN>
 */

const git = require('isomorphic-git');
const http = require('isomorphic-git/http/node');
const fs = require('fs');

const repoUrl = process.argv[2];
const token = process.argv[3];

if (!repoUrl || !token) {
  console.error('❌ Missing arguments.');
  console.error('Usage: node push_to_new_github.js https://github.com/USERNAME/REPO_NAME <GITHUB_PERSONAL_ACCESS_TOKEN>');
  process.exit(1);
}

async function run() {
  console.log(`🚀 Pushing main branch to: ${repoUrl}`);

  try {
    const pushResult = await git.push({
      fs,
      http,
      dir: '.',
      url: repoUrl,
      ref: 'main',
      force: true,
      onAuth: () => ({
        username: token,
        password: ''
      })
    });

    console.log('✅ Successfully pushed to new GitHub repository!', pushResult);
  } catch (err) {
    console.error('❌ Push error:', err);
  }
}

run();
