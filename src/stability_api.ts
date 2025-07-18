import dotenv from "dotenv";
import FormData from "form-data";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { Readable } from "stream";
import { finished } from "stream/promises";
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Type definitions
interface ImageSize {
  width: number;
  height: number;
}

interface VideoGenerationResponse {
  id: string;
  status?: "succeeded" | "failed" | "processing";
  error?: string;
  [key: string]: any; // For any additional properties
}

interface FetchApiOptions
  extends Omit<AxiosRequestConfig, "url" | "method" | "headers" | "data"> {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  body?: any;
  responseType?: "json" | "arraybuffer" | "stream" | "document" | "text";
}

interface ImageMetadata {
  width?: number;
  height?: number;
  [key: string]: any; // For any additional properties
}

// Cargar variables de entorno desde el archivo .env
dotenv.config();

const API_KEY = process.env.STABILITY_API_KEY;
const API_HOST = "https://api.stability.ai";
const DRY_RUN = process.env.DRY_RUN === "true";

if (!API_KEY) {
  console.error("Error: La clave de API de Stability no está configurada.");
  console.error(
    "Por favor, crea un archivo .env y añade STABILITY_API_KEY=tu_clave_de_api"
  );
  process.exit(1);
}

// Tamaños soportados por la API
const SUPPORTED_SIZES = [
  { width: 1024, height: 576 }, // Horizontal
  { width: 576, height: 1024 }, // Vertical
  { width: 768, height: 768 }, // Cuadrado
];

// Ruta a la imagen de entrada, temporal y video de salida
const inputImagePath = path.join(__dirname, "..", "brendi.jpg");
const tempImagePath = path.join(__dirname, "..", "temp_brendi.jpg");
const outputPath = path.join(__dirname, "..", "output.mp4");

// Función para esperar un tiempo determinado
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Redimensiona y convierte la imagen al formato JPEG con el tamaño más adecuado
 * @param inputPath Ruta del archivo de entrada
 * @param outputPath Ruta donde se guardará la imagen procesada (debe terminar en .jpg)
 * @returns La ruta de la imagen procesada
 */
export async function resizeImage(
  inputPath: string,
  outputPath: string
): Promise<string> {
  try {
    // Forzar extensión .jpg en el archivo de salida
    const outputJpgPath = outputPath.endsWith(".jpg")
      ? outputPath
      : `${outputPath.split(".")[0]}.jpg`;

    // Obtener metadatos de la imagen de entrada
    const metadata = await sharp(inputPath).metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error("No se pudieron obtener las dimensiones de la imagen");
    }

    // Determinar el tamaño objetivo basado en la relación de aspecto
    const aspectRatio = metadata.width / metadata.height;
    let targetSize;

    if (Math.abs(aspectRatio - 16 / 9) < Math.abs(aspectRatio - 9 / 16)) {
      targetSize = SUPPORTED_SIZES[0]; // Horizontal
    } else if (Math.abs(aspectRatio - 9 / 16) < Math.abs(aspectRatio - 1)) {
      targetSize = SUPPORTED_SIZES[1]; // Vertical
    } else {
      targetSize = SUPPORTED_SIZES[2]; // Cuadrado
    }

    console.log(
      `Redimensionando imagen de ${metadata.width}x${metadata.height} a ${targetSize.width}x${targetSize.height}...`
    );

    // Primero redimensionamos manteniendo la relación de aspecto
    // para que cubra el área objetivo
    const pipeline = sharp(inputPath).resize({
      width: targetSize.width,
      height: targetSize.height,
      fit: "cover",
      position: "center",
      withoutEnlargement: false, // Permitir agrandar si es necesario
    });

    // Luego recortamos para asegurar las dimensiones exactas
    const processed = await pipeline
      .extract({
        left: 0,
        top: 0,
        width: targetSize.width,
        height: targetSize.height,
      })
      .jpeg({
        quality: 90, // Calidad alta pero con buena compresión
        mozjpeg: true, // Usar compresión optimizada de MozJPEG
        chromaSubsampling: "4:4:4", // Máxima calidad de crominancia
      })
      .toFile(outputJpgPath);

    // Verificar las dimensiones finales
    const finalMetadata = await sharp(outputJpgPath).metadata();
    if (
      finalMetadata.width !== targetSize.width ||
      finalMetadata.height !== targetSize.height
    ) {
      console.warn(
        `Advertencia: La imagen resultante tiene dimensiones inesperadas: ${finalMetadata.width}x${finalMetadata.height}`
      );
    }

    console.log("Imagen redimensionada y convertida a JPEG correctamente");
    return outputJpgPath;
  } catch (error) {
    console.error("Error al procesar la imagen:", error);
    throw new Error(
      `Error al procesar la imagen: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export async function fetchApi<T = any>(
  url: string,
  options: FetchApiOptions = {}
): Promise<T> {
  try {
    const { body, responseType = "json", ...axiosConfig } = options;

    const response = await axios({
      url,
      method: options.method || "GET",
      headers: {
        Accept: "application/json",
        ...options.headers,
      },
      data: body,
      responseType,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      ...axiosConfig,
    });

    return response.data as T;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        const { status, statusText, data, headers } = error.response;
        console.error("Error en la petición:", {
          url,
          status,
          statusText,
          headers,
          errorDetails: data,
        });
        const errorMessage = `HTTP error! status: ${status} - ${statusText}\nURL: ${url}\nDetalles: ${JSON.stringify(data, null, 2)}`;
        throw new Error(errorMessage);
      } else if (error.request) {
        console.error("No se recibió respuesta del servidor:", error.request);
        throw new Error(
          "No se pudo conectar al servidor. Verifica tu conexión a internet."
        );
      }
    }

    // Handle non-Axios errors or rethrow if we can't handle it
    const errorMessage =
      error instanceof Error
        ? `Error al realizar la petición: ${error.message}`
        : "Error desconocido al realizar la petición";
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
}

// Función principal para generar el video
async function generateVideo(): Promise<void> {
  if (!fs.existsSync(inputImagePath)) {
    const errorMessage = `Error: No se encontró la imagen en ${inputImagePath}\nAsegúrate de que el archivo brendi.jpg exista en la raíz del proyecto.`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  console.log("Iniciando la generación del video...");

  if (DRY_RUN) {
    console.log("--- MODO DRY RUN ---");
    console.log(
      "La configuración es correcta, pero no se llamará a la API para evitar costos."
    );
    console.log(
      "Para generar el video, elimina o establece DRY_RUN=false en el archivo .env"
    );
    return;
  }

  try {
    // Paso 1: Redimensionar la imagen si es necesario
    await resizeImage(inputImagePath, tempImagePath);

    console.log("Enviando imagen a la API de Stability AI...");

    // Crear formulario siguiendo la documentación de Stability AI
    const formData = new FormData();
    formData.append("image", fs.createReadStream(tempImagePath), {
      filename: "brendi.jpg",
      contentType: "image/jpeg",
    });

    // Configuración optimizada para calidad alta y movimiento natural
    formData.append("seed", "0"); // Semilla fija para reproducibilidad
    formData.append("cfg_scale", "2.5"); // Balance entre creatividad y adherencia a la entrada
    formData.append("motion_bucket_id", "100"); // Movimiento balanceado que mantiene la calidad

    // Enviar la imagen a la API usando fetchApi con tipado
    const response = await fetchApi<VideoGenerationResponse>(
      `${API_HOST}/v2beta/image-to-video`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          ...formData.getHeaders(),
        },
        body: formData as any, // Type assertion needed for FormData
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );

    const generationId = response?.id;
    console.log(`ID de generación: ${generationId}`);

    if (!generationId) {
      throw new Error("No se recibió un ID de generación de la API");
    }

    // Limpiar la imagen temporal después de subirla
    if (fs.existsSync(tempImagePath)) {
      fs.unlinkSync(tempImagePath);
    }

    // Paso 2: Verificar el estado de la generación
    let statusResponse: VideoGenerationResponse;
    let attempts = 0;
    const maxAttempts = 30; // Máximo de intentos (30 * 10s = 5 minutos)
    const pollInterval = 10000; // 10 segundos

    while (attempts < maxAttempts) {
      console.log(
        `Verificando estado de generación (Intento ${attempts + 1}/${maxAttempts})...`
      );

      statusResponse = await fetchApi<VideoGenerationResponse>(
        `${API_HOST}/v2beta/image-to-video/result/${response.id}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${API_KEY}`,
            Accept: "application/json",
          },
        }
      );

      if (statusResponse.status === "succeeded") {
        console.log("Video generado exitosamente!");
        break;
      } else if (statusResponse.status === "failed") {
        throw new Error(
          `La generación del video falló: ${statusResponse.error || "Error desconocido"}`
        );
      }

      // Si no está listo, esperar antes de volver a intentar
      await sleep(pollInterval);
      attempts++;
    }

    if (attempts >= maxAttempts) {
      throw new Error(
        "Tiempo de espera agotado. La generación del video está tomando más tiempo de lo esperado."
      );
    }

    // Paso 3: Descargar el video generado
    console.log("Solicitando video...");

    try {
      const videoResponse = await fetchApi<ArrayBuffer>(
        `${API_HOST}/v2beta/image-to-video/result/${response.id}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${API_KEY}`,
            Accept: "video/*", // Especificamos que esperamos un video
          },
          responseType: "arraybuffer" as const,
        }
      );

      if (!videoResponse || !(videoResponse instanceof ArrayBuffer)) {
        throw new Error("Respuesta de video inválida recibida del servidor");
      }

      // Guardar el video en el archivo de salida
      fs.writeFileSync(outputPath, Buffer.from(videoResponse));
      console.log(`¡Video generado exitosamente y guardado en ${outputPath}!`);
    } catch (error: unknown) {
      console.error("Error al descargar el video:");
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          console.error(
            `Error ${axiosError.response.status}: ${axiosError.response.statusText}`
          );
          console.error("Detalles:", axiosError.response.data);
        } else if (axiosError.request) {
          // The request was made but no response was received
          console.error("No se recibió respuesta del servidor");
          console.error("Request:", axiosError.request);
        } else {
          // Something happened in setting up the request that triggered an Error
          console.error("Error al configurar la petición:", axiosError.message);
        }
      } else if (error instanceof Error) {
        // Handle other types of errors
        console.error("Error inesperado:", error.message);
      } else {
        console.error("Error desconocido:", error);
      }
      throw error;
    }
  } catch (error) {
    // Limpiar la imagen temporal en caso de error
    if (fs.existsSync(tempImagePath)) {
      fs.unlinkSync(tempImagePath);
    }

    console.error("\n--- ERROR FATAL ---");
    console.error("Ocurrió un error durante la generación del video:");

    if (error instanceof Error) {
      console.error(error.message);
      if (error.stack) {
        console.error("\nStack trace:");
        console.error(error.stack);
      }
    } else {
      console.error("Error desconocido:", error);
    }

    process.exit(1);
  }
}

export const putImage = async (
  filePath: string,
  metadata: { filename: string; contentType: string }
) => {
  let tempFilePath = "";

  try {
    // Create a temp file path for the resized image
    const ext = path.extname(metadata.filename);
    const tempDir = path.join(process.cwd(), "temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    tempFilePath = path.join(tempDir, `resized-${Date.now()}${ext}`);

    // Resize the image to supported dimensions
    const resizedPath = await resizeImage(filePath, tempFilePath);

    const formData = new FormData();

    // Read the resized file as a buffer
    const fileBuffer = fs.readFileSync(resizedPath);

    // Append the file buffer with proper format
    formData.append("image", fileBuffer, {
      filename: metadata.filename,
      contentType: metadata.contentType,
      knownLength: fileBuffer.length,
    });

    // Add other parameters
    formData.append("seed", "0");
    formData.append("cfg_scale", "2.5");
    formData.append("motion_bucket_id", "100");

    // Use axios directly for better control
    const response = await axios.post(
      `${API_HOST}/v2beta/image-to-video`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          ...formData.getHeaders(),
        },
        maxBodyLength: Infinity,
      }
    );

    console.log("API Response:", response.data);

    // Save the video ID to ids.txt
    if (response.data?.id) {
      try {
        const idsFilePath = path.join(process.cwd(), "ids.txt");
        fs.appendFileSync(idsFilePath, `\n${response.data.id}`, "utf8");
        console.log(`Video ID ${response.data.id} saved to ids.txt`);
      } catch (fileError) {
        console.error("Error saving video ID to ids.txt:", fileError);
        // Don't fail the whole operation if just the ID logging fails
      }
    }

    return response.data;
  } catch (error: any) {
    const errorMessage =
      error?.response?.data?.message || error?.message || "Unknown error";
    console.error("Error en putImage:", errorMessage);
    if (error?.response?.data) {
      console.error("Error details:", error.response.data);
    }
    throw new Error(errorMessage);
  } finally {
    // Clean up the temporary resized image if it exists
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (cleanupError) {
        console.error("Error cleaning up temp file:", cleanupError);
      }
    }
  }
};
