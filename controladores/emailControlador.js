// controladores/emailControlador.js
import { enviarCodigoVerificacion } from '../servicios/emailService.js';
import crypto from 'crypto';
import { pool } from '../configuracion/basedeDatos.js';

// Guardar código en BD (opcional, si ya lo haces en authControlador, usa ese)
const guardarCodigo = async (usuarioId, codigo, tipo) => {
    const expiracion = new Date();
    expiracion.setMinutes(expiracion.getMinutes() + 15);

    await pool.query(
        `INSERT INTO codigos_verificacion (usuario_id, codigo, tipo, expiracion, usado)
     VALUES ($1, $2, $3, $4, false)
     ON CONFLICT (usuario_id, tipo) DO UPDATE SET codigo = $2, expiracion = $4, usado = false`,
        [usuarioId, codigo, tipo, expiracion]
    );
};

export const enviarCodigo = async (req, res) => {
    try {
        const { email, codigo, tipo = 'verificacion', usuarioId } = req.body;

        if (!email) {
            return res.status(400).json({ exito: false, error: 'Email requerido' });
        }

        // Si no se pasa código, generarlo
        const codigoFinal = codigo || Math.floor(100000 + Math.random() * 900000).toString();

        // Guardar en BD si tenemos usuarioId
        if (usuarioId) {
            await guardarCodigo(usuarioId, codigoFinal, tipo);
        }

        // Enviar correo
        const resultado = await enviarCodigoVerificacion(email, codigoFinal, tipo);

        if (resultado.exito) {
            res.json({ exito: true, mensaje: 'Código enviado', codigo: codigoFinal });
        } else {
            res.status(500).json({ exito: false, error: resultado.error });
        }
    } catch (error) {
        console.error('Error enviando código:', error);
        res.status(500).json({ exito: false, error: 'Error interno' });
    }
};