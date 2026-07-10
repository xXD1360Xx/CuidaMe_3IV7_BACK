// controladores/familiaControlador.js - Controlador de Gestión Familiar
import { pool } from '../configuracion/basedeDatos.js';
import crypto from 'crypto';
import { crearNotificacion, notificarAFamiliares } from './notificacionesControlador.js';

// ==================== FUNCIONES DE GRUPOS FAMILIARES ====================

/**
 * 1. Obtener información del grupo familiar del usuario
 */
export const obtenerGrupoFamiliar = async (usuarioId) => {
  let client;

  try {
    console.log('👨‍👩‍👧‍👦 [FAMILIA] Obteniendo grupo familiar para usuario:', usuarioId);

    client = await pool.connect();

    // Obtener grupo familiar del usuario
    const query = `
      SELECT 
        gf.id,
        gf.codigo_familiar,
        gf.nombre_grupo,
        gf.descripcion,
        gf.fecha_creacion,
        gf.fecha_expiracion,
        gf.activo,
        gf.max_integrantes,
        u_admin.id as admin_id,
        u_admin.nombre as admin_nombre,
        u_admin.email as admin_email,
        u_admin.telefono as admin_telefono,
        ug.rol_en_grupo,
        COUNT(DISTINCT ug2.usuario_id) as total_miembros,
        EXISTS(SELECT 1 FROM adultos_mayores am WHERE am.grupo_familiar_id = gf.id) as tiene_adulto_mayor
      FROM usuario_grupo ug
      JOIN grupos_familiares gf ON ug.grupo_familiar_id = gf.id
      JOIN usuarios u_admin ON gf.usuario_admin_id = u_admin.id
      LEFT JOIN usuario_grupo ug2 ON gf.id = ug2.grupo_familiar_id AND ug2.estado = 'activo'
      WHERE ug.usuario_id = $1 
        AND ug.estado = 'activo'
        AND gf.activo = true
      GROUP BY gf.id, u_admin.id, ug.rol_en_grupo
    `;

    const result = await client.query(query, [usuarioId]);

    if (result.rows.length === 0) {
      return {
        exito: false,
        error: 'No perteneces a ningún grupo familiar activo',
        codigo: 'SIN_GRUPO'
      };
    }

    const grupo = result.rows[0];

    // Obtener miembros del grupo
    const miembrosQuery = `
      SELECT 
        u.id,
        u.nombre,
        u.apellido,
        u.email,
        u.telefono,
        u.rol,
        u.fecha_nacimiento,
        u.genero,
        u.parentesco,
        u.imagen_perfil,
        u.estado as estado_usuario,
        ug.rol_en_grupo,
        ug.fecha_unio,
        ug.estado as estado_en_grupo,
        ua.nombre as invitado_por_nombre
      FROM usuario_grupo ug
      JOIN usuarios u ON ug.usuario_id = u.id
      LEFT JOIN usuarios ua ON ug.invitado_por = ua.id
      WHERE ug.grupo_familiar_id = $1 
        AND ug.estado = 'activo'
        AND u.estado = 'activo'
      ORDER BY 
        CASE ug.rol_en_grupo 
          WHEN 'admin' THEN 1
          WHEN 'responsable' THEN 2
          ELSE 3
        END,
        u.nombre
    `;

    const miembrosResult = await client.query(miembrosQuery, [grupo.id]);
    grupo.miembros = miembrosResult.rows;

    // Obtener adulto mayor asociado si existe
    if (grupo.tiene_adulto_mayor) {
      const adultoMayorQuery = `
        SELECT 
          id,
          nombre,
          fecha_nacimiento,
          genero,
          estado_salud,
          medico_principal,
          telefono_emergencia,
          alergias,
          medicamentos_cronicos
        FROM adultos_mayores
        WHERE grupo_familiar_id = $1
        LIMIT 1
      `;

      const adultoResult = await client.query(adultoMayorQuery, [grupo.id]);
      grupo.adulto_mayor = adultoResult.rows[0] || null;
    }

    return {
      exito: true,
      grupo,
      mensaje: 'Grupo familiar obtenido exitosamente'
    };

  } catch (error) {
    console.error('❌ Error en obtenerGrupoFamiliar:', error.message);
    return {
      exito: false,
      error: 'Error al obtener grupo familiar',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 2. Obtener código familiar del grupo
 */
export const obtenerCodigoFamiliar = async (usuarioId) => {
  let client;

  try {
    console.log('🔑 [FAMILIA] Obteniendo código familiar para usuario:', usuarioId);

    client = await pool.connect();

    // Verificar que el usuario pertenece a un grupo
    const grupoQuery = `
      SELECT gf.id, gf.codigo_familiar, ug.rol_en_grupo
      FROM usuario_grupo ug
      JOIN grupos_familiares gf ON ug.grupo_familiar_id = gf.id
      WHERE ug.usuario_id = $1 
        AND ug.estado = 'activo'
        AND gf.activo = true
    `;

    const grupoResult = await client.query(grupoQuery, [usuarioId]);

    if (grupoResult.rows.length === 0) {
      return {
        exito: false,
        error: 'No perteneces a ningún grupo familiar',
        codigo: 'SIN_GRUPO'
      };
    }

    const grupo = grupoResult.rows[0];

    // Solo administradores pueden ver el código
    if (grupo.rol_en_grupo !== 'admin' && grupo.rol_en_grupo !== 'responsable') {
      return {
        exito: false,
        error: 'Solo los administradores pueden ver el código familiar',
        codigo: 'SIN_PERMISOS'
      };
    }

    return {
      exito: true,
      codigo: grupo.codigo_familiar,
      mensaje: 'Código familiar obtenido exitosamente'
    };

  } catch (error) {
    console.error('❌ Error en obtenerCodigoFamiliar:', error.message);
    return {
      exito: false,
      error: 'Error al obtener código familiar',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 3. Regenerar código familiar (solo administradores)
 */
export const regenerarCodigoFamiliar = async (usuarioId) => {
  let client;

  try {
    console.log('🔄 [FAMILIA] Regenerando código familiar para usuario:', usuarioId);

    client = await pool.connect();

    // Verificar que el usuario es administrador del grupo
    const grupoQuery = `
      SELECT gf.id, gf.codigo_familiar
      FROM usuario_grupo ug
      JOIN grupos_familiares gf ON ug.grupo_familiar_id = gf.id
      WHERE ug.usuario_id = $1 
        AND ug.rol_en_grupo = 'admin'
        AND ug.estado = 'activo'
        AND gf.activo = true
    `;

    const grupoResult = await client.query(grupoQuery, [usuarioId]);

    if (grupoResult.rows.length === 0) {
      return {
        exito: false,
        error: 'No tienes permisos para regenerar el código',
        codigo: 'SIN_PERMISOS'
      };
    }

    const grupo = grupoResult.rows[0];

    // Generar nuevo código de 6 caracteres
    const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let codigo;
    let codigoUnico = false;
    let intentos = 0;

    while (!codigoUnico && intentos < 10) {
      codigo = '';
      for (let i = 0; i < 6; i++) {
        codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
      }

      const codigoCheck = await client.query(
        'SELECT id FROM grupos_familiares WHERE codigo_familiar = $1 AND id != $2',
        [codigo, grupo.id]
      );

      if (codigoCheck.rows.length === 0) {
        codigoUnico = true;
      }

      intentos++;
    }

    if (!codigoUnico) {
      return {
        exito: false,
        error: 'No se pudo generar un código único',
        codigo: 'ERROR_GENERACION_CODIGO'
      };
    }

    // Actualizar código y extender expiración
    const fechaExpiracion = new Date();
    fechaExpiracion.setDate(fechaExpiracion.getDate() + 7); // 7 días

    await client.query(`
      UPDATE grupos_familiares 
      SET codigo_familiar = $1,
          fecha_expiracion = $2,
          actualizado_en = NOW()
      WHERE id = $3
    `, [codigo, fechaExpiracion, grupo.id]);

    // Inactivar códigos personalizados anteriores
    await client.query(`
      UPDATE codigos_personalizados 
      SET activo = false,
          actualizado_en = NOW()
      WHERE grupo_familiar_id = $1
    `, [grupo.id]);

    return {
      exito: true,
      codigo: codigo,
      fecha_expiracion: fechaExpiracion,
      mensaje: 'Código familiar regenerado exitosamente'
    };

  } catch (error) {
    console.error('❌ Error en regenerarCodigoFamiliar:', error.message);
    return {
      exito: false,
      error: 'Error al regenerar código familiar',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

// ==================== FUNCIONES DE MIEMBROS DE LA FAMILIA ====================

/**
 * 4. Obtener todos los familiares del grupo
 */
export const obtenerFamiliares = async (usuarioId) => {
  let client;

  try {
    console.log('👥 [FAMILIA] Obteniendo familiares para usuario:', usuarioId);

    client = await pool.connect();

    // Primero, determinar el grupo familiar del usuario
    const grupoQuery = `
      SELECT ug.grupo_familiar_id
      FROM usuario_grupo ug
      WHERE ug.usuario_id = $1 AND ug.estado = 'activo'
    `;

    const grupoResult = await client.query(grupoQuery, [usuarioId]);

    if (grupoResult.rows.length === 0) {
      return {
        exito: false,
        error: 'Usuario no pertenece a ningún grupo familiar',
        codigo: 'SIN_GRUPO'
      };
    }

    const grupoId = grupoResult.rows[0].grupo_familiar_id;

    // Obtener todos los usuarios del grupo
    const familiaresQuery = `
      SELECT 
        u.id,
        u.nombre,
        u.apellido,
        u.email,
        u.telefono,
        u.rol,
        u.fecha_nacimiento,
        u.genero,
        u.parentesco,
        u.imagen_perfil,
        u.estado as estado_usuario,
        ug.rol_en_grupo,
        ug.fecha_unio,
        ug.estado as estado_en_grupo,
        ua.nombre as invitado_por_nombre
      FROM usuario_grupo ug
      JOIN usuarios u ON ug.usuario_id = u.id
      LEFT JOIN usuarios ua ON ug.invitado_por = ua.id
      WHERE ug.grupo_familiar_id = $1 
        AND ug.estado = 'activo'
        AND u.estado = 'activo'
      ORDER BY 
        CASE ug.rol_en_grupo 
          WHEN 'admin' THEN 1
          WHEN 'responsable' THEN 2
          ELSE 3
        END,
        u.nombre
    `;

    const familiaresResult = await client.query(familiaresQuery, [grupoId]);

    // Obtener información del adulto mayor asociado (si existe)
    const adultoMayorQuery = `
      SELECT 
        id,
        nombre,
        fecha_nacimiento,
        genero,
        estado_salud,
        medico_principal,
        telefono_emergencia,
        alergias,
        medicamentos_cronicos
      FROM adultos_mayores
      WHERE grupo_familiar_id = $1
      LIMIT 1
    `;

    const adultoMayorResult = await client.query(adultoMayorQuery, [grupoId]);

    return {
      exito: true,
      familiares: familiaresResult.rows,
      adulto_mayor: adultoMayorResult.rows[0] || null,
      total_familiares: familiaresResult.rows.length,
      mensaje: 'Familiares obtenidos exitosamente'
    };

  } catch (error) {
    console.error('❌ Error en obtenerFamiliares:', error.message);
    return {
      exito: false,
      error: 'Error al obtener familiares',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 5. Agregar familiar al grupo (solo administradores)
 */
export const crearFamiliar = async (adminId, datosFamiliar) => {
  let client;

  try {
    console.log('👥 [FAMILIA] Agregando familiar por administrador:', adminId);

    const {
      nombre,
      apellido,
      email,
      telefono,
      fecha_nacimiento,
      genero,
      parentesco,
      rol = 'familiar_secundario',
      relacion_adulto_mayor = ''
    } = datosFamiliar;

    client = await pool.connect();

    // Verificar que el administrador tiene grupo activo
    const grupoCheck = await client.query(`
      SELECT gf.id, gf.max_integrantes, COUNT(ug.usuario_id) as miembros_actuales
      FROM grupos_familiares gf
      JOIN usuario_grupo ug ON gf.id = ug.grupo_familiar_id AND ug.estado = 'activo'
      JOIN usuario_grupo ug_admin ON gf.id = ug_admin.grupo_familiar_id
      WHERE ug_admin.usuario_id = $1 
        AND ug_admin.rol_en_grupo = 'admin'
        AND gf.activo = true
      GROUP BY gf.id
    `, [adminId]);

    if (grupoCheck.rows.length === 0) {
      return {
        exito: false,
        error: 'No tienes permisos para agregar familiares',
        codigo: 'SIN_PERMISOS'
      };
    }

    const { id: grupoId, max_integrantes, miembros_actuales } = grupoCheck.rows[0];

    // Verificar límite de integrantes
    if (miembros_actuales >= max_integrantes) {
      return {
        exito: false,
        error: `El grupo ha alcanzado el límite máximo de ${max_integrantes} integrantes`,
        codigo: 'GRUPO_LLENO'
      };
    }

    // Verificar si el email ya está registrado
    let usuarioId;
    let nuevoUsuario = false;

    if (email) {
      const usuarioResult = await client.query(
        'SELECT id FROM usuarios WHERE LOWER(email) = LOWER($1) AND estado = $2',
        [email, 'activo']
      );

      if (usuarioResult.rows.length > 0) {
        usuarioId = usuarioResult.rows[0].id;

        // Verificar si ya está en el grupo
        const enGrupoCheck = await client.query(
          `SELECT id FROM usuario_grupo 
           WHERE usuario_id = $1 AND grupo_familiar_id = $2 AND estado = $3`,
          [usuarioId, grupoId, 'activo']
        );

        if (enGrupoCheck.rows.length > 0) {
          return {
            exito: false,
            error: 'Este usuario ya está en el grupo familiar',
            codigo: 'USUARIO_EN_GRUPO'
          };
        }
      }
    }

    // Crear usuario si no existe
    if (!usuarioId) {
      if (!nombre) {
        return {
          exito: false,
          error: 'Debes proporcionar un nombre para el nuevo familiar',
          codigo: 'NOMBRE_REQUERIDO'
        };
      }

      // Generar password temporal
      const passwordTemporal = Math.random().toString(36).slice(-8);
      const passwordHash = crypto
        .createHash('sha256')
        .update(passwordTemporal)
        .digest('hex')
        .toLowerCase();

      const insertUsuarioQuery = `
        INSERT INTO usuarios (
          nombre,
          apellido,
          email,
          password,
          telefono,
          fecha_nacimiento,
          genero,
          parentesco,
          rol,
          necesita_completar_perfil,
          estado,
          creado_en
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false, 'activo', NOW())
        RETURNING id, nombre, email, telefono, rol
      `;

      // Notificar a todos los familiares (excepto al creador)
      await notificarAFamiliares(
        grupoId,
        'familiar_nuevo',
        `Se ha agregado un nuevo familiar: ${nombre} ${apellido || ''}`,
        usuarioId,
        'familiares',
        adminId,
        adminId
      );
      const usuarioResult = await client.query(insertUsuarioQuery, [
        nombre,
        apellido || null,
        email || null,
        passwordHash,
        telefono || null,
        fecha_nacimiento || null,
        genero || null,
        parentesco || null,
        rol
      ]);

      usuarioId = usuarioResult.rows[0].id;
      nuevoUsuario = true;
    }

    // Asociar usuario al grupo
    const permisos = {
      ver_medicamentos: true,
      ver_calendario: true,
      ver_gastos: rol === 'responsable' || rol === 'familiar_admin',
      administrar_grupo: rol === 'familiar_admin'
    };

    await client.query(`
      INSERT INTO usuario_grupo (
        usuario_id,
        grupo_familiar_id,
        rol_en_grupo,
        estado,
        permisos,
        invitado_por,
        fecha_unio,
        relacion_adulto_mayor
      ) VALUES ($1, $2, $3, 'activo', $4, $5, NOW(), $6)
    `, [
      usuarioId,
      grupoId,
      rol === 'familiar_admin' ? 'admin' : 'familiar',
      JSON.stringify(permisos),
      adminId,
      relacion_adulto_mayor || null
    ]);

    return {
      exito: true,
      usuario_id: usuarioId,
      nuevo_usuario: nuevoUsuario,
      password_temporal: nuevoUsuario ? passwordTemporal : undefined,
      mensaje: 'Familiar agregado exitosamente al grupo'
    };

  } catch (error) {
    console.error('❌ Error en crearFamiliar:', error.message);

    if (error.code === '23505') { // Violación de unique constraint
      return {
        exito: false,
        error: 'El usuario ya existe en el sistema',
        codigo: 'USUARIO_DUPLICADO'
      };
    }

    return {
      exito: false,
      error: 'Error al agregar familiar',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 6. Actualizar información de un familiar
 */
export const actualizarFamiliar = async (adminId, familiarId, datosFamiliar) => {
  let client;

  try {
    console.log('✏️ [FAMILIA] Actualizando familiar:', familiarId);

    client = await pool.connect();

    // Verificar permisos del administrador
    const permisoCheck = await client.query(`
      SELECT ug.grupo_familiar_id 
      FROM usuario_grupo ug
      WHERE ug.usuario_id = $1 
        AND ug.rol_en_grupo IN ('admin', 'responsable')
        AND ug.estado = 'activo'
    `, [adminId]);

    if (permisoCheck.rows.length === 0) {
      return {
        exito: false,
        error: 'No tienes permisos para actualizar familiares',
        codigo: 'SIN_PERMISOS'
      };
    }

    const grupoId = permisoCheck.rows[0].grupo_familiar_id;

    // Verificar que el familiar pertenece al mismo grupo
    const familiarCheck = await client.query(`
      SELECT ug.id FROM usuario_grupo ug
      WHERE ug.usuario_id = $1 
        AND ug.grupo_familiar_id = $2
    `, [familiarId, grupoId]);

    if (familiarCheck.rows.length === 0) {
      return {
        exito: false,
        error: 'El familiar no pertenece a tu grupo familiar',
        codigo: 'FAMILIAR_NO_ENCONTRADO'
      };
    }

    // Preparar actualización de usuarios
    const valores = [];
    const partesQuery = [];
    let contador = 1;

    const campos = [
      { nombre: 'nombre', valor: datosFamiliar.nombre },
      { nombre: 'apellido', valor: datosFamiliar.apellido },
      { nombre: 'telefono', valor: datosFamiliar.telefono },
      { nombre: 'fecha_nacimiento', valor: datosFamiliar.fecha_nacimiento },
      { nombre: 'genero', valor: datosFamiliar.genero },
      { nombre: 'parentesco', valor: datosFamiliar.parentesco },
      { nombre: 'rol', valor: datosFamiliar.rol } // ← AGREGADO
    ];

    campos.forEach(campo => {
      if (campo.valor !== undefined) {
        partesQuery.push(`${campo.nombre} = $${contador}`);
        valores.push(campo.valor);
        contador++;
      }
    });

    // Si hay algo que actualizar en usuarios
    if (partesQuery.length > 0) {
      valores.push(familiarId);
      const query = `
        UPDATE usuarios 
        SET ${partesQuery.join(', ')}, actualizado_en = NOW()
        WHERE id = $${contador}
        RETURNING 
          id,
          nombre,
          apellido,
          email,
          telefono,
          fecha_nacimiento,
          genero,
          parentesco,
          rol,
          estado,
          creado_en,
          actualizado_en
      `;
      const result = await client.query(query, valores);
      // result.rows[0] contiene el usuario actualizado
    }

    // Actualizar rol_en_grupo si se proporciona rol
    if (datosFamiliar.rol) {
      let rolEnGrupo = 'familiar';
      if (datosFamiliar.rol === 'familiar_admin' || datosFamiliar.rol === 'familiar_administrador') {
        rolEnGrupo = 'admin';
      } else if (datosFamiliar.rol === 'familiar_principal' || datosFamiliar.rol === 'familiar_secundario') {
        rolEnGrupo = 'familiar';
      }
      // Si es adulto_mayor, también puede ser familiar, pero por simplicidad lo dejamos como 'familiar'
      await client.query(`
        UPDATE usuario_grupo 
        SET rol_en_grupo = $1, actualizado_en = NOW()
        WHERE usuario_id = $2 AND grupo_familiar_id = $3
      `, [rolEnGrupo, familiarId, grupoId]);
    }

    // Actualizar relación con adulto mayor si se proporciona
    if (datosFamiliar.relacion_adulto_mayor !== undefined) {
      await client.query(`
        UPDATE usuario_grupo 
        SET relacion_adulto_mayor = $1, actualizado_en = NOW()
        WHERE usuario_id = $2 AND grupo_familiar_id = $3
      `, [datosFamiliar.relacion_adulto_mayor, familiarId, grupoId]);
    }

    // Obtener el familiar actualizado completo para devolver
    const finalQuery = `
      SELECT 
        u.id,
        u.nombre,
        u.apellido,
        u.email,
        u.telefono,
        u.fecha_nacimiento,
        u.genero,
        u.parentesco,
        u.rol,
        u.estado,
        ug.rol_en_grupo,
        ug.relacion_adulto_mayor,
        u.creado_en,
        u.actualizado_en
      FROM usuarios u
      JOIN usuario_grupo ug ON u.id = ug.usuario_id
      WHERE u.id = $1 AND ug.grupo_familiar_id = $2
    `;
    const finalResult = await client.query(finalQuery, [familiarId, grupoId]);

    return {
      exito: true,
      familiar: finalResult.rows[0],
      mensaje: 'Familiar actualizado exitosamente'
    };

  } catch (error) {
    console.error('❌ Error en actualizarFamiliar:', error.message);
    return {
      exito: false,
      error: 'Error al actualizar familiar',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};
/**
 * 7. Eliminar familiar del grupo (solo administradores)
 */
export const eliminarFamiliar = async (adminId, familiarId) => {
  let client;

  try {
    console.log('🗑️ [FAMILIA] Eliminando familiar:', familiarId);

    client = await pool.connect();

    // Verificar permisos del administrador
    const permisoCheck = await client.query(`
      SELECT ug.grupo_familiar_id 
      FROM usuario_grupo ug
      WHERE ug.usuario_id = $1 
        AND ug.rol_en_grupo IN ('admin', 'responsable')
        AND ug.estado = 'activo'
    `, [adminId]);

    if (permisoCheck.rows.length === 0) {
      return {
        exito: false,
        error: 'No tienes permisos para eliminar familiares',
        codigo: 'SIN_PERMISOS'
      };
    }

    const grupoId = permisoCheck.rows[0].grupo_familiar_id;

    // Verificar que el familiar pertenece al mismo grupo
    const familiarCheck = await client.query(`
      SELECT ug.id, ug.rol_en_grupo 
      FROM usuario_grupo ug
      WHERE ug.usuario_id = $1 
        AND ug.grupo_familiar_id = $2
    `, [familiarId, grupoId]);

    if (familiarCheck.rows.length === 0) {
      return {
        exito: false,
        error: 'El familiar no pertenece a tu grupo familiar',
        codigo: 'FAMILIAR_NO_ENCONTRADO'
      };
    }

    const familiarData = familiarCheck.rows[0];

    // No permitir eliminar administradores
    if (familiarData.rol_en_grupo === 'admin') {
      // Contar cuántos administradores quedan
      const adminCount = await client.query(`
        SELECT COUNT(*) 
        FROM usuario_grupo 
        WHERE grupo_familiar_id = $1 
          AND rol_en_grupo = 'admin'
          AND estado = 'activo'
      `, [grupoId]);

      if (parseInt(adminCount.rows[0].count) <= 1) {
        return {
          exito: false,
          error: 'No puedes eliminar al único administrador del grupo',
          codigo: 'UNICO_ADMIN'
        };
      }
    }

    // Eliminar usuario del grupo (borrado lógico)
    await client.query(`
      UPDATE usuario_grupo 
      SET estado = 'inactivo', actualizado_en = NOW()
      WHERE usuario_id = $1 AND grupo_familiar_id = $2
    `, [familiarId, grupoId]);

    return {
      exito: true,
      mensaje: 'Familiar eliminado del grupo exitosamente'
    };

  } catch (error) {
    console.error('❌ Error en eliminarFamiliar:', error.message);
    return {
      exito: false,
      error: 'Error al eliminar familiar',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

// ==================== FUNCIONES DE CÓDIGOS PERSONALIZADOS ====================

/**
 * 8. Obtener códigos personalizados del grupo (solo administradores)
 */
export const obtenerCodigosPersonalizados = async (usuarioId) => {
  let client;

  try {
    console.log('🔑 [FAMILIA] Obteniendo códigos personalizados para usuario:', usuarioId);

    client = await pool.connect();

    // Verificar que el usuario es administrador del grupo
    const grupoQuery = `
      SELECT gf.id 
      FROM usuario_grupo ug
      JOIN grupos_familiares gf ON ug.grupo_familiar_id = gf.id
      WHERE ug.usuario_id = $1 
        AND ug.rol_en_grupo = 'admin'
        AND ug.estado = 'activo'
        AND gf.activo = true
    `;

    const grupoResult = await client.query(grupoQuery, [usuarioId]);

    if (grupoResult.rows.length === 0) {
      return {
        exito: false,
        error: 'No tienes permisos para ver códigos personalizados',
        codigo: 'SIN_PERMISOS'
      };
    }

    const grupoId = grupoResult.rows[0].id;

    // Obtener códigos personalizados activos
    const codigosQuery = `
      SELECT 
        cp.id,
        cp.codigo,
        cp.nombre,
        cp.apellido,
        cp.parentesco,
        cp.rol_asignado,
        cp.descripcion,
        cp.max_usos,
        cp.usos_actuales,
        cp.fecha_expiracion,
        cp.activo,
        cp.creado_en,
        cp.actualizado_en,
        u_creador.nombre as creador_nombre,
        CASE 
          WHEN cp.activo = false THEN 'inactivo'
          WHEN cp.usos_actuales > 0 THEN 'en uso'
          WHEN cp.max_usos IS NOT NULL AND cp.usos_actuales >= cp.max_usos THEN 'en uso'
          ELSE 'pendiente'
        END as estado
      FROM codigos_personalizados cp
      JOIN usuarios u_creador ON cp.creado_por = u_creador.id
      WHERE cp.grupo_familiar_id = $1
      ORDER BY cp.creado_en DESC
    `;

    const codigosResult = await client.query(codigosQuery, [grupoId]);

    return {
      exito: true,
      codigos: codigosResult.rows,
      total_codigos: codigosResult.rows.length,
      mensaje: 'Códigos personalizados obtenidos exitosamente'
    };

  } catch (error) {
    console.error('❌ Error en obtenerCodigosPersonalizados:', error.message);
    return {
      exito: false,
      error: 'Error al obtener códigos personalizados',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 9. Crear código personalizado (solo administradores)
 */
export const crearCodigoPersonalizado = async (usuarioId, datosCodigo) => {
  let client;

  try {
    console.log('✨ [FAMILIA] Creando código personalizado para usuario:', usuarioId);

    const {
      nombre,
      apellido,
      parentesco,
      rol_asignado = 'familiar',
      descripcion = '',
      max_usos = 1,
      fecha_expiracion = null
    } = datosCodigo;

    if (!nombre) {
      return {
        exito: false,
        error: 'El nombre es requerido',
        codigo: 'NOMBRE_REQUERIDO'
      };
    }

    client = await pool.connect();

    // Verificar que el usuario es administrador del grupo
    const grupoQuery = `
      SELECT gf.id 
      FROM usuario_grupo ug
      JOIN grupos_familiares gf ON ug.grupo_familiar_id = gf.id
      WHERE ug.usuario_id = $1 
        AND ug.rol_en_grupo = 'admin'
        AND ug.estado = 'activo'
        AND gf.activo = true
    `;

    const grupoResult = await client.query(grupoQuery, [usuarioId]);

    if (grupoResult.rows.length === 0) {
      return {
        exito: false,
        error: 'No tienes permisos para crear códigos personalizados',
        codigo: 'SIN_PERMISOS'
      };
    }

    const grupoId = grupoResult.rows[0].id;

    // Generar código único de 6 caracteres
    const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let codigo;
    let codigoUnico = false;
    let intentos = 0;

    while (!codigoUnico && intentos < 10) {
      codigo = '';
      for (let i = 0; i < 6; i++) {
        codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
      }

      const codigoCheck = await client.query(
        'SELECT id FROM codigos_personalizados WHERE codigo = $1',
        [codigo]
      );

      if (codigoCheck.rows.length === 0) {
        codigoUnico = true;
      }

      intentos++;
    }

    if (!codigoUnico) {
      return {
        exito: false,
        error: 'No se pudo generar un código único',
        codigo: 'ERROR_GENERACION_CODIGO'
      };
    }

    // Crear código personalizado
    const insertQuery = `
      INSERT INTO codigos_personalizados (
        grupo_familiar_id,
        codigo,
        nombre,
        apellido,
        parentesco,
        rol_asignado,
        descripcion,
        creado_por,
        max_usos,
        fecha_expiracion,
        activo,
        permisos,
        creado_en
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL, NULL, true, $9, NOW())
      RETURNING *
    `;

    const permisos = rol_asignado === 'familiar_admin'
      ? '{"ver_medicamentos": true, "ver_calendario": true, "ver_gastos": true, "administrar_grupo": true}'
      : '{"ver_medicamentos": true, "ver_calendario": true}';

    const result = await client.query(insertQuery, [
      grupoId,
      codigo,
      nombre,
      apellido || null,
      parentesco || null,
      rol_asignado,
      descripcion,
      usuarioId,
      permisos
    ]);

    return {
      exito: true,
      codigo: result.rows[0],
      mensaje: 'Código personalizado creado exitosamente'
    };

  } catch (error) {
    console.error('❌ Error en crearCodigoPersonalizado:', error.message);

    if (error.code === '23505') { // Violación de unique constraint
      return {
        exito: false,
        error: 'El código ya existe, intenta generar otro',
        codigo: 'CODIGO_DUPLICADO'
      };
    }

    return {
      exito: false,
      error: 'Error al crear código personalizado',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 10. Eliminar código personalizado (solo administradores)
 */
export const eliminarCodigoPersonalizado = async (usuarioId, codigoId) => {
  let client;

  try {
    console.log('🗑️ [FAMILIA] Eliminando código personalizado:', codigoId);

    client = await pool.connect();

    // Verificar que el usuario es administrador del grupo
    const grupoQuery = `
      SELECT gf.id 
      FROM usuario_grupo ug
      JOIN grupos_familiares gf ON ug.grupo_familiar_id = gf.id
      WHERE ug.usuario_id = $1 
        AND ug.rol_en_grupo = 'admin'
        AND ug.estado = 'activo'
        AND gf.activo = true
    `;

    const grupoResult = await client.query(grupoQuery, [usuarioId]);

    if (grupoResult.rows.length === 0) {
      return {
        exito: false,
        error: 'No tienes permisos para eliminar códigos personalizados',
        codigo: 'SIN_PERMISOS'
      };
    }

    const grupoId = grupoResult.rows[0].id;

    // Verificar que el código pertenece al grupo
    const codigoCheck = await client.query(`
      SELECT id FROM codigos_personalizados 
      WHERE id = $1 AND grupo_familiar_id = $2
    `, [codigoId, grupoId]);

    if (codigoCheck.rows.length === 0) {
      return {
        exito: false,
        error: 'Código no encontrado en tu grupo',
        codigo: 'CODIGO_NO_ENCONTRADO'
      };
    }

    // Eliminar código (borrado físico porque aún no se ha usado)
    await client.query(`
      DELETE FROM codigos_personalizados 
      WHERE id = $1 AND grupo_familiar_id = $2 AND usos_actuales = 0
    `, [codigoId, grupoId]);

    // Si se había usado, desactivarlo
    const deleteResult = await client.query(`
      DELETE FROM codigos_personalizados 
      WHERE id = $1 AND grupo_familiar_id = $2
      RETURNING id
    `, [codigoId, grupoId]);

    if (deleteResult.rows.length === 0) {
      // Si no se pudo eliminar porque ya fue usado, desactivarlo
      await client.query(`
        UPDATE codigos_personalizados 
        SET activo = false, actualizado_en = NOW()
        WHERE id = $1 AND grupo_familiar_id = $2
      `, [codigoId, grupoId]);
    }

    return {
      exito: true,
      mensaje: 'Código personalizado eliminado exitosamente'
    };

  } catch (error) {
    console.error('❌ Error en eliminarCodigoPersonalizado:', error.message);
    return {
      exito: false,
      error: 'Error al eliminar código personalizado',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

// ==================== FUNCIONES DE CREACIÓN Y UNIÓN A GRUPO ====================

/**
 * Crear un nuevo grupo familiar (usuario se convierte en admin)
 */
export const crearGrupoFamiliar = async (usuarioId, nombreGrupo = 'Mi Familia') => {
  let client;
  try {
    client = await pool.connect();

    // Verificar que el usuario no pertenezca ya a un grupo activo
    const checkGrupo = await client.query(`
      SELECT 1 FROM usuario_grupo WHERE usuario_id = $1 AND estado = 'activo'
    `, [usuarioId]);
    if (checkGrupo.rows.length > 0) {
      return {
        exito: false,
        error: 'Ya perteneces a un grupo familiar activo',
        codigo: 'YA_EN_GRUPO'
      };
    }

    // Generar código único de 6 caracteres
    const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let codigo;
    let codigoUnico = false;
    let intentos = 0;
    while (!codigoUnico && intentos < 10) {
      codigo = '';
      for (let i = 0; i < 6; i++) {
        codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
      }
      const codigoCheck = await client.query(
        'SELECT id FROM grupos_familiares WHERE codigo_familiar = $1',
        [codigo]
      );
      if (codigoCheck.rows.length === 0) codigoUnico = true;
      intentos++;
    }
    if (!codigoUnico) {
      return {
        exito: false,
        error: 'No se pudo generar un código único',
        codigo: 'ERROR_GENERACION_CODIGO'
      };
    }

    // Crear grupo
    const grupoResult = await client.query(`
      INSERT INTO grupos_familiares (codigo_familiar, nombre_grupo, usuario_admin_id, activo, fecha_creacion, fecha_expiracion, max_integrantes)
      VALUES ($1, $2, $3, true, NOW(), NOW() + INTERVAL '30 days', 10)
      RETURNING id, codigo_familiar, nombre_grupo
    `, [codigo, nombreGrupo, usuarioId]);

    const grupo = grupoResult.rows[0];
    const grupoId = grupo.id;

    // Asignar usuario como administrador en usuario_grupo
    await client.query(`
      INSERT INTO usuario_grupo (usuario_id, grupo_familiar_id, rol_en_grupo, estado, fecha_unio)
      VALUES ($1, $2, 'admin', 'activo', NOW())
    `, [usuarioId, grupoId]);

    // Crear entrada en familiares? (opcional, pero para consistencia)
    // No es necesario porque aún no hay adulto mayor asociado.

    return {
      exito: true,
      grupo,
      mensaje: 'Grupo familiar creado exitosamente'
    };
  } catch (error) {
    console.error('❌ Error en crearGrupoFamiliar:', error.message);
    return {
      exito: false,
      error: 'Error al crear el grupo familiar',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) client.release();
  }
};

/**
 * Unirse a un grupo familiar existente
 */
export const unirseAGrupoFamiliar = async (usuarioId, codigoFamiliar) => {
  let client;
  try {
    client = await pool.connect();

    // Verificar que el usuario no esté ya en un grupo activo
    const checkGrupo = await client.query(`
      SELECT 1 FROM usuario_grupo WHERE usuario_id = $1 AND estado = 'activo'
    `, [usuarioId]);
    if (checkGrupo.rows.length > 0) {
      return {
        exito: false,
        error: 'Ya perteneces a un grupo familiar activo',
        codigo: 'YA_EN_GRUPO'
      };
    }

    // Limpiar código
    const codigoLimpio = codigoFamiliar.replace(/-/g, '').toUpperCase();

    // Buscar grupo activo por código
    const grupoResult = await client.query(`
      SELECT id, nombre_grupo, max_integrantes
      FROM grupos_familiares
      WHERE codigo_familiar = $1 AND activo = true AND fecha_expiracion > NOW()
    `, [codigoLimpio]);

    if (grupoResult.rows.length === 0) {
      return {
        exito: false,
        error: 'Código familiar inválido o expirado',
        codigo: 'CODIGO_INVALIDO'
      };
    }

    const grupo = grupoResult.rows[0];
    const grupoId = grupo.id;

    // Verificar límite de integrantes
    const countMiembros = await client.query(`
      SELECT COUNT(*) as total FROM usuario_grupo WHERE grupo_familiar_id = $1 AND estado = 'activo'
    `, [grupoId]);
    const totalMiembros = parseInt(countMiembros.rows[0].total);
    if (totalMiembros >= grupo.max_integrantes) {
      return {
        exito: false,
        error: `El grupo ha alcanzado el límite máximo de ${grupo.max_integrantes} miembros`,
        codigo: 'GRUPO_LLENO'
      };
    }

    // Agregar usuario al grupo como 'familiar'
    await client.query(`
      INSERT INTO usuario_grupo (usuario_id, grupo_familiar_id, rol_en_grupo, estado, fecha_unio)
      VALUES ($1, $2, 'familiar', 'activo', NOW())
    `, [usuarioId, grupoId]);

    // Notificar al administrador del grupo (opcional)
    // Podrías obtener el admin y enviar notificación con notificarAFamiliares

    return {
      exito: true,
      mensaje: 'Te has unido al grupo familiar exitosamente',
      grupo: {
        id: grupo.id,
        nombre: grupo.nombre_grupo
      }
    };
  } catch (error) {
    console.error('❌ Error en unirseAGrupoFamiliar:', error.message);
    return {
      exito: false,
      error: 'Error al unirse al grupo familiar',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) client.release();
  }
};

// ==================== FUNCIONES DE ADULTO MAYOR ====================

/**
 * 11. Crear/Actualizar información del adulto mayor del grupo
 */
export const actualizarAdultoMayor = async (usuarioId, datosAdultoMayor) => {
  let client;

  try {
    console.log('👴 [FAMILIA] Actualizando adulto mayor para usuario ID:', usuarioId);

    client = await pool.connect();

    // Verificar que el usuario es administrador del grupo
    const grupoQuery = `
      SELECT gf.id 
      FROM usuario_grupo ug
      JOIN grupos_familiares gf ON ug.grupo_familiar_id = gf.id
      WHERE ug.usuario_id = $1 
        AND ug.rol_en_grupo IN ('admin', 'responsable')
        AND ug.estado = 'activo'
        AND gf.activo = true
    `;

    const grupoResult = await client.query(grupoQuery, [usuarioId]);

    if (grupoResult.rows.length === 0) {
      return {
        exito: false,
        error: 'No tienes permisos para gestionar el adulto mayor',
        codigo: 'SIN_PERMISOS'
      };
    }

    const grupoId = grupoResult.rows[0].id;

    const {
      nombre,
      fecha_nacimiento,
      genero,
      estado_salud,
      medico_principal,
      telefono_emergencia,
      alergias,
      medicamentos_cronicos,
      contacto_emergencia_nombre,
      contacto_emergencia_telefono,
      direccion,
      notas_medicas
    } = datosAdultoMayor;

    if (!nombre || !fecha_nacimiento) {
      return {
        exito: false,
        error: 'Nombre y fecha de nacimiento son requeridos',
        codigo: 'DATOS_INCOMPLETOS'
      };
    }

    // Verificar si ya existe un adulto mayor en el grupo
    const existeAdultoMayor = await client.query(`
      SELECT id FROM adultos_mayores WHERE grupo_familiar_id = $1
    `, [grupoId]);

    let resultado;

    if (existeAdultoMayor.rows.length > 0) {
      // Actualizar adulto mayor existente
      const updateQuery = `
        UPDATE adultos_mayores 
        SET nombre = $1,
            fecha_nacimiento = $2,
            genero = $3,
            estado_salud = $4,
            medico_principal = $5,
            telefono_emergencia = $6,
            alergias = $7,
            medicamentos_cronicos = $8,
            contacto_emergencia_nombre = $9,
            contacto_emergencia_telefono = $10,
            direccion = $11,
            notas_medicas = $12,
            actualizado_en = NOW()
        WHERE grupo_familiar_id = $13
        RETURNING *
      `;

      resultado = await client.query(updateQuery, [
        nombre,
        fecha_nacimiento,
        genero || null,
        estado_salud || null,
        medico_principal || null,
        telefono_emergencia || null,
        alergias || null,
        medicamentos_cronicos || null,
        contacto_emergencia_nombre || null,
        contacto_emergencia_telefono || null,
        direccion || null,
        notas_medicas || null,
        grupoId
      ]);

    } else {
      // Crear nuevo adulto mayor
      const insertQuery = `
        INSERT INTO adultos_mayores (
          grupo_familiar_id,
          nombre,
          fecha_nacimiento,
          genero,
          estado_salud,
          medico_principal,
          telefono_emergencia,
          alergias,
          medicamentos_cronicos,
          contacto_emergencia_nombre,
          contacto_emergencia_telefono,
          direccion,
          notas_medicas,
          creado_en,
          actualizado_en
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
        RETURNING *
      `;

      resultado = await client.query(insertQuery, [
        grupoId,
        nombre,
        fecha_nacimiento,
        genero || null,
        estado_salud || null,
        medico_principal || null,
        telefono_emergencia || null,
        alergias || null,
        medicamentos_cronicos || null,
        contacto_emergencia_nombre || null,
        contacto_emergencia_telefono || null,
        direccion || null,
        notas_medicas || null
      ]);

      // ============================================================
      // 🔥 DESPUÉS de obtener resultado (resultado.rows[0])
      // ============================================================
      const adulto_mayor_id = resultado.rows[0].id;

      // Obtener todos los miembros activos del grupo
      const miembrosQuery = `
        SELECT usuario_id FROM usuario_grupo 
        WHERE grupo_familiar_id = $1 AND estado = 'activo'
      `;
      const miembrosResult = await client.query(miembrosQuery, [grupoId]);

      for (const miembro of miembrosResult.rows) {
        // Verificar si ya existe relación en familiares
        const existente = await client.query(
          'SELECT id FROM familiares WHERE usuario_id = $1 AND adulto_mayor_id = $2',
          [miembro.usuario_id, adulto_mayor_id]
        );
        if (existente.rows.length === 0) {
          const esPrincipal = miembro.usuario_id === usuarioId; // el usuario que crea/edita es el principal
          await client.query(`
            INSERT INTO familiares (usuario_id, adulto_mayor_id, es_principal, rol_familiar, parentesco, creado_en)
            VALUES ($1, $2, $3, 'familiar', 'Familiar', NOW())
          `, [miembro.usuario_id, adulto_mayor_id, esPrincipal]);
        }
      }
      // ============================================================ 
    }

    // ============================================================
    // 🔥 AQUÍ SE INSERTA EL BLOQUE NUEVO (después de obtener resultado)
    // ============================================================
    const adulto_mayor_id = resultado.rows[0].id;

    // Verificar si ya existe relación en familiares
    const familiarCheck = await client.query(
      'SELECT id FROM familiares WHERE usuario_id = $1 AND adulto_mayor_id = $2',
      [usuarioId, adulto_mayor_id]
    );

    if (familiarCheck.rows.length === 0) {
      await client.query(`
        INSERT INTO familiares (usuario_id, adulto_mayor_id, es_principal, rol_familiar, parentesco)
        VALUES ($1, $2, true, 'familiar_admin', 'Familiar')
      `, [usuarioId, adulto_mayor_id]);
    }
    // ============================================================

    return {
      exito: true,
      adulto_mayor: resultado.rows[0],
      mensaje: existeAdultoMayor.rows.length > 0
        ? 'Información del adulto mayor actualizada exitosamente'
        : 'Adulto mayor registrado exitosamente'
    };

  } catch (error) {
    console.error('❌ Error en actualizarAdultoMayor:', error.message);
    return {
      exito: false,
      error: 'Error al actualizar información del adulto mayor',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};


/**
 * Eliminar grupo familiar y todos sus datos asociados (soft delete en cascada)
 */
export const eliminarGrupoFamiliar = async (usuarioId) => {
  let client;
  try {
    console.log(`🗑️ [FAMILIA] Eliminando grupo familiar por usuario: ${usuarioId}`);
    client = await pool.connect();

    // 1. Verificar que el usuario es administrador del grupo
    const adminCheck = await client.query(`
      SELECT gf.id, gf.nombre_grupo
      FROM usuario_grupo ug
      JOIN grupos_familiares gf ON ug.grupo_familiar_id = gf.id
      WHERE ug.usuario_id = $1 AND ug.rol_en_grupo = 'admin' AND gf.activo = true
    `, [usuarioId]);

    if (adminCheck.rows.length === 0) {
      return {
        exito: false,
        error: 'No eres administrador o no hay un grupo activo',
        codigo: 'NO_ADMIN_O_GRUPO_INACTIVO'
      };
    }

    const grupoId = adminCheck.rows[0].id;
    const nombreGrupo = adminCheck.rows[0].nombre_grupo;

    // 2. Obtener el adulto_mayor_id asociado al grupo (si existe)
    const adultoResult = await client.query(`
      SELECT id FROM adultos_mayores WHERE grupo_familiar_id = $1
    `, [grupoId]);
    const adultoMayorId = adultoResult.rows.length > 0 ? adultoResult.rows[0].id : null;

    // Iniciar transacción
    await client.query('BEGIN');

    try {
      // 3. Desactivar registros relacionados con el adulto mayor (si existe)
      if (adultoMayorId) {
        // Enfermedades, alergias, artículos, hobbies, citas, medicinas, etc.
        await client.query(`UPDATE enfermedades_adulto SET activa = false, actualizado_en = NOW() WHERE adulto_mayor_id = $1`, [adultoMayorId]);
        await client.query(`UPDATE alergias_adulto SET activa = false, actualizado_en = NOW() WHERE adulto_mayor_id = $1`, [adultoMayorId]);
        await client.query(`UPDATE articulos_adulto SET activo = false, actualizado_en = NOW() WHERE adulto_mayor_id = $1`, [adultoMayorId]);
        await client.query(`UPDATE hobbies_adulto SET activo = false, actualizado_en = NOW() WHERE adulto_mayor_id = $1`, [adultoMayorId]);
        await client.query(`UPDATE citas_rutinarias SET activa = false, actualizado_en = NOW() WHERE adulto_mayor_id = $1`, [adultoMayorId]);
        await client.query(`UPDATE medicinas SET activa = false, actualizado_en = NOW() WHERE adulto_mayor_id = $1`, [adultoMayorId]);
        await client.query(`UPDATE mediciones_salud SET activa = false, actualizado_en = NOW() WHERE adulto_mayor_id = $1`, [adultoMayorId]);
        await client.query(`UPDATE eventos_calendario SET activo = false, actualizado_en = NOW() WHERE adulto_mayor_id = $1`, [adultoMayorId]);
        await client.query(`UPDATE gastos SET deleted_at = NOW() WHERE adulto_mayor_id = $1`, [adultoMayorId]);
        await client.query(`UPDATE aportes_gastos SET deleted_at = NOW() WHERE gasto_id IN (SELECT id FROM gastos WHERE adulto_mayor_id = $1)`, [adultoMayorId]);
        await client.query(`UPDATE actividades_ocurrencias SET activa = false, actualizado_en = NOW() WHERE adulto_mayor_id = $1`, [adultoMayorId]);
        await client.query(`UPDATE actividades_base SET activa = false, actualizado_en = NOW() WHERE adulto_mayor_id = $1`, [adultoMayorId]);
        await client.query(`UPDATE adultos_mayores SET activo = false, actualizado_en = NOW() WHERE id = $1`, [adultoMayorId]);
      }

      // 4. Desactivar códigos personalizados del grupo
      await client.query(`UPDATE codigos_personalizados SET activo = false, actualizado_en = NOW() WHERE grupo_familiar_id = $1`, [grupoId]);

      // 5. Desactivar miembros del grupo
      await client.query(`UPDATE usuario_grupo SET estado = 'inactivo', actualizado_en = NOW() WHERE grupo_familiar_id = $1`, [grupoId]);

      // 6. Desactivar distribuciones de gastos
      if (adultoMayorId) {
        await client.query(`UPDATE distribuciones_gastos SET activo = false, actualizado_en = NOW() WHERE adulto_mayor_id = $1`, [adultoMayorId]);
      }

      // 7. Marcar notificaciones como leídas
      await client.query(`UPDATE notificaciones SET leida = true WHERE usuario_id IN (SELECT usuario_id FROM usuario_grupo WHERE grupo_familiar_id = $1)`, [grupoId]);

      // 8. Desactivar el grupo familiar
      await client.query(`UPDATE grupos_familiares SET activo = false, actualizado_en = NOW() WHERE id = $1`, [grupoId]);

      await client.query('COMMIT');

      console.log(`✅ Grupo familiar "${nombreGrupo}" (ID: ${grupoId}) eliminado con todos sus datos asociados.`);

      return {
        exito: true,
        mensaje: `Grupo familiar "${nombreGrupo}" y todos sus datos asociados han sido eliminados.`,
        grupo_id: grupoId,
        adulto_mayor_id: adultoMayorId
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error en transacción de eliminación:', error.message);
      throw error;
    }

  } catch (error) {
    console.error('❌ Error en eliminarGrupoFamiliar:', error.message);
    return {
      exito: false,
      error: 'Error del servidor al eliminar el grupo familiar',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) client.release();
  }
};

/**
 * Salir del grupo familiar (para cualquier miembro)
 */
export const salirDelGrupoFamiliar = async (usuarioId) => {
  let client;
  try {
    console.log(`🚪 [FAMILIA] Usuario ${usuarioId} intenta salir del grupo`);
    client = await pool.connect();

    // 1. Obtener grupo del usuario y su rol
    const grupoQuery = `
      SELECT 
        ug.grupo_familiar_id,
        ug.rol_en_grupo,
        gf.id as grupo_id,
        gf.nombre_grupo,
        (SELECT COUNT(*) FROM usuario_grupo WHERE grupo_familiar_id = ug.grupo_familiar_id AND estado = 'activo') as total_miembros,
        (SELECT COUNT(*) FROM usuario_grupo WHERE grupo_familiar_id = ug.grupo_familiar_id AND estado = 'activo' AND rol_en_grupo = 'admin') as total_admins
      FROM usuario_grupo ug
      JOIN grupos_familiares gf ON ug.grupo_familiar_id = gf.id
      WHERE ug.usuario_id = $1 AND ug.estado = 'activo' AND gf.activo = true
    `;

    const grupoResult = await client.query(grupoQuery, [usuarioId]);
    if (grupoResult.rows.length === 0) {
      return {
        exito: false,
        error: 'No perteneces a ningún grupo familiar activo',
        codigo: 'SIN_GRUPO'
      };
    }

    const data = grupoResult.rows[0];
    const { grupo_familiar_id, rol_en_grupo, total_miembros, total_admins } = data;
    const esAdmin = rol_en_grupo === 'admin';

    // 2. Determinar acción según rol y cantidad de miembros
    // Si es el único administrador y el único miembro → eliminar grupo
    if (esAdmin && total_admins === 1 && total_miembros === 1) {
      // Usar la función existente para eliminar grupo
      return await eliminarGrupoFamiliar(usuarioId);
    }

    // Si es administrador pero hay otros administradores → degradar a familiar y desactivar
    if (esAdmin && total_admins > 1) {
      await client.query(`
        UPDATE usuario_grupo
        SET estado = 'inactivo', actualizado_en = NOW()
        WHERE usuario_id = $1 AND grupo_familiar_id = $2
      `, [usuarioId, grupo_familiar_id]);

      return {
        exito: true,
        mensaje: 'Has salido del grupo familiar. Ya no eres administrador.',
        accion: 'salir',
        grupo_id: grupo_familiar_id
      };
    }

    // Si es familiar normal → desactivar relación
    if (!esAdmin) {
      await client.query(`
        UPDATE usuario_grupo
        SET estado = 'inactivo', actualizado_en = NOW()
        WHERE usuario_id = $1 AND grupo_familiar_id = $2
      `, [usuarioId, grupo_familiar_id]);

      return {
        exito: true,
        mensaje: 'Has salido del grupo familiar.',
        accion: 'salir',
        grupo_id: grupo_familiar_id
      };
    }

    // Fallback (no debería llegar)
    return {
      exito: false,
      error: 'No se pudo procesar la solicitud de salida',
      codigo: 'ERROR_SALIDA'
    };

  } catch (error) {
    console.error('❌ Error en salirDelGrupoFamiliar:', error.message);
    return {
      exito: false,
      error: 'Error del servidor al salir del grupo',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) client.release();
  }
};
/**
 * 12. Obtener información del adulto mayor del grupo
 */
export const obtenerAdultoMayor = async (usuarioId) => {
  let client;

  try {
    console.log('👴 [FAMILIA] Obteniendo adulto mayor para usuario:', usuarioId);

    client = await pool.connect();

    // Obtener grupo familiar del usuario
    const grupoQuery = `
      SELECT ug.grupo_familiar_id 
      FROM usuario_grupo ug
      WHERE ug.usuario_id = $1 AND ug.estado = 'activo'
    `;

    const grupoResult = await client.query(grupoQuery, [usuarioId]);

    if (grupoResult.rows.length === 0) {
      return {
        exito: false,
        error: 'No perteneces a ningún grupo familiar',
        codigo: 'SIN_GRUPO'
      };
    }

    const grupoId = grupoResult.rows[0].grupo_familiar_id;

    // Obtener información del adulto mayor
    const adultoMayorQuery = `
      SELECT 
        id,
        nombre,
        fecha_nacimiento,
        genero,
        estado_salud,
        medico_principal,
        telefono_emergencia,
        alergias,
        medicamentos_cronicos,
        contacto_emergencia_nombre,
        contacto_emergencia_telefono,
        direccion,
        notas_medicas,
        creado_en,
        actualizado_en
      FROM adultos_mayores
      WHERE grupo_familiar_id = $1
      LIMIT 1
    `;

    const adultoMayorResult = await client.query(adultoMayorQuery, [grupoId]);

    if (adultoMayorResult.rows.length === 0) {
      return {
        exito: false,
        error: 'No hay adulto mayor registrado en el grupo',
        codigo: 'NO_ADULTO_MAYOR'
      };
    }

    return {
      exito: true,
      adulto_mayor: adultoMayorResult.rows[0],
      mensaje: 'Información del adulto mayor obtenida exitosamente'
    };

  } catch (error) {
    console.error('❌ Error en obtenerAdultoMayor:', error.message);
    return {
      exito: false,
      error: 'Error al obtener información del adulto mayor',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};



// ==================== EXPORTACIÓN ====================

export default {
  // Grupos familiares
  obtenerGrupoFamiliar,
  obtenerCodigoFamiliar,
  regenerarCodigoFamiliar,

  // Familiares
  obtenerFamiliares,
  crearFamiliar,
  actualizarFamiliar,
  eliminarFamiliar,

  // Códigos personalizados
  obtenerCodigosPersonalizados,
  crearCodigoPersonalizado,
  eliminarCodigoPersonalizado,

  // Adulto mayor
  actualizarAdultoMayor,
  obtenerAdultoMayor,

  // NUEVAS FUNCIONES PARA GESTIÓN DE GRUPO
  crearGrupoFamiliar,      // ← Agregar
  unirseAGrupoFamiliar,    // ← Agregar (si está definida)
  eliminarGrupoFamiliar,   // ← Agregar
  salirDelGrupoFamiliar    // ← Agregar
};