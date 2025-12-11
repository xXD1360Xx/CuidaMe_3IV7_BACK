// controladores/preferenciasControlador.js - Controlador de Preferencias y Configuración de Usuario
import { pool } from '../configuracion/basedeDatos.js';
import bcrypt from 'bcryptjs';

// ==================== FUNCIONES PRINCIPALES ====================

/**
 * 1. Obtener información del usuario
 */
export const obtenerInformacionUsuario = async (usuarioId) => {
  let client;
  
  try {
    console.log('👤 [PREFERENCIAS] Obteniendo información para usuario ID:', usuarioId);
    
    client = await pool.connect();
    
    const query = `
      SELECT 
        u.id,
        u.nombre,
        u.apellido,
        u.email,
        u.foto_perfil,
        u.rol,
        u.activo,
        u.creado_en,
        u.ultimo_acceso,
        -- Obtener familiares asociados
        (
          SELECT JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', f.id,
              'adulto_mayor_id', f.adulto_mayor_id,
              'es_principal', f.es_principal,
              'rol_familiar', f.rol_familiar,
              'creado_en', f.creado_en
            )
          )
          FROM familiares f
          WHERE f.usuario_id = u.id
        ) as familiares
      FROM usuarios u
      WHERE u.id = $1
    `;
    
    const result = await client.query(query, [usuarioId]);
    
    if (result.rows.length === 0) {
      return { 
        exito: false, 
        error: 'Usuario no encontrado',
        codigo: 'USUARIO_NO_ENCONTRADO'
      };
    }
    
    const usuario = result.rows[0];
    
    console.log('✅ Información de usuario obtenida:', usuario.email);
    
    return {
      exito: true,
      usuario: {
        ...usuario,
        familiares: usuario.familiares || []
      },
      mensaje: 'Información de usuario obtenida correctamente'
    };
    
  } catch (error) {
    console.error('❌ Error en obtenerInformacionUsuario:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al obtener información del usuario',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 2. Actualizar información del usuario
 */
export const actualizarUsuario = async (usuarioId, datos) => {
  let client;
  
  try {
    console.log('✏️ [PREFERENCIAS] Actualizando usuario ID:', usuarioId);
    
    client = await pool.connect();
    
    // Verificar que el usuario existe
    const verifyQuery = `
      SELECT 1 FROM usuarios WHERE id = $1
    `;
    
    const verifyResult = await client.query(verifyQuery, [usuarioId]);
    
    if (verifyResult.rows.length === 0) {
      return { 
        exito: false, 
        error: 'Usuario no encontrado',
        codigo: 'USUARIO_NO_ENCONTRADO'
      };
    }
    
    // Construir query dinámica
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    const camposPermitidos = [
      'nombre', 'apellido', 'email', 'foto_perfil', 'telefono'
    ];
    
    for (const campo of camposPermitidos) {
      if (datos[campo] !== undefined) {
        updates.push(`${campo} = $${paramIndex}`);
        values.push(datos[campo]);
        paramIndex++;
      }
    }
    
    if (updates.length === 0) {
      return { 
        exito: false, 
        error: 'No se proporcionaron datos para actualizar',
        codigo: 'SIN_CAMPOS'
      };
    }
    
    values.push(usuarioId);
    
    const query = `
      UPDATE usuarios 
      SET ${updates.join(', ')}, actualizado_en = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING 
        id,
        nombre,
        apellido,
        email,
        foto_perfil,
        telefono,
        rol,
        creado_en,
        actualizado_en
    `;
    
    const result = await client.query(query, values);
    
    const usuarioActualizado = result.rows[0];
    
    console.log('✅ Usuario actualizado exitosamente:', usuarioActualizado.email);
    
    return {
      exito: true,
      usuario: usuarioActualizado,
      mensaje: 'Información actualizada correctamente'
    };
    
  } catch (error) {
    console.error('❌ Error en actualizarUsuario:', error.message);
    
    if (error.code === '23505') {
      return { 
        exito: false, 
        error: 'El email ya está registrado',
        codigo: 'EMAIL_DUPLICADO'
      };
    }
    
    return { 
      exito: false, 
      error: 'Error del servidor al actualizar usuario',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 3. Cambiar contraseña
 */
export const cambiarContrasena = async (usuarioId, datos) => {
  let client;
  
  try {
    console.log('🔐 [PREFERENCIAS] Cambiando contraseña para usuario ID:', usuarioId);
    
    const { contrasena_actual, nueva_contrasena } = datos;
    
    // Validar datos requeridos
    if (!contrasena_actual || !nueva_contrasena) {
      return { 
        exito: false, 
        error: 'Las contraseñas actual y nueva son requeridas',
        codigo: 'DATOS_INCOMPLETOS'
      };
    }
    
    // Validar longitud de nueva contraseña
    if (nueva_contrasena.length < 6) {
      return { 
        exito: false, 
        error: 'La nueva contraseña debe tener al menos 6 caracteres',
        codigo: 'CONTRASENA_CORTA'
      };
    }
    
    client = await pool.connect();
    
    // Obtener contraseña actual del usuario
    const passwordQuery = `
      SELECT contrasena FROM usuarios WHERE id = $1
    `;
    
    const passwordResult = await client.query(passwordQuery, [usuarioId]);
    
    if (passwordResult.rows.length === 0) {
      return { 
        exito: false, 
        error: 'Usuario no encontrado',
        codigo: 'USUARIO_NO_ENCONTRADO'
      };
    }
    
    // Verificar contraseña actual
    const contrasenaValida = await bcrypt.compare(
      contrasena_actual, 
      passwordResult.rows[0].contrasena
    );
    
    if (!contrasenaValida) {
      return { 
        exito: false, 
        error: 'La contraseña actual es incorrecta',
        codigo: 'CONTRASENA_ACTUAL_INCORRECTA'
      };
    }
    
    // Encriptar nueva contraseña
    const salt = await bcrypt.genSalt(10);
    const nuevaContrasenaHash = await bcrypt.hash(nueva_contrasena, salt);
    
    // Actualizar contraseña
    const updateQuery = `
      UPDATE usuarios 
      SET contrasena = $1, actualizado_en = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, email, actualizado_en
    `;
    
    const updateResult = await client.query(updateQuery, [nuevaContrasenaHash, usuarioId]);
    
    console.log('✅ Contraseña cambiada exitosamente');
    
    return {
      exito: true,
      mensaje: 'Contraseña cambiada correctamente',
      usuario: updateResult.rows[0]
    };
    
  } catch (error) {
    console.error('❌ Error en cambiarContrasena:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al cambiar contraseña',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

// ==================== FUNCIONES DE TELÉFONOS ====================

/**
 * 4. Obtener teléfonos del usuario
 */
export const obtenerTelefonosUsuario = async (usuarioId) => {
  let client;
  
  try {
    console.log('📱 [PREFERENCIAS] Obteniendo teléfonos para usuario ID:', usuarioId);
    
    client = await pool.connect();
    
    const query = `
      SELECT 
        id,
        numero,
        tipo,
        principal,
        creado_en,
        actualizado_en
      FROM telefonos_usuario
      WHERE usuario_id = $1
        AND activo = true
      ORDER BY principal DESC, creado_en
    `;
    
    const result = await client.query(query, [usuarioId]);
    
    console.log(`✅ Encontrados ${result.rows.length} teléfonos`);
    
    return {
      exito: true,
      telefonos: result.rows,
      total: result.rows.length
    };
    
  } catch (error) {
    console.error('❌ Error en obtenerTelefonosUsuario:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al obtener teléfonos',
      codigo: 'ERROR_SERVIDOR',
      telefonos: []
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 5. Agregar teléfono
 */
export const agregarTelefono = async (usuarioId, telefono) => {
  let client;
  
  try {
    console.log('➕ [PREFERENCIAS] Agregando teléfono para usuario ID:', usuarioId);
    
    // Validar datos requeridos
    if (!telefono.numero) {
      return { 
        exito: false, 
        error: 'El número de teléfono es requerido',
        codigo: 'DATOS_INCOMPLETOS'
      };
    }
    
    // Validar formato de teléfono (opcional)
    const telefonoRegex = /^[0-9\s\-\+\(\)]{8,15}$/;
    if (!telefonoRegex.test(telefono.numero.replace(/\s/g, ''))) {
      return { 
        exito: false, 
        error: 'Formato de teléfono inválido',
        codigo: 'TELEFONO_INVALIDO'
      };
    }
    
    client = await pool.connect();
    
    // Si se marca como principal, desmarcar otros principales
    if (telefono.principal) {
      const updatePrincipalesQuery = `
        UPDATE telefonos_usuario 
        SET principal = false, actualizado_en = CURRENT_TIMESTAMP
        WHERE usuario_id = $1 AND principal = true
      `;
      
      await client.query(updatePrincipalesQuery, [usuarioId]);
    }
    
    // Verificar si ya existe este número
    const existeQuery = `
      SELECT 1 FROM telefonos_usuario 
      WHERE usuario_id = $1 
        AND numero = $2
        AND activo = true
    `;
    
    const existeResult = await client.query(existeQuery, [usuarioId, telefono.numero]);
    
    if (existeResult.rows.length > 0) {
      return { 
        exito: false, 
        error: 'Este número de teléfono ya está registrado',
        codigo: 'TELEFONO_DUPLICADO'
      };
    }
    
    // Insertar nuevo teléfono
    const insertQuery = `
      INSERT INTO telefonos_usuario (
        usuario_id,
        numero,
        tipo,
        principal
      ) VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const result = await client.query(insertQuery, [
      usuarioId,
      telefono.numero,
      telefono.tipo || 'personal',
      telefono.principal || false
    ]);
    
    const nuevoTelefono = result.rows[0];
    
    console.log('✅ Teléfono agregado exitosamente:', nuevoTelefono.numero);
    
    return {
      exito: true,
      telefono: nuevoTelefono,
      mensaje: 'Teléfono agregado correctamente'
    };
    
  } catch (error) {
    console.error('❌ Error en agregarTelefono:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al agregar teléfono',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 6. Eliminar teléfono
 */
export const eliminarTelefono = async (telefonoId, usuarioId) => {
  let client;
  
  try {
    console.log('🗑️ [PREFERENCIAS] Eliminando teléfono ID:', telefonoId);
    
    client = await pool.connect();
    
    // Verificar que el teléfono existe y pertenece al usuario
    const verifyQuery = `
      SELECT id, principal FROM telefonos_usuario 
      WHERE id = $1 AND usuario_id = $2
    `;
    
    const verifyResult = await client.query(verifyQuery, [telefonoId, usuarioId]);
    
    if (verifyResult.rows.length === 0) {
      return { 
        exito: false, 
        error: 'Teléfono no encontrado',
        codigo: 'TELEFONO_NO_ENCONTRADO'
      };
    }
    
    const telefono = verifyResult.rows[0];
    
    // No permitir eliminar el único teléfono principal
    if (telefono.principal) {
      const countQuery = `
        SELECT COUNT(*) as total_telefonos 
        FROM telefonos_usuario 
        WHERE usuario_id = $1 AND activo = true
      `;
      
      const countResult = await client.query(countQuery, [usuarioId]);
      const totalTelefonos = parseInt(countResult.rows[0].total_telefonos);
      
      if (totalTelefonos === 1) {
        return { 
          exito: false, 
          error: 'No puedes eliminar tu único teléfono',
          codigo: 'UNICO_TELEFONO'
        };
      }
    }
    
    // Borrado lógico
    const deleteQuery = `
      UPDATE telefonos_usuario 
      SET activo = false, actualizado_en = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id
    `;
    
    const result = await client.query(deleteQuery, [telefonoId]);
    
    console.log('✅ Teléfono eliminado exitosamente');
    
    return {
      exito: true,
      mensaje: 'Teléfono eliminado correctamente',
      id: result.rows[0].id
    };
    
  } catch (error) {
    console.error('❌ Error en eliminarTelefono:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al eliminar teléfono',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 7. Marcar teléfono como principal
 */
export const marcarTelefonoPrincipal = async (telefonoId, usuarioId) => {
  let client;
  
  try {
    console.log('⭐ [PREFERENCIAS] Marcando teléfono como principal ID:', telefonoId);
    
    client = await pool.connect();
    
    // Verificar que el teléfono existe y pertenece al usuario
    const verifyQuery = `
      SELECT id FROM telefonos_usuario 
      WHERE id = $1 AND usuario_id = $2
    `;
    
    const verifyResult = await client.query(verifyQuery, [telefonoId, usuarioId]);
    
    if (verifyResult.rows.length === 0) {
      return { 
        exito: false, 
        error: 'Teléfono no encontrado',
        codigo: 'TELEFONO_NO_ENCONTRADO'
      };
    }
    
    // Desmarcar todos los teléfonos como principales
    const updateAllQuery = `
      UPDATE telefonos_usuario 
      SET principal = false, actualizado_en = CURRENT_TIMESTAMP
      WHERE usuario_id = $1
    `;
    
    await client.query(updateAllQuery, [usuarioId]);
    
    // Marcar el teléfono específico como principal
    const updateQuery = `
      UPDATE telefonos_usuario 
      SET principal = true, actualizado_en = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await client.query(updateQuery, [telefonoId]);
    
    const telefonoActualizado = result.rows[0];
    
    console.log('✅ Teléfono marcado como principal:', telefonoActualizado.numero);
    
    return {
      exito: true,
      telefono: telefonoActualizado,
      mensaje: 'Teléfono marcado como principal'
    };
    
  } catch (error) {
    console.error('❌ Error en marcarTelefonoPrincipal:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al marcar teléfono como principal',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

// ==================== FUNCIONES DE PREFERENCIAS ====================

/**
 * 8. Obtener preferencias del usuario
 */
export const obtenerPreferenciasUsuario = async (usuarioId) => {
  let client;
  
  try {
    console.log('⚙️ [PREFERENCIAS] Obteniendo preferencias para usuario ID:', usuarioId);
    
    client = await pool.connect();
    
    // Obtener preferencias existentes
    const query = `
      SELECT 
        notificaciones,
        sonido_notificaciones,
        vibracion,
        modo_oscuro,
        tamano_letra,
        idioma,
        perfil_publico,
        mostrar_telefono,
        mostrar_email,
        autenticacion_dos_pasos,
        mostrar_sesiones_activas,
        creado_en,
        actualizado_en
      FROM preferencias_usuario
      WHERE usuario_id = $1
    `;
    
    const result = await client.query(query, [usuarioId]);
    
    if (result.rows.length === 0) {
      // Crear preferencias por defecto
      const preferenciasPorDefecto = {
        notificaciones: true,
        sonido_notificaciones: true,
        vibracion: true,
        modo_oscuro: false,
        tamano_letra: 'normal',
        idioma: 'es',
        perfil_publico: false,
        mostrar_telefono: true,
        mostrar_email: true,
        autenticacion_dos_pasos: false,
        mostrar_sesiones_activas: true
      };
      
      return {
        exito: true,
        preferencias: preferenciasPorDefecto,
        mensaje: 'Preferencias por defecto creadas'
      };
    }
    
    const preferencias = result.rows[0];
    
    // Formatear preferencias para el frontend
    const preferenciasFormateadas = {
      notificaciones: preferencias.notificaciones,
      sonidoNotificaciones: preferencias.sonido_notificaciones,
      vibracion: preferencias.vibracion,
      modoOscuro: preferencias.modo_oscuro,
      tamanoLetra: preferencias.tamano_letra,
      idioma: preferencias.idioma,
      privacidad: {
        perfilPublico: preferencias.perfil_publico,
        mostrarTelefono: preferencias.mostrar_telefono,
        mostrarEmail: preferencias.mostrar_email
      },
      seguridad: {
        autenticacionDosPasos: preferencias.autenticacion_dos_pasos,
        sesionesActivas: preferencias.mostrar_sesiones_activas
      }
    };
    
    console.log('✅ Preferencias obtenidas');
    
    return {
      exito: true,
      preferencias: preferenciasFormateadas
    };
    
  } catch (error) {
    console.error('❌ Error en obtenerPreferenciasUsuario:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al obtener preferencias',
      codigo: 'ERROR_SERVIDOR',
      preferencias: {}
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 9. Actualizar preferencias
 */
export const actualizarPreferencias = async (usuarioId, preferencias) => {
  let client;
  
  try {
    console.log('🔄 [PREFERENCIAS] Actualizando preferencias para usuario ID:', usuarioId);
    
    client = await pool.connect();
    
    // Verificar si ya existen preferencias
    const checkQuery = `
      SELECT 1 FROM preferencias_usuario WHERE usuario_id = $1
    `;
    
    const checkResult = await client.query(checkQuery, [usuarioId]);
    
    let result;
    
    // Formatear preferencias para la base de datos
    const preferenciasDB = {
      notificaciones: preferencias.notificaciones,
      sonido_notificaciones: preferencias.sonidoNotificaciones,
      vibracion: preferencias.vibracion,
      modo_oscuro: preferencias.modoOscuro,
      tamano_letra: preferencias.tamanoLetra,
      idioma: preferencias.idioma,
      perfil_publico: preferencias.privacidad?.perfilPublico || false,
      mostrar_telefono: preferencias.privacidad?.mostrarTelefono || true,
      mostrar_email: preferencias.privacidad?.mostrarEmail || true,
      autenticacion_dos_pasos: preferencias.seguridad?.autenticacionDosPasos || false,
      mostrar_sesiones_activas: preferencias.seguridad?.sesionesActivas || true
    };
    
    if (checkResult.rows.length > 0) {
      // Actualizar preferencias existentes
      const updateQuery = `
        UPDATE preferencias_usuario 
        SET 
          notificaciones = $1,
          sonido_notificaciones = $2,
          vibracion = $3,
          modo_oscuro = $4,
          tamano_letra = $5,
          idioma = $6,
          perfil_publico = $7,
          mostrar_telefono = $8,
          mostrar_email = $9,
          autenticacion_dos_pasos = $10,
          mostrar_sesiones_activas = $11,
          actualizado_en = CURRENT_TIMESTAMP
        WHERE usuario_id = $12
        RETURNING *
      `;
      
      result = await client.query(updateQuery, [
        preferenciasDB.notificaciones,
        preferenciasDB.sonido_notificaciones,
        preferenciasDB.vibracion,
        preferenciasDB.modo_oscuro,
        preferenciasDB.tamano_letra,
        preferenciasDB.idioma,
        preferenciasDB.perfil_publico,
        preferenciasDB.mostrar_telefono,
        preferenciasDB.mostrar_email,
        preferenciasDB.autenticacion_dos_pasos,
        preferenciasDB.mostrar_sesiones_activas,
        usuarioId
      ]);
    } else {
      // Insertar nuevas preferencias
      const insertQuery = `
        INSERT INTO preferencias_usuario (
          usuario_id,
          notificaciones,
          sonido_notificaciones,
          vibracion,
          modo_oscuro,
          tamano_letra,
          idioma,
          perfil_publico,
          mostrar_telefono,
          mostrar_email,
          autenticacion_dos_pasos,
          mostrar_sesiones_activas
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;
      
      result = await client.query(insertQuery, [
        usuarioId,
        preferenciasDB.notificaciones,
        preferenciasDB.sonido_notificaciones,
        preferenciasDB.vibracion,
        preferenciasDB.modo_oscuro,
        preferenciasDB.tamano_letra,
        preferenciasDB.idioma,
        preferenciasDB.perfil_publico,
        preferenciasDB.mostrar_telefono,
        preferenciasDB.mostrar_email,
        preferenciasDB.autenticacion_dos_pasos,
        preferenciasDB.mostrar_sesiones_activas
      ]);
    }
    
    console.log('✅ Preferencias actualizadas exitosamente');
    
    return {
      exito: true,
      mensaje: 'Preferencias actualizadas correctamente'
    };
    
  } catch (error) {
    console.error('❌ Error en actualizarPreferencias:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al actualizar preferencias',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

// ==================== FUNCIONES DE ADMINISTRACIÓN ====================

/**
 * 10. Verificar otros administradores
 */
export const verificarOtrosAdministradores = async (usuarioId) => {
  let client;
  
  try {
    console.log('👑 [PREFERENCIAS] Verificando otros administradores para usuario ID:', usuarioId);
    
    client = await pool.connect();
    
    // Verificar si hay otros administradores en el mismo grupo familiar
    const query = `
      SELECT COUNT(DISTINCT f2.usuario_id) as total_otros_admins
      FROM familiares f1
      INNER JOIN familiares f2 ON f1.adulto_mayor_id = f2.adulto_mayor_id
      INNER JOIN usuarios u ON f2.usuario_id = u.id
      WHERE f1.usuario_id = $1
        AND f2.usuario_id != $1
        AND u.rol = 'familiar_administrador'
        AND u.activo = true
    `;
    
    const result = await client.query(query, [usuarioId]);
    
    const totalOtrosAdmins = parseInt(result.rows[0].total_otros_admins);
    const hayOtroAdmin = totalOtrosAdmins > 0;
    
    console.log(`✅ Otros administradores encontrados: ${totalOtrosAdmins}`);
    
    return {
      exito: true,
      hayOtroAdmin,
      totalOtrosAdmins,
      mensaje: hayOtroAdmin 
        ? 'Hay otros administradores en el grupo familiar' 
        : 'Eres el único administrador'
    };
    
  } catch (error) {
    console.error('❌ Error en verificarOtrosAdministradores:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al verificar administradores',
      codigo: 'ERROR_SERVIDOR',
      hayOtroAdmin: false
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 11. Renunciar a rol de administrador
 */
export const renunciarAdministrador = async (usuarioId) => {
  let client;
  
  try {
    console.log('👋 [PREFERENCIAS] Renunciando a rol de administrador para usuario ID:', usuarioId);
    
    // Verificar si hay otros administradores
    const verificacion = await verificarOtrosAdministradores(usuarioId);
    
    if (!verificacion.exito) {
      return verificacion;
    }
    
    if (!verificacion.hayOtroAdmin) {
      return { 
        exito: false, 
        error: 'No puedes renunciar al rol de administrador porque eres el único administrador del grupo familiar',
        codigo: 'UNICO_ADMINISTRADOR'
      };
    }
    
    client = await pool.connect();
    
    // Actualizar rol a 'familiar' normal
    const updateQuery = `
      UPDATE usuarios 
      SET rol = 'familiar', actualizado_en = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, email, rol
    `;
    
    const result = await client.query(updateQuery, [usuarioId]);
    
    console.log('✅ Rol de administrador renunciado exitosamente');
    
    return {
      exito: true,
      usuario: result.rows[0],
      mensaje: 'Has renunciado al rol de administrador'
    };
    
  } catch (error) {
    console.error('❌ Error en renunciarAdministrador:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al renunciar a administrador',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 12. Obtener sesiones activas
 */
export const obtenerSesionesActivas = async (usuarioId) => {
  let client;
  
  try {
    console.log('💻 [PREFERENCIAS] Obteniendo sesiones activas para usuario ID:', usuarioId);
    
    client = await pool.connect();
    
    const query = `
      SELECT 
        id,
        dispositivo,
        sistema_operativo,
        navegador,
        ip_address,
        creado_en,
        ultima_actividad,
        activa
      FROM sesiones_usuario
      WHERE usuario_id = $1
        AND activa = true
      ORDER BY ultima_actividad DESC
    `;
    
    const result = await client.query(query, [usuarioId]);
    
    console.log(`✅ Encontradas ${result.rows.length} sesiones activas`);
    
    return {
      exito: true,
      sesiones: result.rows,
      total: result.rows.length
    };
    
  } catch (error) {
    console.error('❌ Error en obtenerSesionesActivas:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al obtener sesiones activas',
      codigo: 'ERROR_SERVIDOR',
      sesiones: []
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 13. Cerrar otras sesiones
 */
export const cerrarOtrasSesiones = async (usuarioId, sesionActualId = null) => {
  let client;
  
  try {
    console.log('🚪 [PREFERENCIAS] Cerrando otras sesiones para usuario ID:', usuarioId);
    
    client = await pool.connect();
    
    let query;
    let values;
    
    if (sesionActualId) {
      // Cerrar todas las sesiones excepto la actual
      query = `
        UPDATE sesiones_usuario 
        SET activa = false, ultima_actividad = CURRENT_TIMESTAMP
        WHERE usuario_id = $1 
          AND id != $2
          AND activa = true
        RETURNING COUNT(*) as sesiones_cerradas
      `;
      
      values = [usuarioId, sesionActualId];
    } else {
      // Cerrar todas las sesiones
      query = `
        UPDATE sesiones_usuario 
        SET activa = false, ultima_actividad = CURRENT_TIMESTAMP
        WHERE usuario_id = $1 
          AND activa = true
        RETURNING COUNT(*) as sesiones_cerradas
      `;
      
      values = [usuarioId];
    }
    
    const result = await client.query(query, values);
    
    const sesionesCerradas = parseInt(result.rows[0].sesiones_cerradas);
    
    console.log(`✅ ${sesionesCerradas} sesiones cerradas`);
    
    return {
      exito: true,
      sesionesCerradas,
      mensaje: `Se cerraron ${sesionesCerradas} sesiones`
    };
    
  } catch (error) {
    console.error('❌ Error en cerrarOtrasSesiones:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al cerrar sesiones',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

// ==================== FUNCIONES DE SEGURIDAD ====================

/**
 * 14. Solicitar eliminación de cuenta
 */
export const solicitarEliminacionCuenta = async (usuarioId, razon = '') => {
  let client;
  
  try {
    console.log('🗑️ [PREFERENCIAS] Solicitando eliminación de cuenta para usuario ID:', usuarioId);
    
    client = await pool.connect();
    
    // Obtener información del usuario
    const usuarioQuery = `
      SELECT email, nombre, apellido, rol FROM usuarios WHERE id = $1
    `;
    
    const usuarioResult = await client.query(usuarioQuery, [usuarioId]);
    
    if (usuarioResult.rows.length === 0) {
      return { 
        exito: false, 
        error: 'Usuario no encontrado',
        codigo: 'USUARIO_NO_ENCONTRADO'
      };
    }
    
    const usuario = usuarioResult.rows[0];
    
    // Si es administrador, verificar si hay otros administradores
    if (usuario.rol === 'familiar_administrador') {
      const verificacion = await verificarOtrosAdministradores(usuarioId);
      
      if (verificacion.exito && !verificacion.hayOtroAdmin) {
        return { 
          exito: false, 
          error: 'No puedes eliminar tu cuenta porque eres el único administrador. Debes designar otro administrador primero.',
          codigo: 'UNICO_ADMINISTRADOR_ELIMINAR'
        };
      }
    }
    
    // Registrar solicitud de eliminación
    const solicitudQuery = `
      INSERT INTO solicitudes_eliminacion_cuenta (
        usuario_id,
        razon,
        fecha_solicitud,
        estado
      ) VALUES ($1, $2, CURRENT_TIMESTAMP, 'pendiente')
      RETURNING *
    `;
    
    const solicitudResult = await client.query(solicitudQuery, [
      usuarioId,
      razon || 'Solicitud de eliminación de cuenta'
    ]);
    
    console.log('✅ Solicitud de eliminación registrada');
    
    return {
      exito: true,
      solicitud: solicitudResult.rows[0],
      mensaje: 'Tu solicitud de eliminación ha sido enviada. El administrador la revisará pronto.'
    };
    
  } catch (error) {
    console.error('❌ Error en solicitarEliminacionCuenta:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al solicitar eliminación de cuenta',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 15. Actualizar foto de perfil
 */
export const actualizarFotoPerfil = async (usuarioId, fotoData) => {
  let client;
  
  try {
    console.log('🖼️ [PREFERENCIAS] Actualizando foto de perfil para usuario ID:', usuarioId);
    
    const { foto_base64, tipo } = fotoData;
    
    if (!foto_base64) {
      return { 
        exito: false, 
        error: 'No se proporcionó la foto',
        codigo: 'DATOS_INCOMPLETOS'
      };
    }
    
    client = await pool.connect();
    
    // Verificar tamaño de la imagen (máximo 2MB)
    const sizeInBytes = Buffer.byteLength(foto_base64, 'base64');
    const sizeInMB = sizeInBytes / (1024 * 1024);
    
    if (sizeInMB > 2) {
      return { 
        exito: false, 
        error: 'La imagen es demasiado grande. Máximo 2MB.',
        codigo: 'IMAGEN_DEMASIADO_GRANDE'
      };
    }
    
    // Actualizar foto de perfil
    const updateQuery = `
      UPDATE usuarios 
      SET foto_perfil = $1, actualizado_en = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, foto_perfil, actualizado_en
    `;
    
    const result = await client.query(updateQuery, [
      `data:${tipo || 'image/jpeg'};base64,${foto_base64}`,
      usuarioId
    ]);
    
    console.log('✅ Foto de perfil actualizada exitosamente');
    
    return {
      exito: true,
      usuario: result.rows[0],
      mensaje: 'Foto de perfil actualizada correctamente'
    };
    
  } catch (error) {
    console.error('❌ Error en actualizarFotoPerfil:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al actualizar foto de perfil',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 16. Obtener actividad reciente
 */
export const obtenerActividadReciente = async (usuarioId, limite = 10) => {
  let client;
  
  try {
    console.log('📊 [PREFERENCIAS] Obteniendo actividad reciente para usuario ID:', usuarioId);
    
    client = await pool.connect();
    
    const query = `
      SELECT 
        id,
        accion,
        entidad,
        entidad_id,
        detalles,
        ip_address,
        creado_en
      FROM logs_actividad
      WHERE usuario_id = $1
      ORDER BY creado_en DESC
      LIMIT $2
    `;
    
    const result = await client.query(query, [usuarioId, limite]);
    
    console.log(`✅ Encontradas ${result.rows.length} actividades recientes`);
    
    return {
      exito: true,
      actividades: result.rows,
      total: result.rows.length
    };
    
  } catch (error) {
    console.error('❌ Error en obtenerActividadReciente:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al obtener actividad reciente',
      codigo: 'ERROR_SERVIDOR',
      actividades: []
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

// ==================== EXPORTACIÓN ====================

export default {
  // Información del usuario
  obtenerInformacionUsuario,
  actualizarUsuario,
  cambiarContrasena,
  
  // Gestión de teléfonos
  obtenerTelefonosUsuario,
  agregarTelefono,
  eliminarTelefono,
  marcarTelefonoPrincipal,
  
  // Preferencias
  obtenerPreferenciasUsuario,
  actualizarPreferencias,
  
  // Administración
  verificarOtrosAdministradores,
  renunciarAdministrador,
  
  // Seguridad y sesiones
  obtenerSesionesActivas,
  cerrarOtrasSesiones,
  solicitarEliminacionCuenta,
  
  // Perfil y actividad
  actualizarFotoPerfil,
  obtenerActividadReciente
};