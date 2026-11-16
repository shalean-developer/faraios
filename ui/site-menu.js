/* Homepage navigation behaviour, shared by public content pages. */
(() => {
  const button = document.querySelector('.site-header .menu');
  const navigation = document.querySelector('.site-header #navigation');
  if (!button || !navigation) return;
  const setOpen = open => {
    button.setAttribute('aria-expanded', String(open));
    navigation.classList.toggle('open', open);
    const path = button.querySelector('svg path');
    if (path) path.setAttribute('d', open ? 'm6 6 12 12M18 6 6 18' : 'M4 6h16M4 12h16M4 18h16');
  };
  button.addEventListener('click', () => setOpen(button.getAttribute('aria-expanded') !== 'true'));
  navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && button.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      button.focus();
    }
  });
})();
