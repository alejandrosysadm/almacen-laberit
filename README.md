# Almacén Laberit

Aplicación web de inventario para el almacén de Laberit: equipos, monitores, soportes de monitor, switches, firewalls y accesorios, con entradas y salidas por lector de códigos, etiquetas QR, exportación a Excel/CSV, registro de actividad y mapa 3D del almacén.

Funciona en la red interna sin acceso a Internet: todas las librerías y tipografías van incluidas en `public/`.

## Requisitos

- Node.js 20 o superior (LTS recomendado).
- Windows Server 2016+ o cualquier Linux x64/arm64. También se puede ejecutar con Docker.
- La dependencia `better-sqlite3` descarga un binario precompilado al instalar. Si el servidor no tiene salida a Internet, ejecuta `npm ci` en un equipo con conexión y misma plataforma (mismo SO y versión de Node) y copia la carpeta completa con `node_modules`.

## Puesta en marcha rápida

```bash
npm ci --omit=dev
cp .env.example .env        # en Windows: copy .env.example .env
npm start
```

Abre `http://servidor:8080`. La primera vez te pedirá crear la cuenta de administrador. Si quieres que nadie más pueda hacerlo antes que tú, define `SETUP_TOKEN` en `.env` o crea el administrador por consola:

```bash
npm run admin -- create-admin alejandro "Alejandro Ferrandiz"
```

## Instalación como servicio

### Windows Server

1. Instala Node.js LTS.
2. Descarga NSSM (https://nssm.cc) y deja `nssm.exe` (win64) en la carpeta de la aplicación o en el PATH.
3. En PowerShell como administrador, desde la carpeta de la aplicación:

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy\instalar-servicio-windows.ps1 -Puerto 8080
```

El script instala dependencias, crea el servicio `AlmacenLaberit` con arranque automático y logs rotativos en `logs\`, abre el puerto en el firewall (perfiles Dominio y Privado) y programa una copia diaria de la base de datos a las 02:30.

### Linux (systemd)

```bash
sudo cp -r almacen-laberit /opt/
cd /opt/almacen-laberit && sudo npm ci --omit=dev && sudo cp .env.example .env
sudo useradd --system --home /opt/almacen-laberit --shell /usr/sbin/nologin almacen
sudo mkdir -p data backups && sudo chown -R almacen:almacen /opt/almacen-laberit
sudo cp deploy/almacen-laberit.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now almacen-laberit
```

Copia diaria con cron (`sudo crontab -u almacen -e`):

```
30 2 * * * cd /opt/almacen-laberit && /usr/bin/node scripts/backup.js
```

### Docker

```bash
docker compose up -d --build
```

Los datos quedan en `./data` del host. Copia: `docker exec almacen-laberit node scripts/backup.js /data/backups`.

## HTTPS

Usa siempre HTTPS en producción: la sesión viaja en una cookie y las contraseñas en el inicio de sesión. Además, sin HTTPS el navegador no deja usar la cámara del móvil.

Para pruebas rápidas se puede generar un certificado autofirmado (el navegador mostrará un aviso que habrá que aceptar):

```bash
mkdir -p certs
openssl req -x509 -newkey rsa:2048 -nodes -days 825 -keyout certs/almacen.key -out certs/almacen.crt \
  -subj "/CN=almacen.laberit.local" -addext "subjectAltName=DNS:almacen.laberit.local,IP:172.16.1.92"
```

Para producción, mejor un certificado de vuestra CA interna o de Let's Encrypt.

- **Certificado directo en la app.** En `.env`, `TLS_PFX` y `TLS_PFX_PASSPHRASE` (un PFX de vuestra CA interna o exportado del almacén de certificados de Windows), o bien `TLS_CERT` y `TLS_KEY` en PEM.
- **Proxy inverso.** Deja la app en `HOST=127.0.0.1` y pon delante IIS (`deploy/iis-web.config`) o nginx (`deploy/nginx-almacen.conf`). En `.env`: `TRUST_PROXY=1` y `COOKIE_SECURE=1`. El tiempo real usa Server-Sent Events en `/api/events`, así que el proxy no debe almacenar en búfer esa ruta (las plantillas ya lo contemplan).

## Pedidos, recogida y albaranes

**Clientes y sedes.** En Ajustes → Clientes y albaranes se dan de alta las sedes de cada cliente (clínicas, oficinas…) y los datos de vuestra empresa que aparecen en los albaranes (razón social, CIF, dirección, teléfono y texto al pie).

**Pedidos.** Un pedido indica cliente, sede de destino, fecha prevista y líneas de material, por ejemplo "3 × Equipos, tipo Portátil, marca Lenovo" o "10 × Soportes de monitor". Al pulsar **Reservar stock**, el sistema aparta unidades en stock que encajen, empezando por las más antiguas, las marca como *Reservado* e indica si falta material. Los lotes por cantidad se separan automáticamente.

**Recogida.** La **lista de recogida** en PDF ordena las unidades por estantería y balda para recorrer el almacén una sola vez. En pantalla, cada equipo se confirma escaneándolo (lector USB o cámara) o marcando su casilla. Si se escanea un equipo equivalente que está en stock, sustituye automáticamente a uno reservado pendiente.

**Envío.** **Enviar y generar albarán** crea el albarán con numeración correlativa (ALB-año-número), pasa el material a *Enviado* y guarda en cada equipo el destino y el número de albarán.

**Salida rápida.** En Entradas y salidas se escanean los equipos con número de serie y, en **Material sin número de serie**, se añaden los lotes por cantidad (soportes, accesorios…) indicando cuántas unidades salen. Se descuentan del lote y, si se marca **Generar albarán de entrega**, van en el mismo PDF sin necesidad de crear un pedido.

Todos los albaranes quedan en el apartado **Albaranes** para volver a descargarlos o reenviarlos por correo.

**Configuración del albarán** (Ajustes → Clientes y albaranes): si «Generar albarán» viene marcado en las salidas, la sede por defecto, las columnas de la tabla y su orden (cualquier campo del material: país, condición, procesador, RAM…), qué bloques aparecen (emisor, transportista, observaciones, firmas, texto de conformidad) y el envío por correo.

**Numeración, título y lista de recogida** (misma pantalla): prefijo de albaranes y pedidos, número de dígitos y si incluye el año; título del albarán (por ejemplo, «Albarán de salida»); y en la lista de recogida, su título, columnas y orden, si agrupa por ubicación, el resumen del pedido y la línea de firma. Las columnas del PDF se ajustan solas a su contenido.

**Títulos de columna y columnas combinadas:** cada columna elegida puede tener su propio título en el documento (por ejemplo, «Descripción» → «Equipo»; la descripción se forma con la marca y el modelo, o el tipo si no los hay). Las columnas combinadas juntan varios campos con una plantilla: «Cuenta» con `{cuenta}{dominio}` da `usuario@ivcevidensia.es`. Sirven en el albarán, la lista de recogida y el correo.

**Eliminar albaranes:** desde Albaranes (permiso de eliminar material). Se puede devolver a stock su material si el envío no llegó a salir; si venía de un pedido, el pedido pasa a cancelado. El número no se reutiliza.

**Envío por correo:** al marcar «Enviar el albarán por correo» en una salida o al enviar un pedido, se pregunta a quién enviarlo (los destinatarios por defecto y el correo de la sede, que se pueden quitar, más los que se añadan) y el mensaje. El correo lleva el resumen del material y el PDF adjunto. Asunto y mensaje admiten {albaran}, {cliente}, {sede}, {fecha}, {unidades}, {transportista}, {referencia}, {pedido}, {usuario} y {empresa}.

## Avisos de stock

En Ajustes → Avisos de stock se definen grupos de material con su mínimo, por ejemplo «Portátiles» (Equipos con tipo = Portátil), «Sobremesas» o «Sobremesas táctiles». Se cuenta el material «En stock» que no está reservado. Los grupos por debajo del mínimo aparecen en Inicio y, si hay destinatarios configurados, se envía un correo cuando el stock baja del mínimo. No se repite en cada cambio, solo el recordatorio cada X días mientras no se reponga.

## Almacenes y permisos por cliente

En **Ajustes → Almacenes** se crean los almacenes, cada uno con su distribución (estanterías, zonas y mapa 3D), y se asignan los clientes. Cada cliente pertenece a un solo almacén, así que su material, pedidos y albaranes son de ese almacén. Si hay varios almacenes, en la barra superior aparece un selector para trabajar con uno o con todos.

En **Usuarios → Editar**, cada usuario tiene **acceso total** o **solo los almacenes y clientes marcados**. Un almacén marcado sin clientes no da acceso a nada. El servidor filtra todo según ese acceso: inventario, pedidos, albaranes, registro de actividad, tiempo real y exportaciones. Lo que el usuario puede hacer dentro de su acceso lo sigue marcando su rol. Ajustes, usuarios y copias de seguridad requieren acceso total. Los administradores siempre tienen acceso total.

**Responsable de almacén:** con el permiso «Configurar sus almacenes y las sedes de sus clientes» (Roles y permisos), un usuario con acceso limitado ve en Ajustes solo sus almacenes (plano, forma, estanterías, huecos, altillos, puertas y elementos) y las sedes de sus clientes. No puede crear ni borrar almacenes, asignar clientes ni tocar ajustes generales; los usuarios los gestiona el administrador.

Al actualizar desde una versión anterior, se crea un «Almacén principal» con todos los clientes, y los usuarios existentes conservan el acceso total hasta que se les cambie.

## Plano y elementos del almacén

En Ajustes → Almacenes, además de estanterías, zonas y puertas:

- **Plano de fondo:** se sube una imagen o un PDF del plano y se coloca en el suelo a la medida del almacén (ancho × fondo), con transparencia ajustable. Si la proporción no coincide, un botón ajusta el fondo para que no se deforme.
- **Elementos del plano:** pasillos con nombre, pilares, tabiques, oficinas, mesas de trabajo, puestos de embalaje, extintores y salidas de emergencia, con posición, medidas y giro.
- **Estanterías elevadas:** la columna «Altura (m)» sitúa una estantería o leja por encima del suelo.

Todo aparece en el mapa 3D, en la vista en planta y en el dibujo del panel de inicio.

## Forma del almacén y altillos

- **Forma:** en Ajustes → Almacenes → «Forma del almacén», el contorno puede ser un rectángulo o un polígono (formas rápidas en L, U y T, ajustables vértice a vértice). Las paredes del mapa siguen el contorno, y las puertas se colocan en cualquiera de sus tramos.
- **Plantas y altillos:** cada altillo tiene nombre, altura y superficie. Con «Editando: …» se elige la planta a la que van las estanterías, zonas y elementos que se añaden. En el mapa 3D el altillo aparece como una plataforma con pilares y su contenido encima, y el selector «Planta» muestra todas o solo una. El nombre de la ubicación indica la planta, por ejemplo «Estantería M1 (Altillo)».

## Ruta de recogida y mapa de calor

- **Ruta en el mapa:** en un pedido en preparación, el botón «Ruta en el mapa» dibuja en el mapa 3D el recorrido desde la primera puerta del almacén por cada ubicación con material reservado, en el orden más corto (vecino más cercano mejorado con 2-opt, distancias en ángulo recto). El panel lateral lista las paradas con lo que hay que coger en cada balda. Al confirmar la recogida, las paradas pasan a verde en tiempo real.
- **Mapa de calor:** en el panel del mapa 3D se puede colorear cada estantería por ocupación, antigüedad media del material o movimientos de los últimos 30 días, de verde a rojo.

## Varios almacenes por cliente y traspasos

Un cliente puede asignarse a varios almacenes (Ajustes → Almacenes) y cada equipo indica en qué almacén está. Al actualizar desde una versión anterior, cada equipo queda en el almacén donde estaba su cliente.

- **Pedidos:** si el cliente está en varios almacenes, se elige desde cuál se prepara («Preparar desde»).
- **Traspasos:** en Entradas y salidas → «Traspaso entre almacenes» se elige cliente, origen y destino, y se escanean los equipos o se añade material por cantidad. Se genera un albarán de traspaso (prefijo TRA) y el material queda «En tránsito», sin contar como disponible, hasta que en Albaranes y documentos se pulsa «Recibir».

## Retiradas y certificados de borrado

- **Retirada:** en Entradas y salidas → «Retirada de equipos del cliente» se registran los equipos recogidos. Los que no estaban en el inventario se dan de alta. Se genera un albarán de retirada (prefijo RET) y los equipos quedan como «Retirado».
- **Borrado de datos:** seleccionando equipos en el inventario → «Registrar borrado», con método (NIST 800-88 Clear o Purge, borrado criptográfico, Secure Erase, sobrescritura, destrucción física), herramienta, fecha, técnico y resultado. Queda en la ficha y en el historial de cada equipo.
- **Certificado de borrado:** seleccionando equipos con borrado registrado → «Certificado de borrado». Genera un PDF (prefijo CERT) con los equipos, el método de cada uno, la declaración conforme a NIST SP 800-88 y al artículo 32 del RGPD, y los recuadros de firma.

## Más ajustes

- **Retiradas y certificados** (Ajustes → Clientes y albaranes): condición de los equipos retirados, título, texto (con {empresa}, {cliente}, {metodos}, {fecha}, {certificado}, {equipos}), rótulos de firma y pie del certificado. Los métodos y herramientas de borrado son listas en «Listas y marcas».
- **Correos** (Ajustes → Correos): asunto y texto de la invitación, la recuperación de contraseña, el aviso de contraseña cambiada y el aviso de stock bajo, con sus variables. Vacío = texto de siempre.
- **Panel de inicio** (Ajustes → General): mostrar u ocultar cada bloque, incluido el dibujo del almacén.
- **Tipos de elementos del plano** (Ajustes → Almacenes): nombre, color y medidas de cada tipo, y tipos propios.

## Huecos y etiquetas de ubicación

- **Huecos:** en Ajustes → Almacenes, la columna «Huecos» indica cuántos huecos tiene cada balda de una estantería. La ubicación de un equipo pasa a ser exacta, como `B2-3-4` (estantería, balda, hueco), y se ve en la ficha, la lista de recogida, la ruta y el mapa 3D.
- **Etiquetas de ubicación:** el botón «Etiquetas de ubicación» genera una hoja imprimible con una etiqueta QR por balda (o por hueco, si los hay).
- **Colocar escaneando:** en Entradas y salidas → «Colocar en ubicación», se escanea la etiqueta de la ubicación y después los equipos; cada uno queda ubicado al momento, con su historial. Una etiqueta escaneada en el buscador superior abre el mapa en esa estantería.

## Estados con significado

En **Ajustes → General → Estados con significado** se indica qué estados de la lista cuentan como disponibles (stock, avisos y reservas), cuál es el de reservado, el de enviado y cuáles son de baja. Al **renombrar** un valor en cualquier lista (estados, clientes, marcas…) y guardar, el cambio se aplica a todo el material, pedidos, albaranes, almacenes, sedes, permisos y estados con significado.

## Color de la aplicación

En Ajustes → General se elige el color principal. Se aplica a la aplicación (en modo claro y oscuro), a los PDF y a los correos.

## Columnas del inventario

En cada categoría, el botón **Columnas** permite elegir qué columnas se ven, incluidas las columnas combinadas (por ejemplo, «Cuenta» = `{cuenta}{dominio}`), que también se pueden crear desde ese mismo menú. La selección se guarda en el navegador de cada usuario, y la búsqueda encuentra también el valor combinado.

## Leer los números de serie de un albarán

En **Entradas y salidas → Entrada de material**, el botón **Leer albarán** permite hacer una foto del albarán del proveedor o subir su PDF. La aplicación detecta los números de serie y, tras revisarlos, los añade a la entrada junto con el número de albarán.

- **Gratuito y local:** todo se procesa en el navegador del usuario con Tesseract (OCR libre) y pdf.js. No se envía nada a servicios externos ni hace falta conexión a Internet.
- **PDF con texto** (los que envían los proveedores por correo): lectura exacta e inmediata.
- **Fotos y PDF escaneados:** OCR de unos segundos por página. En móviles Android con Chrome o Edge se leen además los códigos de barras de la foto, que es lo más fiable.
- **Cómo decide qué es un número de serie:** reconoce tablas con columna «Nº de serie», «S/N» o «Serial» (y, si la cabecera no se lee, la columna con códigos distintos en cada fila), lo que aparece junto a esas palabras y las listas que les siguen. Descarta CIF, teléfonos, fechas, IBAN, EAN y referencias de producto (P/N, Ref., SKU…). Lo dudoso aparece como «Posible» y desmarcado.
- **Errores típicos del OCR** (O y 0, I y 1, S y 5, A y 4…): cuando varios números del mismo lote comparten formato, se marca el que no encaja con «Revisar» y la corrección sugerida.

Siempre se muestra la lista para revisarla antes de añadirla. La primera vez que un usuario lo usa, el navegador descarga del servidor el motor de OCR (unos 7 MB), que después queda en caché.

## Lector con la cámara del móvil

Junto a los campos de número de serie (entradas, salidas, recogida, búsqueda, mapa y alta de equipos) hay un botón de cámara que lee códigos de barras y los QR de las etiquetas. En los campos de varias líneas se puede escanear seguido.

Los navegadores solo permiten usar la cámara en páginas **HTTPS**, así que hace falta configurar HTTPS (siguiente apartado). Funciona con Chrome y Edge en Android, Safari en iPhone y en ordenadores con webcam.

## Verificación en dos pasos

Cada usuario puede activarla en **Mi cuenta** con Microsoft Authenticator, Google Authenticator o cualquier aplicación TOTP. Al activarla recibe 10 **códigos de recuperación** de un solo uso para entrar si pierde el móvil.

Al iniciar sesión se puede marcar **No volver a pedirlo en este equipo**. El equipo queda recordado durante los días indicados en Ajustes → General (30 por defecto, 0 para pedirlo siempre). Cambiar la contraseña, restablecerla o desactivar el doble factor hace que se olviden todos los equipos recordados.

En Ajustes → General se puede hacer **obligatoria** para administradores o para todos. Quien no la tenga activada tendrá que configurarla al entrar.

Si alguien pierde el móvil y los códigos, un administrador puede quitársela desde Usuarios → Editar, o por consola con `npm run admin -- mfa-reset usuario`.

Los secretos se guardan cifrados con AES-256-GCM. La clave está en `data/secret.key`: **inclúyela en las copias de seguridad**. `npm run backup` ya la copia junto a la base de datos. Sin ella, al restaurar en otro servidor habría que reactivar el doble factor de todos.

## Correo: recuperar contraseñas e invitaciones

Cada usuario tiene su correo (no puede repetirse entre cuentas). Con el correo configurado:

- En el inicio de sesión aparece **¿Has olvidado tu contraseña?**. El usuario escribe su usuario o su correo y recibe un enlace para elegir una contraseña nueva. Por seguridad, la respuesta es la misma exista o no la cuenta.
- Al crear un usuario, el administrador puede marcar **Enviar invitación por correo**: no hace falta inventarle una contraseña, la elige él con el enlace.
- En **Usuarios**, el botón **Enviar enlace** manda a cualquier usuario un enlace para restablecer su contraseña.
- Cada usuario puede cambiar su correo desde **Mi cuenta** (menú con su nombre), confirmando con su contraseña.
- Cuando se cambia una contraseña, el usuario recibe un aviso por correo.

Los enlaces son de un solo uso, caducan (30 minutos para restablecer y 72 horas para invitaciones, configurable), y al usarlos se cierran todas las sesiones abiertas de esa cuenta. Hay límite de solicitudes por equipo y por usuario.

Para activarlo, añade al `.env` al menos `PUBLIC_URL`, `SMTP_HOST` y `SMTP_FROM` (y `SMTP_USER` y `SMTP_PASS` si tu servidor pide autenticación) y reinicia el servicio. Tienes ejemplos para Microsoft 365 y para un relay interno en `.env.example`. En **Ajustes → General** verás si está activo y puedes enviarte un correo de prueba.

Con Microsoft 365, el buzón que envía necesita tener activado **SMTP autenticado** (centro de administración de Microsoft 365 → usuario → Correo → Administrar aplicaciones de correo electrónico). Si vuestro tenant lo tiene desactivado de forma global, usad un conector de relay o el servidor de correo interno.

Sin correo configurado todo sigue funcionando: el administrador restablece las contraseñas desde **Usuarios → Contraseña**, o por consola con `npm run admin -- reset usuario`.

## Seguridad

- Contraseñas con scrypt (N=32768) y sal aleatoria por usuario. Nunca se guardan ni se registran en claro.
- Sesiones con token aleatorio de 256 bits en cookie `HttpOnly` y `SameSite=Strict`; en base de datos solo se guarda su hash. Caducan por inactividad (configurable en Ajustes) y como máximo a las `SESSION_MAX_HOURS`.
- Todos los permisos se comprueban en el servidor según el rol. Ocultar un botón en la interfaz no es la barrera: la API rechaza la acción.
- Bloqueo de la cuenta tras varios intentos fallidos (configurable) y límite de intentos por IP.
- Protección CSRF (SameSite estricto, cabecera obligatoria y comprobación de origen) y cabeceras de seguridad, incluida una CSP que solo permite recursos propios.
- Números de serie únicos garantizados por índice en la base de datos.
- Registro de actividad de altas, cambios, movimientos, exportaciones, accesos e intentos fallidos.

## Mantenimiento

| Tarea | Comando |
|---|---|
| Listar usuarios | `npm run admin -- list` |
| Restablecer contraseña (genera una temporal) | `npm run admin -- reset usuario` |
| Desbloquear cuenta | `npm run admin -- unlock usuario` |
| Crear administrador | `npm run admin -- create-admin usuario "Nombre"` |
| Asignar correo a un usuario | `npm run admin -- set-email usuario correo@laberit.com` |
| Quitar la verificación en dos pasos | `npm run admin -- mfa-reset usuario` |
| Copia de la base de datos en caliente | `npm run backup` o `npm run backup -- D:\Copias` |

Para restaurar una copia `.db`, para el servicio, sustituye `data/almacen.db` por la copia (y borra `almacen.db-wal` y `almacen.db-shm` si existen), copia también `secret.key` a `data/` y arráncalo.

Desde la propia aplicación (Ajustes → Copias de seguridad) también puedes exportar e importar una copia JSON completa con inventario, historial, ajustes y, opcionalmente, usuarios.

## Traer los datos de la versión publicada en Claude

En la versión publicada, ve a Ajustes → Copias de seguridad → Descargar copia JSON. En esta instalación, Ajustes → Copias de seguridad → Restaurar copia. Se importan el inventario, su historial y los ajustes. Los usuarios no se pueden trasladar porque aquella versión cifraba las contraseñas de otra forma: créalos de nuevo aquí.

## Actualizar

Para el servicio, sustituye los archivos de la aplicación conservando `data/`, `.env` y `backups/`, ejecuta `npm ci --omit=dev` y vuelve a arrancar. La base de datos se adapta sola al arrancar.

## Estructura

```
server.js                 API, sesiones, permisos y tiempo real
lib/db.js                 Esquema SQLite
lib/password.js           Hash de contraseñas
lib/env.js                Carga del archivo .env
lib/mail.js               Envío de correo y plantillas
lib/orders.js             Pedidos, reservas, recogida y albaranes
lib/pdf.js                PDF de albaranes y listas de recogida
lib/totp.js               Códigos de verificación en dos pasos
lib/secretbox.js          Cifrado de los secretos del doble factor
scripts/admin.js          Gestión de usuarios por consola
scripts/backup.js         Copia de la base de datos
public/                   Interfaz (index.html, app.js, app.css, librerías y fuentes locales)
deploy/                   Servicio de Windows, systemd, IIS y nginx
data/almacen.db           Base de datos (se crea al arrancar)
```

## API

Todas las rutas están bajo `/api` y requieren sesión, salvo `bootstrap`, `setup`, `login`, `logout` y las de `/password`. Las peticiones que modifican datos deben llevar la cabecera `X-Requested-With: fetch`.

| Método y ruta | Permiso | Uso |
|---|---|---|
| `GET /bootstrap` | público | Estado inicial y usuario de la sesión |
| `POST /setup` | público, solo sin usuarios | Crear el primer administrador |
| `POST /login`, `POST /logout` | público | Iniciar y cerrar sesión |
| `GET/PUT /me`, `POST /me/password` | sesión | Datos propios, correo y cambio de contraseña |
| `POST /password/forgot`, `GET /password/token/:t`, `POST /password/reset` | público | Recuperación de contraseña por correo |
| `GET /items` | inv.view | Todo el inventario |
| `POST /items` | inv.create / inv.edit / inv.move | Alta o modificación (hasta 1000 por petición) |
| `POST /items/delete` | inv.delete | Eliminar registros |
| `GET/PUT /settings` | sesión / settings.manage | Ajustes, listas, categorías, almacén y roles |
| `GET/POST /audit` | audit.view / sesión | Registro de actividad |
| `GET/POST/PUT/DELETE /users…` | users.manage | Gestión de usuarios |
| `POST /users/:id/send-reset` | users.manage | Enviar enlace de restablecimiento |
| `GET /mail/status`, `POST /mail/test` | settings.manage | Estado y prueba del correo |
| `POST /login/mfa`, `/me/mfa/…` | sesión | Verificación en dos pasos |
| `GET/POST /orders…` | inv.view / inv.move | Pedidos: crear, reservar, recoger, enviar, cancelar |
| `GET /orders/:id/picking.pdf` | inv.view | Lista de recogida en PDF |
| `GET /deliveries`, `GET /deliveries/:id/pdf`, `POST /deliveries` | inv.view / inv.move | Albaranes de entrega |
| `GET /backup`, `POST /restore` | settings.manage | Copia y restauración JSON |
| `GET /events` | sesión | Cambios en tiempo real (Server-Sent Events) |

## Licencias de terceros

three.js (MIT), SheetJS Community Edition (Apache 2.0), QRCode.js (MIT), html5-qrcode (Apache 2.0), PDFKit (MIT), Tesseract.js (Apache 2.0) y pdf.js (Apache 2.0) y la tipografía Archivo (SIL Open Font License). Sus licencias están junto a cada archivo en `public/vendor` y `public/fonts`.


## Actualizar con GitHub

El proyecto está preparado para un repositorio privado. El archivo `.gitignore` impide subir datos (`data/`, `backups/`), certificados (`certs/`, `*.pfx`) y secretos (`.env`, `secret.key`).

- `npm test` comprueba que todo el código es válido y que el servidor arranca con una base de datos vacía.
- `./scripts/actualizar.sh` (en el servidor) hace una copia de seguridad, descarga los cambios, ejecuta `npm test`, instala dependencias si cambiaron y reinicia el servicio. Si la comprobación falla, no aplica la versión nueva.
- `./scripts/actualizar.sh volver` vuelve a la versión anterior a la última actualización.

Para que el script pueda reiniciar el servicio sin pedir contraseña, añade con `sudo visudo -f /etc/sudoers.d/almacen` la línea:

    laberit ALL=(root) NOPASSWD: /usr/bin/systemctl restart almacen-laberit
