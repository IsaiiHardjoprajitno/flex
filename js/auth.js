/* Supabase authentication gate for the protected FieldOps workspace. */

(function () {
  const client = window.supabase.createClient(window.supabaseConfig.url, window.supabaseConfig.anonKey);
  let signUpMode = false;

  function setSignedIn(isSignedIn) {
    const app = document.querySelector('.app-container');
    const gate = document.getElementById('authGate');
    if (app) app.hidden = !isSignedIn;
    if (gate) gate.hidden = isSignedIn;
    if (isSignedIn) window.db?.syncRemote();
  }

  function showMessage(message) {
    const element = document.getElementById('authMessage');
    if (element) element.textContent = message || '';
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    const submitText = document.getElementById('authSubmitText');
    submitText.textContent = signUpMode ? 'Creating account...' : 'Signing in...';
    showMessage('');

    const result = signUpMode
      ? await client.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: 'https://isaiihardjoprajitno.github.io/flex/' }
      })
      : await client.auth.signInWithPassword({ email, password });

    if (result.error) {
      showMessage(result.error.message);
      submitText.textContent = signUpMode ? 'Create Account' : 'Sign In';
      return;
    }

    if (signUpMode && !result.data.session) {
      showMessage('Account created. Check your email to confirm your account, then sign in.');
      submitText.textContent = 'Create Account';
      return;
    }

    setSignedIn(true);
  }

  function bind() {
    setSignedIn(false);
    document.getElementById('authForm').addEventListener('submit', handleSubmit);
    document.getElementById('authModeButton').addEventListener('click', () => {
      signUpMode = !signUpMode;
      document.getElementById('authSubmitText').textContent = signUpMode ? 'Create Account' : 'Sign In';
      document.getElementById('authModeButton').textContent = signUpMode ? 'Already have an account? Sign in' : 'Need an account? Create one';
      showMessage('');
    });
    document.getElementById('authSignOut').addEventListener('click', () => client.auth.signOut());
    client.auth.onAuthStateChange((_event, session) => setSignedIn(Boolean(session)));
    client.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
  }

  window.supabaseAuth = { client };
  window.addEventListener('DOMContentLoaded', bind);
})();