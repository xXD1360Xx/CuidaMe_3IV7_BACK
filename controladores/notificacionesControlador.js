import { pool } from '../configuracion/basedeDatos.js';

/**
 * Crea una notificación (función auxiliar para usar desde otros controladores)
 * @param {Object} datos - { usuario_id, tipo, mensaje, referencia_id, referencia_tipo, emisor_id }
 * @returns {Promise<Object>} - La notificación creada
 */
export const crearNotificacion = async (datos) => {
    const { usuario_id, tipo, mensaje, referencia_id = null, referencia_tipo = null, emisor_id = null } = datos;
    if (!usuario_id || !tipo || !mensaje) {
        throw new Error('Faltan datos obligatorios para crear notificación');
    }
    const query = `
    INSERT INTO notificaciones (usuario_id, tipo, mensaje, referencia_id, referencia_tipo, emisor_id)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;
  `;
    const values = [usuario_id, tipo, mensaje, referencia_id, referencia_tipo, emisor_id];
    try {
        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (error) {
        console.error('❌ Error al crear notificación:', error.message);
        throw error;
    }
};

/**
 * Obtiene notificaciones de un usuario con paginación y filtros opcionales
 * @param {number} usuario_id - ID del usuario
 * @param {number} limite - Límite de resultados (por defecto 20)
 * @param {number} offset - Desplazamiento (por defecto 0)
 * @param {Object} filtros - { leida, tipo }
 * @returns {Promise<Array>} - Lista de notificaciones
 */
export const obtenerNotificaciones = async (usuario_id, limite = 20, offset = 0, filtros = {}) => {
    let query = `
    SELECT id, tipo, mensaje, leida, fecha_creacion, referencia_id, referencia_tipo, emisor_id,
           (SELECT nombre FROM usuarios WHERE id = emisor_id) AS emisor_nombre
    FROM notificaciones
    WHERE usuario_id = $1
  `;
    const values = [usuario_id];
    let paramIndex = 2;

    if (filtros.leida !== undefined && filtros.leida !== null) {
        query += ` AND leida = $${paramIndex}`;
        values.push(filtros.leida);
        paramIndex++;
    }
    if (filtros.tipo) {
        query += ` AND tipo = $${paramIndex}`;
        values.push(filtros.tipo);
        paramIndex++;
    }
    query += ` ORDER BY fecha_creacion DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(limite, offset);

    try {
        const result = await pool.query(query, values);
        return result.rows;
    } catch (error) {
        console.error('❌ Error al obtener notificaciones:', error.message);
        throw error;
    }
};

/**
 * Cuenta las notificaciones no leídas de un usuario
 * @param {number} usuario_id
 * @returns {Promise<number>}
 */
export const contarNoLeidas = async (usuario_id) => {
    const query = `SELECT COUNT(*) FROM notificaciones WHERE usuario_id = $1 AND leida = false`;
    try {
        const result = await pool.query(query, [usuario_id]);
        return parseInt(result.rows[0].count, 10);
    } catch (error) {
        console.error('❌ Error al contar no leídas:', error.message);
        throw error;
    }
};

/**
 * Marca una notificación como leída
 * @param {number} notificacion_id
 * @param {number} usuario_id - Para verificar propiedad
 * @returns {Promise<Object>}
 */
export const marcarLeida = async (notificacion_id, usuario_id) => {
    const query = `
    UPDATE notificaciones
    SET leida = true
    WHERE id = $1 AND usuario_id = $2
    RETURNING id;
  `;
    try {
        const result = await pool.query(query, [notificacion_id, usuario_id]);
        if (result.rowCount === 0) {
            throw new Error('Notificación no encontrada o no pertenece al usuario');
        }
        return { exito: true };
    } catch (error) {
        console.error('❌ Error al marcar leída:', error.message);
        throw error;
    }
};

/**
 * Marca todas las notificaciones de un usuario como leídas
 * @param {number} usuario_id
 * @returns {Promise<Object>}
 */
export const marcarTodasLeidas = async (usuario_id) => {
    const query = `
    UPDATE notificaciones
    SET leida = true
    WHERE usuario_id = $1 AND leida = false;
  `;
    try {
        await pool.query(query, [usuario_id]);
        return { exito: true };
    } catch (error) {
        console.error('❌ Error al marcar todas leídas:', error.message);
        throw error;
    }
};

/**
 * Obtiene todos los usuarios familiares de un adulto mayor (incluyendo al mismo adulto mayor si también es usuario)
 * @param {number} adulto_mayor_id
 * @returns {Promise<number[]>} Lista de IDs de usuario
 */
export const obtenerFamiliaresDeAdulto = async (adulto_mayor_id) => {
    const query = `
    SELECT usuario_id
    FROM familiares
    WHERE adulto_mayor_id = $1
  `;
    try {
        const result = await pool.query(query, [adulto_mayor_id]);
        return result.rows.map(row => row.usuario_id);
    } catch (error) {
        console.error('❌ Error al obtener familiares:', error.message);
        throw error;
    }
};



/**
 * Crea notificaciones para todos los familiares de un adulto mayor
 * @param {number} adulto_mayor_id - ID del adulto mayor
 * @param {string} tipo - Tipo de notificación (ej. 'medicina_stock')
 * @param {string} mensaje - Mensaje a enviar
 * @param {number} referencia_id - ID del elemento relacionado (opcional)
 * @param {string} referencia_tipo - Tipo del elemento (ej. 'medicinas')
 * @param {number} emisor_id - ID del usuario que genera la notificación
 * @param {number|null} excepto_usuario_id - Si se quiere excluir a algún usuario (ej. el que hizo la acción)
 */
export const notificarAFamiliares = async (
    adulto_mayor_id,
    tipo,
    mensaje,
    referencia_id = null,
    referencia_tipo = null,
    emisor_id = null,
    excepto_usuario_id = null
) => {
    try {
        const usuarios = await obtenerFamiliaresDeAdulto(adulto_mayor_id);
        if (!usuarios.length) return;

        const destinatarios = excepto_usuario_id
            ? usuarios.filter(id => id !== excepto_usuario_id)
            : usuarios;

        if (!destinatarios.length) return;

        const queries = destinatarios.map(usuario_id =>
            crearNotificacion({
                usuario_id,
                tipo,
                mensaje,
                referencia_id,
                referencia_tipo,
                emisor_id
            })
        );

        await Promise.all(queries);
    } catch (error) {
        console.error('❌ Error en notificarAFamiliares:', error.message);
        throw error;
    }
};

/**
 * Elimina una notificación (solo si pertenece al usuario)
 * @param {number} notificacion_id
 * @param {number} usuario_id
 * @returns {Promise<Object>}
 */
export const eliminarNotificacion = async (notificacion_id, usuario_id) => {
    const query = `DELETE FROM notificaciones WHERE id = $1 AND usuario_id = $2 RETURNING id;`;
    try {
        const result = await pool.query(query, [notificacion_id, usuario_id]);
        if (result.rowCount === 0) {
            throw new Error('Notificación no encontrada o no pertenece al usuario');
        }
        return { exito: true };
    } catch (error) {
        console.error('❌ Error al eliminar notificación:', error.message);
        throw error;
    }
};