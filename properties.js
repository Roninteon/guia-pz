const themeToggle = document.querySelector('#themeToggle');

function setTheme(dark) {
  document.body.dataset.theme = dark ? 'dark' : 'light';
  const icon = themeToggle.querySelector('.theme-icon');
  const label = themeToggle.querySelector('.theme-label');
  icon.textContent = dark ? '☀' : '☾';
  label.textContent = dark ? 'Modo claro' : 'Modo oscuro';
  themeToggle.setAttribute('aria-label', dark ? 'Activar modo claro' : 'Activar modo oscuro');
  document.querySelector('meta[name="theme-color"]').content = dark ? '#19231e' : '#f8f8f4';
  try { localStorage.setItem('guiapz-theme', dark ? 'dark' : 'light'); } catch { /* Preferencia temporal. */ }
}

themeToggle.addEventListener('click', () => setTheme(document.body.dataset.theme !== 'dark'));
try {
  if (localStorage.getItem('guiapz-theme') === 'dark') setTheme(true);
} catch { /* Usa el tema claro si el navegador bloquea el almacenamiento. */ }
document.querySelector('#propertiesYear').textContent = new Date().getFullYear();
