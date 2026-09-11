import { state } from '../core/state.js';
const logoMarkup = `<img src="assets/logo.png" alt="Nura" class="brand-image">`;
export function authView() {
    const form = state.authMode === 'login' ? loginForm() : registerForm();
    const switchText = state.authMode === 'login'
        ? `New to Nura? <button class="link" data-action="show-register">Create account</button>`
        : `Already here? <button class="link" data-action="show-login">Sign in</button>`;
    return `
    <section class="auth">
      <div class="brand-mark">${logoMarkup}</div>
      <div>
        <h1>Nura</h1>
        <p class="auth-sub">A softer kind of messenger. Private conversations, expressive profiles and little moments that feel alive.</p>
      </div>
      <div class="auth-card">${form}</div>
      <div class="auth-switch">${switchText}</div>
    </section>
  `;
}
function loginForm() {
    return `
    <form id="loginForm">
      <div class="field">
        <label for="login-id">Username</label>
        <input id="login-id" name="identity" required autocomplete="username" placeholder="your_username">
      </div>
      <div class="field">
        <label for="login-pw">Password</label>
        <div class="password-wrap">
          <input id="login-pw" name="password" type="password" required autocomplete="current-password" placeholder="••••••••">
          <button type="button" class="password-toggle" data-password="login-pw" aria-label="Show password"><i class="ri-eye-line"></i></button>
        </div>
      </div>
      <button class="btn primary auth-submit" type="submit">Sign in <i class="ri-arrow-right-line"></i></button>
      <p class="muted demo-hint">Demo account: demo / Nura12345</p>
    </form>
  `;
}
function registerForm() {
    return `
    <form id="registerForm">
      <div class="field">
        <label for="reg-user">Username</label>
        <input id="reg-user" name="username" required minlength="3" maxlength="24" placeholder="amir_01">
      </div>
      <div class="field">
        <label for="reg-name">Display name</label>
        <input id="reg-name" name="displayName" required placeholder="Amir">
      </div>
      <div class="field">
        <label for="reg-pw">Password</label>
        <div class="password-wrap">
          <input id="reg-pw" name="password" type="password" required minlength="8" placeholder="At least 8 characters">
          <button type="button" class="password-toggle" data-password="reg-pw" aria-label="Show password"><i class="ri-eye-line"></i></button>
        </div>
      </div>
      <div class="field">
        <label for="reg-bio">Bio</label>
        <textarea id="reg-bio" name="bio" placeholder="A little about you..."></textarea>
      </div>
      <button class="btn primary auth-submit" type="submit">Create Nura account <i class="ri-sparkling-2-line"></i></button>
    </form>
  `;
}
//# sourceMappingURL=auth.js.map