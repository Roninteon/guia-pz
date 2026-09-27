# Cómo actualizar las fichas de GuiaPZ

El contenido de los negocios vive en `businesses.js`; la interfaz y sus interacciones están en `app.js`. Para agregar una ficha, duplicá un objeto dentro de `window.GUIAPZ_PLACES` y actualizá sus datos.

## Campos principales

- `id`: número único.
- `name`: nombre visible.
- `categories`: una o varias categorías: `Restaurantes`, `Cafés`, `Supermercados`, `Tiendas`, `Gimnasios` o `Hospedaje`.
- `sections`: uno o varios rubros principales que aparecen como tarjetas visuales: `Comercio`, `Salud y bienestar`, `Automotriz`, `Veterinaria`, `Servicios`, `Tecnología`, `Turismo`, `Hospedaje`, `Restaurantes`, `Servicios financieros`, `Construcción`, `Agroindustria`, `Industria`, `Educación` o `Jardinería`. Una tarjeta aparece disponible cuando al menos una ficha tiene ese rubro; mientras tanto indica “Próximamente”.
- `district`: uno de los distritos del selector. Usá el nombre tal como aparece en `app.js`.
- Distritos disponibles: `San Isidro de El General`, `El General`, `Daniel Flores`, `Rivas`, `San Pedro`, `Platanares`, `Pejibaye`, `Cajón`, `Barú`, `Río Nuevo`, `Páramo` y `La Amistad`.
- `districtConfirmed`: ponelo en `true` solo después de confirmar el distrito.
- `area` y `description`: referencia de zona y descripción del negocio.
- `photos`: lista de imágenes. Cada elemento lleva `src` y `alt`; por ejemplo: `[{src: 'images/cafe-fachada.webp', alt: 'Fachada del café'}]`. Las rutas parten de la carpeta del sitio.
- `address`, `hours` y `contacts`: se muestran solo cuando sus respectivos datos están confirmados.

## Verificación de ubicación y contacto

Para que la ubicación tenga un pin, completá `latitude` y `longitude`, agregá `mapPosition` con posiciones `x` e `y` entre 0 y 100 para el mapa ilustrativo, y cambiá `locationConfirmed` a `true`. Sin esos datos, la ficha no aparece como pin.

Para mostrar botones de contacto, completá los canales reales y confirmados, por ejemplo `contacts: {whatsapp: '50688888888', phone: '+506 8888-8888', instagram: 'negocio'}`, y luego cambiá `contactsConfirmed` a `true`. Los horarios solo aparecen cuando `hoursConfirmed` está en `true`.

Los perfiles incluidos actualmente son datos de demostración. Reemplazalos por información confirmada antes de publicar la guía.

## Mapa distrital

Los límites del mapa interactivo provienen de la capa `limitedistrital_5k` del WFS del Instituto Geográfico Nacional y el SNIT. El SVG integrado conserva los 12 distritos del cantón y simplifica los vértices para su visualización web. La capa original se consulta en `https://geos.snitcr.go.cr/be/IGN_5_CO/wfs`.

## Enfoque y futuras funciones

GuiaPZ es una guía web interactiva para descubrir lugares y negocios de Pérez Zeledón. El contenido actual se enfoca en fichas de lugares organizadas por categorías y distritos.

Ideas para futuras etapas:

- Agregar una sección de bienes raíces con propiedades y casas en venta, además de departamentos en alquiler. Conviene mantener estas publicaciones separadas de las fichas de negocios.
- Incorporar una opción voluntaria de apoyo al proyecto con el mensaje “Invítame a un cafecito o algo para comer”. La interfaz propuesta tendrá aportes rápidos de ₡1.000, ₡2.000, ₡5.000 y ₡10.000, además de un campo para ingresar otro monto.
- Antes de habilitar cobros, elegir y configurar el medio de pago que recibirá las donaciones; los montos y el botón por sí solos no procesan pagos.
