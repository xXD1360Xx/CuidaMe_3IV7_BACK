import express from 'express';
import { autenticarUsuario } from '../middleware/autenticacionMiddleware.js';
import {
    obtenerNotificaciones,
    contarNoLeidas,
    marcarLeida,
    marcarTodasLeidas,
    eliminarNotificacion,
} from '../controladores/notificacionesControlador.js';

const router = express.Router();

/**
 * Obtener notificaciones del usuario autenticado
 * POST /api/notificaciones/obtener
 * Body: { limite, offset, filtros }
 */
router.post('/obtener', autenticarUsuario, async (req, res) => {
    try {
        const usuario_id = req.usuario.id; // autenticarUsuario debe dejar req.usuario
        const { limite = 20, offset = 0, filtros = {} } = req.body;
        const notificaciones = await obtenerNotificaciones(usuario_id, limite, offset, filtros);
        res.status(200).json({ exito: true, notificaciones });
    } catch (error) {
        console.error('❌ Error en /obtener:', error.message);
        res.status(500).json({ exito: false, error: 'Error interno del servidor' });
    }
});

/**
 * Contar notificaciones no leídas
 * POST /api/notificaciones/contar-no-leidas
 */
router.post('/contar-no-leidas', autenticarUsuario, async (req, res) => {
    try {
        const usuario_id = req.usuario.id;
        const count = await contarNoLeidas(usuario_id);
        res.status(200).json({ exito: true, no_leidas: count });
    } catch (error) {
        console.error('❌ Error en /contar-no-leidas:', error.message);
        res.status(500).json({ exito: false, error: 'Error interno del servidor' });
    }
});

/**
 * Marcar una notificación como leída
 * POST /api/notificaciones/marcar-leida
 * Body: { notificacion_id }
 */
router.post('/marcar-leida', autenticarUsuario, async (req, res) => {
    try {
        const usuario_id = req.usuario.id;
        const { notificacion_id } = req.body;
        if (!notificacion_id) {
            return res.status(400).json({ exito: false, error: 'notificacion_id es requerido' });
        }
        await marcarLeida(notificacion_id, usuario_id);
        res.status(200).json({ exito: true, mensaje: 'Notificación marcada como leída' });
    } catch (error) {
        console.error('❌ Error en /marcar-leida:', error.message);
        res.status(500).json({ exito: false, error: error.message });
    }
});

/**
 * Marcar todas las notificaciones como leídas
 * POST /api/notificaciones/marcar-todas-leidas
 */
router.post('/marcar-todas-leidas', autenticarUsuario, async (req, res) => {
    try {
        const usuario_id = req.usuario.id;
        await marcarTodasLeidas(usuario_id);
        res.status(200).json({ exito: true, mensaje: 'Todas las notificaciones marcadas como leídas' });
    } catch (error) {
        console.error('❌ Error en /marcar-todas-leidas:', error.message);
        res.status(500).json({ exito: false, error: 'Error interno del servidor' });
    }
});

/**
 * Eliminar una notificación
 * POST /api/notificaciones/eliminar
 * Body: { notificacion_id }
 */
router.post('/eliminar', autenticarUsuario, async (req, res) => {
    try {
        const usuario_id = req.usuario.id;
        const { notificacion_id } = req.body;
        if (!notificacion_id) {
            return res.status(400).json({ exito: false, error: 'notificacion_id es requerido' });
        }
        await eliminarNotificacion(notificacion_id, usuario_id);
        res.status(200).json({ exito: true, mensaje: 'Notificación eliminada' });
    } catch (error) {
        console.error('❌ Error en /eliminar:', error.message);
        res.status(500).json({ exito: false, error: error.message });
    }
});

export default router;