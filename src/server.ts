import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import Stripe from 'stripe';
import { putImage } from './stability_api';
import axios from 'axios';
import { makeCheckoutUrls } from './stripe';
import { getUser, sufficientCredits, updateUserCredits } from './db_setters';
import { sendMagicLink } from './emails';
import { verifyMagicToken } from './tokens';

// Extend the Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        email: string;
      };
    }
  }
}

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
app.use(cookieParser());

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



// Stripe webhook handler - MUST BE DEFINED BEFORE any body-parsing middleware
app.post('/webhook', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig) {
    console.error('No se encontró la firma de Stripe');
    return res.status(400).send('Falta la firma de Stripe');
  }

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET no está configurado');
    return res.status(500).json({ error: 'Webhook secret no configurado' });
  }

  let event: Stripe.Event;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2025-06-30.basil',
  });

  try {
    event = stripe.webhooks.constructEvent(
      req.body, // req.body is the raw buffer from express.raw
      sig,
      webhookSecret
    );
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.info('💳 Pago procesado exitosamente:', {
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        customer_email: paymentIntent.receipt_email,
        status: paymentIntent.status,
        metadata: paymentIntent.metadata
      });
      updateUserCredits({
        email: paymentIntent.receipt_email!,
        credits: parseInt(paymentIntent.metadata.credits || '0'),
        // @revisit do we want to push id here?
      });
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req: any, file: any, cb: any) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png'|| file.mimetype === 'image/webp') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes JPG, PNG o WEBP'));
    }
  },
});

// Global middlewares for all other routes
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file serving
app.use(express.static(PUBLIC_DIR));
app.use('/uploads', express.static(UPLOAD_DIR));

// Session check middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const sessionToken = req.cookies?.__session;
  
  // Skip session check for public routes
  const publicRoutes = ['/login', '/magic-link'];
  if (publicRoutes.includes(req.path)) {
    return next();
  }

  if (sessionToken) {
    try {
      const decoded = verifyMagicToken(sessionToken);
      if (decoded) {
        // Attach user email to the request object for use in route handlers
        req.user = { email: decoded.email };
        return next();
      }
    } catch (error) {
      console.error('Session token verification failed:', error);
      // Clear invalid session cookie
      res.clearCookie('__session');
    }
  }

  // If we get here, the user is not authenticated
  next();
});

app.get('/session', (req: Request, res: Response) => {
  const sessionToken = req.cookies?.__session;
  if (sessionToken) {
    try {
      const decoded = verifyMagicToken(sessionToken);
      if (decoded) {
        const user = getUser(decoded.email);
       return res.json({ success: true, user});
      }
    } catch (error) {
      console.error('Session token verification failed:', error);
      // Clear invalid session cookie
      res.clearCookie('__session');
    }
  }
   res.json({ success: false });
});

app.get('/', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'templates/dash.html'));
});

app.get('/checkout', async (req: Request, res: Response) => {
  const urls = await makeCheckoutUrls();
  res.json({ urls });
});

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
        message: 'El video aún está en proceso de generación. Por favor, espere.' 
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

// Handle file upload and generation
app.post('/upload', upload.single('image'), async (req: Request | any, res: Response) => {
  try {
    if (!req.file || !req.user) {
      return res.status(400).json({ error: 'No se ha subido ningúna imagen' });
    }

    console.info("::ABOUT_TO_SEND::");
    console.log("File info:", {
      originalname: req.file.originalname,
      path: req.file.path,
      mimetype: req.file.mimetype,
      size: req.file.size
    });
    
    // Sufficient credits?
    if(!sufficientCredits(req.user.email)){
      return res.status(400).json({ error: 'No tienes créditos suficientes. Haz una recarga para continuar' });
    }

    const response = await putImage(req.file.path, {
        filename: req.file.originalname,
        contentType: req.file.mimetype
    });
    console.info("::RESPUESTA::", response)
    const videoId = response.id;

    if(!videoId ){
      return res.status(500).json({ error: 'Error al procesar la imagen' });
    }

    // update points @TODO: real db! or email send?
    updateUserCredits({
      email: req.user?.email,
      credits: -1,  
      videoId
    });

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

// Magic link
app.get('/magic-link', async (req: Request, res: Response) => {
  const email = req.query.email as string;
  const token = req.query.token as string;
  const isDev = process.env.NODE_ENV === 'development';

  // If token is provided, verify it
  if (token) {
    const decoded = verifyMagicToken(token);
    if (!decoded) {
      return res.status(400).send('Token inválido o expirado');
    }
    
    // Set session cookie
    res.cookie('__session', token, {
      httpOnly: true,
      secure: !isDev, // Only secure in production
      maxAge: 15 * 60 * 1000, // 15 minutes
      sameSite: isDev ? 'lax' : 'strict',
      path: '/'
    });
    return res.redirect('/');
  }
  
  // If no token but email is provided, send magic link
  if (email) {
    try {
      const result = await sendMagicLink(email);
      
      if (isDev) {
        // In development, return the magic link directly
        return res.json({
          success: true,
          message: 'Development mode - use this link to login',
          magicLink: `${req.protocol}://${req.get('host')}/magic-link?token=${result}`,
          token: result
        });
      }
      
      // In production, just confirm the email was sent
      const response: any = {
        success: true,
        message: 'Magic link sent to your email'
      };
      
      if (isDev) {
        response.debug = result;
      }
      
      return res.json(response);
      
    } catch (error) {
      console.error('Error sending magic link:', error);
      const errorMessage = error instanceof Error 
        ? `Error: ${error.message}`
        : 'Error sending magic link. Please try again.';
        
      return res.status(500).json({
        success: false,
        error: isDev ? errorMessage : 'Error sending magic link. Please try again.'
      });
    }
  }
  
  // No token or email provided
  return res.status(400).json({
    success: false,
    error: 'Email or token is required'
  });
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

// Logout endpoint
app.get('/logout', (req: Request, res: Response) => {
  res.clearCookie('__session');
  res.redirect('/');
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
