import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { putImage } from './stability_api';
import axios from 'axios';


// Load environment variables
dotenv.config();

// Configuration
const API_KEY = process.env.STABILITY_API_KEY;
const API_HOST = process.env.API_HOST || 'https://api.stability.ai';
const OUTPUT_DIR = './output';
const PORT = process.env.PORT || 3000;
const UPLOAD_DIR = path.join(__dirname, '../uploads');
const PUBLIC_DIR = path.join(__dirname, '../public');

const app = express();

// Ensure upload and public directories exist
[UPLOAD_DIR, path.join(PUBLIC_DIR, 'css')].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req: any, file: any, cb: any) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req: any, file: any, cb: any) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req: any, file: any, cb: any) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes JPG o PNG'));
    }
  },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(PUBLIC_DIR));
app.use('/uploads', express.static(UPLOAD_DIR));

// Serve the dashboard
app.get('/', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'templates/dash.html'));
});


// Handle polling
app.get('/poll', async (req: Request, res: Response) => {
  try {
    const videoId = req.query.videoId;
    if (!videoId) {
      return res.status(400).json({ success: false, message: 'Se requiere un ID de video' });
    }

    // Check if video already exists in output directory
    // @todo threads?
    const outputPath = path.join(OUTPUT_DIR, `${videoId}.mp4`);
    if (fs.existsSync(outputPath)) {
      const videoBuffer = fs.readFileSync(outputPath);
      res.set('Content-Type', 'video/mp4');
      return res.send(videoBuffer);
    }

    // If not in output directory, check with the API
    const response = await axios({
      method: 'GET',
      url: `${API_HOST}/v2beta/image-to-video/result/${videoId}`,
      responseType: 'arraybuffer',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Accept': 'video/*, application/json'
      },
      validateStatus: (status) => status < 500 // Don't throw on client errors (4xx)
    });

    // Handle different status codes
    if (response.status === 202) {
      console.log(`Video ${videoId} aún en proceso...`);
      return res.status(202).json({ 
        success: false, 
        status: 'processing',
        message: 'El video aún está en proceso de generación. Por favor, intente más tarde.' 
      });
    }

    if (response.status === 404) {
      console.log(`Video ${videoId} no encontrado`);
      return res.status(404).json({ 
        success: false, 
        status: 'not_found',
        message: 'Video no encontrado' 
      });
    }

    if (response.status !== 200) {
      console.error(`Error en la API para el video ${videoId}:`, response.status, response.statusText);
      return res.status(400).json({ 
        success: false, 
        status: 'error',
        message: `Error en la respuesta de la API: ${response.status} ${response.statusText}` 
      });
    }
    
    // Save the video for future requests
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.writeFileSync(outputPath, response.data);
    console.log(`Video ${videoId} guardado en ${outputPath}`);

    // Send the video as response
    res.set('Content-Type', 'video/mp4');
    return res.send(response.data);
  } catch (error) {
    console.error('Error en el endpoint /poll:', error);
    return res.status(500).json({ 
      success: false, 
      status: 'error',
      message: 'Error interno del servidor al verificar el estado del video' 
    });
  }
});

// Handle file upload
app.post('/upload', upload.single('image'), async (req: Request | any, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se ha subido ningúna imagen' });
    }

    console.info("::ABOUT_TO_SEND::");
    console.log("File info:", {
      originalname: req.file.originalname,
      path: req.file.path,
      mimetype: req.file.mimetype,
      size: req.file.size
    });
    
    const response = await putImage(req.file.path, {
        filename: req.file.originalname,
        contentType: req.file.mimetype
    });
    console.info("::RESPUESTA::", response)
    const videoId = response.id;

    if(!videoId ){
      return res.status(500).json({ error: 'Error al procesar la imagen' });
    }

    res.json({
      success: true,
      videoId,
      message: 'Video procesandose'
    });
  } catch (error) {
    console.error('::Error processing upload::', error);
    res.status(500).json({
      error: 'Error al procesar la imagen',
      details: error instanceof Error ? error.message : new Error(error as string).message
    });
  }
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: Function) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Algo salió mal',
    message: err.message
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Upload directory: ${UPLOAD_DIR}`);
  console.log(`Public directory: ${PUBLIC_DIR}`);
});

export default app;
