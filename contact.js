const contactForm = document.querySelector('#contactForm');
const contactFormStatus = document.querySelector('#contactFormStatus');

contactForm.addEventListener('submit', event => {
  event.preventDefault();
  if (!contactForm.reportValidity()) return;

  const formData = new FormData(contactForm);
  const subject = encodeURIComponent(`Mensaje para GUIAPZ de ${formData.get('name')}`);
  const body = encodeURIComponent([
    `Nombre: ${formData.get('name')}`,
    `Correo: ${formData.get('email')}`,
    `Teléfono: ${formData.get('phone') || 'No indicado'}`,
    '',
    'Mensaje:',
    formData.get('message')
  ].join('\n'));

  contactFormStatus.textContent = 'Tu dispositivo intentará abrir un borrador de correo. Revisalo y envialo desde tu aplicación; el sitio no recibe ni guarda el mensaje.';
  window.location.href = `mailto:Roninteon@gmail.com?subject=${subject}&body=${body}`;
});
