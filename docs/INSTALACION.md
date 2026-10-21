# Instalación y actualización

## Requisitos

- Servidor Linux (Ubuntu 22.04 o 24.04 recomendado) o Windows Server.
- **Node.js en la versión exacta indicada en `package.json` → `engines.node`.** La aplicación está compilada para esa versión y no arranca con otra.
- 2 GB de RAM y 2 GB de disco libres (más el espacio de los datos y copias).

## Instalación (Linux)

1. Copia el paquete `almacen-X.Y.Z.tar.gz` al servidor y descomprímelo en `/opt`:

        sudo tar -xzf almacen-X.Y.Z.tar.gz -C /opt
        cd /opt/almacen

2. Instala las dependencias:

        npm ci --omit=dev

3. Copia `.env.example` a `.env` y ajusta al menos el puerto. Para enviar correos (recuperación de contraseñas, albaranes, avisos), rellena los datos del servidor de correo.
4. Crea el servicio con el archivo `deploy/almacen.service` (las instrucciones están al principio del archivo) y arráncalo.
5. Abre la dirección del servidor en el navegador y crea la cuenta de administrador.

## Primeros pasos

- **Ajustes → General:** pon el nombre de tu empresa, el logotipo y el color. Hasta entonces la aplicación muestra «TuEmpresa».
- **Ajustes → Clientes y albaranes:** los datos fiscales que salen en los albaranes.
- **Ajustes → Almacenes:** dibuja tu almacén (puedes subir el plano de fondo).
- **Ajustes → Licencia:** sin licencia, la aplicación funciona 30 días de prueba. Para obtenerla, envía a tu proveedor el «ID de instalación» que aparece ahí y pega en esa misma pantalla el texto de la licencia que te devuelva.

## Actualizar a una versión nueva

Tu proveedor te enviará un paquete `almacen-X.Y.Z.tar.gz`. En el servidor:

    cd /opt/almacen
    ./scripts/actualizar-version.sh /ruta/almacen-X.Y.Z.tar.gz

El script comprueba que el paquete es válido y que la versión de Node es la correcta, hace una copia de seguridad de los datos, guarda la versión actual, instala la nueva y reinicia el servicio. Si la versión nueva no arranca, vuelve sola a la anterior.

Los datos, la licencia, los certificados y la configuración (`.env`) **no se tocan**. La licencia sigue siendo válida tras actualizar.

Para volver a la versión anterior en cualquier momento:

    ./scripts/actualizar-version.sh volver

Si el servicio no se llama `almacen`, indícalo así: `SERVICIO=nombre ./scripts/actualizar-version.sh …`

### En Windows

1. Para el servicio.
2. Haz una copia de seguridad con `npm run backup`.
3. Sustituye todos los archivos de la carpeta por los del paquete **excepto** `data`, `backups`, `certs`, `node_modules` y `.env`.
4. Ejecuta `npm ci --omit=dev` y arranca el servicio.

## Copias de seguridad

`npm run backup` guarda una copia de la base de datos y de la clave de cifrado en `backups/`. Programa una copia diaria y llévala fuera del servidor (NAS o nube).

## Licencia

El uso de la aplicación está sujeto a las condiciones del archivo `LICENSE`.
