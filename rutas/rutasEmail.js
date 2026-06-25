// rutas/rutasEmail.js
import express from 'express';
import { enviarCodigoVerificacion } from '../servicios/emailService.js';
import { pool } from '../configuracion/basedeDatos.js';
import crypto from 'crypto';

const router = express.Router();

// ==================== RUTA PARA ENVIAR CÓDIGO ====================

/**
 * @route POST /api/email/enviar-codigo
 * @desc Envía un código de verificación al correo
 * @access Público
 * @body { email, tipo, usuarioId } 
 *   - email: obligatorio
 *   - tipo: 'verificacion' | 'recuperacion' | 'invitacion' (default: 'verificacion')
 *   - usuarioId: opcional (si se proporciona, guarda el código en la tabla codigos_verificacion)
 */
router.post('/enviar-codigo', async (req, res) => {
    try {
        const { email, tipo = 'verificacion', usuarioId } = req.body;

        if (!email) {
            return res.status(400).json({
                exito: false,
                error: 'El correo electrónico es requerido',
                codigo: 'EMAIL_REQUERIDO'
            });
        }

        // Validar formato de email (básico)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                exito: false,
                error: 'Formato de correo electrónico inválido',
                codigo: 'EMAIL_INVALIDO'
            });
        }

        // Generar código de 6 dígitos
        const codigo = Math.floor(100000 + Math.random() * 900000).toString();

        // Si se proporciona usuarioId, guardar el código en BD (tabla codigos_verificacion)
        if (usuarioId) {
            const expiracion = new Date();
            expiracion.setMinutes(expiracion.getMinutes() + 15);

            const client = await pool.connect();
            try {
                const insertQuery = `
          INSERT INTO codigos_verificacion (usuario_id, codigo, tipo, expiracion, usado)
          VALUES ($1, $2, $3, $4, false)
          ON CONFLICT (usuario_id, tipo) 
          DO UPDATE SET codigo = $2, expiracion = $4, usado = false, creado_en = NOW()
        `;
                await client.query(insertQuery, [usuarioId, codigo, tipo, expiracion]);
                console.log(`📨 Código guardado en BD para usuario ${usuarioId}: ${codigo}`);
            } finally {
                client.release();
            }
        }

        // Enviar correo
        const resultado = await enviarCodigoVerificacion(email, codigo, tipo);

        if (resultado.exito) {
            // En desarrollo, devolver el código para pruebas
            const respuesta = {
                exito: true,
                mensaje: 'Código enviado exitosamente',
                // Solo en desarrollo:
                codigo_demo: process.env.NODE_ENV === 'development' ? codigo : undefined
            };
            // Si se proporcionó usuarioId, devolverlo también
            if (usuarioId) {
                respuesta.usuario_id = usuarioId;
            }
            res.json(respuesta);
        } else {
            // Si falla el envío, registrar error y devolver error al frontend
            console.error('❌ Error enviando correo:', resultado.error);
            res.status(500).json({
                exito: false,
                error: 'No se pudo enviar el correo. Intenta más tarde.',
                codigo: 'ERROR_ENVIO_CORREO'
            });
        }

    } catch (error) {
        console.error('❌ Error en /enviar-codigo:', error.message);
        res.status(500).json({
            exito: false,
            error: 'Error interno del servidor',
            codigo: 'ERROR_SERVIDOR'
        });
    }
});

// ==================== RUTA PARA REENVIAR CÓDIGO (OPCIONAL) ====================

/**
 * @route POST /api/email/reenviar-codigo
 * @desc Reenvía un código de verificación (similar a enviar-codigo, pero con lógica de reintento)
 * @access Público
 * @body { email, tipo, usuarioId }
 */
router.post('/reenviar-codigo', async (req, res) => {
    try {
        const { email, tipo = 'verificacion', usuarioId } = req.body;

        if (!email) {
            return res.status(400).json({
                exito: false,
                error: 'El correo electrónico es requerido',
                codigo: 'EMAIL_REQUERIDO'
            });
        }

        // Llamar a la misma lógica de envío
        const codigo = Math.floor(100000 + Math.random() * 900000).toString();

        if (usuarioId) {
            const expiracion = new Date();
            expiracion.setMinutes(expiracion.getMinutes() + 15);

            const client = await pool.connect();
            try {
                const updateQuery = `
          UPDATE codigos_verificacion
          SET codigo = $1, expiracion = $2, usado = false, creado_en = NOW()
          WHERE usuario_id = $3 AND tipo = $4
        `;
                const result = await client.query(updateQuery, [codigo, expiracion, usuarioId, tipo]);
                if (result.rowCount === 0) {
                    // Si no existe, insertar
                    const insertQuery = `
            INSERT INTO codigos_verificacion (usuario_id, codigo, tipo, expiracion, usado)
            VALUES ($1, $2, $3, $4, false)
          `;
                    await client.query(insertQuery, [usuarioId, codigo, tipo, expiracion]);
                }
            } finally {
                client.release();
            }
        }

        const resultado = await enviarCodigoVerificacion(email, codigo, tipo);

        if (resultado.exito) {
            res.json({
                exito: true,
                mensaje: 'Código reenviado exitosamente',
                codigo_demo: process.env.NODE_ENV === 'development' ? codigo : undefined,
                usuario_id: usuarioId || undefined
            });
        } else {
            res.status(500).json({
                exito: false,
                error: 'No se pudo reenviar el correo. Intenta más tarde.',
                codigo: 'ERROR_REENVIO'
            });
        }

    } catch (error) {
        console.error('❌ Error en /reenviar-codigo:', error.message);
        res.status(500).json({
            exito: false,
            error: 'Error interno del servidor',
            codigo: 'ERROR_SERVIDOR'
        });
    }
});

// ==================== RUTA DE PRUEBA (OPCIONAL) ====================

/**
 * @route GET /api/email/status
 * @desc Verifica que el servicio de correo esté configurado
 * @access Público
 */
router.get('/status', (req, res) => {
    res.json({
        exito: true,
        mensaje: 'Servicio de correo funcionando',
        sendgrid_configurado: !!process.env.SENDGRID_API_KEY
    });
});

export default router;