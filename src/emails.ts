import nodemailer from "nodemailer";
import { generateMagicToken } from "./tokens";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

let sesClient;
const getSesClient = () => {
  // @ts-ignore
  sesClient ??= new SESv2Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
  return sesClient;
};
export const getSesTransport = () => {
  return nodemailer.createTransport({
    SES: {
      sesClient: getSesClient(),
      SendEmailCommand,
    },
  });
};

export const getSesRemitent = () =>
  process.env.SES_REMITENT || "noreply@example.com";

const isDev = process.env.NODE_ENV === "development";
const location = isDev
  ? "http://localhost:3001"
  : "https://image-to-video.fly.dev";

// EMAIL SENDERS
export const sendMagicLink = async (email: string) => {
  const token = generateMagicToken(email);
  const magicLink = `${location}/magic-link?token=${token}`;

  const html = `
    <h1>Link de inicio de sesión 💽</h1>
    <p>Por favor, haz clic en el siguiente enlace para iniciar sesión:</p>
    <a href="${magicLink}">Iniciar sesión</a>
    <p>Este enlace expirará en 15 minutos.</p>
  `;

  if (isDev) {
    console.log("Development mode - Email would be sent to:", email);
    console.log("Magic Link:", magicLink);
    return { message: magicLink };
  }

  try {
    const r = await getSesTransport().sendMail({
      from: getSesRemitent(),
      to: email,
      subject: "🪙 Recupera tus créditos",
      html,
    });
    console.info("::EMAIL_SENT::", r);
    return { success: true, message: "Magic link sent successfully" };
  } catch (err) {
    console.error("Error sending email:", err);
    return { success: false, message: "Error sending email" };
  }
};
