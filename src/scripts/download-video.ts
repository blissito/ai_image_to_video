import dotenv from 'dotenv';
import axios, { AxiosError } from 'axios';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

// Configuration
const API_KEY = process.env.STABILITY_API_KEY;
const API_HOST = process.env.API_HOST || 'https://api.stability.ai';
const OUTPUT_DIR = './output';

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function downloadVideo(generationId: string, outputPath: string): Promise<void> {
  if (!API_KEY) {
    throw new Error('STABILITY_API_KEY no está configurado en el archivo .env');
  }

  if (!generationId) {
    throw new Error('Se requiere un ID de generación');
  }

  console.log(`Descargando video con ID: ${generationId}...`);

  try {
    const response = await axios({
      method: 'GET',
      url: `${API_HOST}/v2beta/image-to-video/result/${generationId}`,
      responseType: 'arraybuffer',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Accept': 'video/*'
      },
      validateStatus: undefined // Don't throw on non-200 status
    });

    if (response.status === 202) {
      console.log('El video aún está en proceso de generación. Por favor, intente más tarde.');
      return;
    }

    if (response.status !== 200) {
      throw new Error(`Error en la respuesta de la API: ${response.status} ${response.statusText}`);
    }

    // Save the video
    fs.writeFileSync(outputPath, response.data);
    console.log(`✅ Video guardado exitosamente en: ${outputPath}`);

  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        console.error(`Error ${axiosError.response.status}: ${axiosError.response.statusText}`);
        console.error('Detalles:', axiosError.response.data);
      } else if (axiosError.request) {
        console.error('No se recibió respuesta del servidor');
      } else {
        console.error('Error al configurar la petición:', axiosError.message);
      }
    } else if (error instanceof Error) {
      console.error('Error inesperado:', error.message);
    } else {
      console.error('Error desconocido:', error);
    }
    throw error;
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Uso: ts-node src/scripts/download-video.ts <generation-id> [output-path]');
  console.error('Ejemplo: ts-node src/scripts/download-video.ts 12345 output/video.mp4');
  process.exit(1);
}

const generationId = args[0];
const outputPath = args[1] || path.join(OUTPUT_DIR, `${generationId}.mp4`);

downloadVideo(generationId, outputPath)
  .catch(error => {
    console.error('Error al descargar el video:', error);
    process.exit(1);
  });
