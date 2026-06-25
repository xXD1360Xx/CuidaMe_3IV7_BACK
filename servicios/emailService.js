// servicios/emailService.js
import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';
dotenv.config();

// Configurar SendGrid (usando variable de entorno)
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

if (!SENDGRID_API_KEY) {
  console.error('❌ SENDGRID_API_KEY no definida en variables de entorno');
} else {
  sgMail.setApiKey(SENDGRID_API_KEY);
  console.log('✅ SendGrid configurado');
}

// Función genérica para enviar correos
export const enviarCorreo = async ({ to, subject, html, text }) => {
  try {
    const msg = {
      to,
      from: 'rumboverificacion@gmail.com', // Cambia por tu correo verificado
      subject,
      text: text || '',
      html: html || text || '',
    };

    const respuesta = await sgMail.send(msg);
    console.log(`📧 Correo enviado a ${to}: ${subject}`);
    return { exito: true, mensaje: 'Correo enviado' };
  } catch (error) {
    console.error('❌ Error enviando correo:', error.message);
    if (error.response) {
      console.error('   Detalles:', error.response.body);
    }
    return { exito: false, error: error.message };
  }
};

// Funciones específicas
export const enviarCodigoVerificacion = async (email, codigo, tipo = 'verificacion') => {
  const asuntos = {
    verificacion: 'Código de verificación - CuidaMe',
    recuperacion: 'Recupera tu contraseña - CuidaMe',
    invitacion: 'Invitación a CuidaMe',
  };

  const mensajes = {
    verificacion: `Tu código de verificación es: <strong>${codigo}</strong>`,
    recuperacion: `Usa este código para restablecer tu contraseña: <strong>${codigo}</strong>`,
    invitacion: `Has sido invitado a unirte a CuidaMe. Usa el código: <strong>${codigo}</strong>`,
  };

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f4f4f4;">
      <div style="background: #87CEEB; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: #333;">CuidaMe</h1>
      </div>
      <div style="background: white; padding: 20px; border-radius: 0 0 10px 10px;">
        <p>Hola,</p>
        <p>${mensajes[tipo] || mensajes.verificacion}</p>
        <p style="font-size: 24px; font-weight: bold; text-align: center; padding: 15px; background: #f0f0f0; border-radius: 8px;">
          ${codigo}
        </p>
        <p>Este código es válido por 15 minutos.</p>
        <p>Si no solicitaste esto, ignora este correo.</p>
        <hr>
        <p style="font-size: 12px; color: #999;">CuidaMe - Cuidado de adultos mayores</p>
      </div>
    </div>
  `;

  return enviarCorreo({
    to: email,
    subject: asuntos[tipo] || 'Código de verificación',
    html,
    text: mensajes[tipo] || `Tu código es: ${codigo}`,
  });
};

export default { enviarCorreo, enviarCodigoVerificacion };