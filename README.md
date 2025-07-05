# Script de Image-to-Video con Stability AI en TypeScript

Este proyecto contiene un script de TypeScript para consumir la API de Image-to-Video de Stability AI. El script toma una imagen de entrada y genera un video a partir de ella.

> Usa esta app en producción: [https://image-to-video.fly.dev](https://image-to-video.fly.dev)

## Requisitos

- Node.js (v18 o superior)
- Una clave de API de Stability AI

## Configuración

1.  **Clona el repositorio o descarga los archivos.**

2.  **Instala las dependencias:**

    ```bash
    npm install
    ```

3.  **Crea un archivo de entorno:**

    Crea un archivo llamado `.env` en la raíz del proyecto y añade tu clave de API de Stability AI de la siguiente manera:

    ```
    STABILITY_API_KEY=tu_clave_de_api_aqui
    ```

4.  **Añade una imagen de entrada:**

    Coloca la imagen que deseas convertir en la raíz del proyecto y asegúrate de que se llame `image.png`.

## Uso

Una vez que hayas completado la configuración, puedes ejecutar el script con el siguiente comando:

```bash
npm start
```

El script compilará el código TypeScript, lo ejecutará y, si todo va bien, guardará el video generado como `output.mp4` en la raíz del proyecto.

## Cómo funciona

-   `src/index.ts`: El script principal que realiza la llamada a la API.
-   `dotenv`: Carga la clave de API desde el archivo `.env` de forma segura.
-   `axios`: Se utiliza para realizar la solicitud HTTP a la API de Stability AI.
-   `form-data`: Ayuda a construir el cuerpo de la solicitud `multipart/form-data`, que es necesario para enviar la imagen.
