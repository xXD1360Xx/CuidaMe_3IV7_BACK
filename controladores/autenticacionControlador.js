// controladores/authControlador.js - Controlador de Autenticación Unificado
import { pool } from '../configuracion/basedeDatos.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { enviarCodigoVerificacion } from '../servicios/emailService.js';

// Configuración
const JWT_SECRETO = process.env.JWT_SECRETO || 'cuidame_secret_key_2024_produccion';
const JWT_EXPIRES_IN = '7d';

// ==================== FUNCIONES DE AUTENTICACIÓN ====================

/**
 * 1. Iniciar sesión con email/username y contraseña (sin código familiar)
 */
export const iniciarSesion = async (identificador, contrasena) => {
  let client;

  try {
    console.log('🔐 [AUTH] Login normal para:', identificador);

    // Validaciones básicas
    if (!identificador || !contrasena) {
      return {
        exito: false,
        error: 'Correo electrónico y contraseña son requeridos',
        codigo: 'CREDENCIALES_INCOMPLETAS'
      };
    }

    client = await pool.connect();

    // Buscar usuario por email o username
    const query = `
      SELECT 
        u.id, 
        u.nombre, 
        u.email, 
        u.username, 
        u.password,
        u.rol,
        u.telefono,
        u.necesita_completar_perfil,
        u.estado,
        u.creado_en,
        u.actualizado_en,
        ug.grupo_familiar_id,
        ug.rol_en_grupo,
        gf.codigo_familiar,
        gf.nombre_grupo
      FROM usuarios u
      LEFT JOIN usuario_grupo ug ON u.id = ug.usuario_id AND ug.estado = 'activo'
      LEFT JOIN grupos_familiares gf ON ug.grupo_familiar_id = gf.id AND gf.activo = true
      WHERE (LOWER(u.email) = LOWER($1) OR LOWER(u.username) = LOWER($1))
        AND u.estado = 'activo'
    `;

    const result = await client.query(query, [identificador.trim()]);

    if (result.rows.length === 0) {
      return {
        exito: false,
        error: 'Usuario no encontrado o cuenta inactiva',
        codigo: 'USUARIO_NO_ENCONTRADO'
      };
    }

    const usuario = result.rows[0];

    // Verificar contraseña
    if (!usuario.password) {
      return {
        exito: false,
        error: 'Error en datos del usuario',
        codigo: 'DATOS_USUARIO_INVALIDOS'
      };
    }

    const hash = usuario.password.trim();
    let contrasenaValida = false;

    // Detectar tipo de hash
    const esHashBcrypt = hash.startsWith('$2');
    const esHashSHA256 = hash.length === 64 && /^[a-f0-9]{64}$/i.test(hash);

    // Verificar según tipo de hash
    if (esHashBcrypt) {
      contrasenaValida = await bcrypt.compare(contrasena, hash);

      // Migrar a SHA256 si es necesario
      if (contrasenaValida) {
        const sha256Hash = crypto
          .createHash('sha256')
          .update(contrasena)
          .digest('hex')
          .toLowerCase();

        await client.query(
          'UPDATE usuarios SET password = $1 WHERE id = $2',
          [sha256Hash, usuario.id]
        );
      }
    }
    else if (esHashSHA256) {
      const hashCalculado = crypto
        .createHash('sha256')
        .update(contrasena)
        .digest('hex')
        .toLowerCase();

      contrasenaValida = hashCalculado === hash.toLowerCase();
    }
    else {
      return {
        exito: false,
        error: 'Error en datos de autenticación',
        codigo: 'HASH_DESCONOCIDO'
      };
    }

    if (!contrasenaValida) {
      return {
        exito: false,
        error: 'Contraseña incorrecta',
        codigo: 'CONTRASENA_INCORRECTA'
      };
    }

    // Preparar datos del usuario para respuesta
    const usuarioRespuesta = {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      username: usuario.username,
      rol: usuario.rol,
      telefono: usuario.telefono,
      necesita_completar_perfil: usuario.necesita_completar_perfil,
      estado: usuario.estado,
      grupo_familiar: usuario.grupo_familiar_id ? {
        id: usuario.grupo_familiar_id,
        codigo: usuario.codigo_familiar,
        nombre: usuario.nombre_grupo,
        rol_en_grupo: usuario.rol_en_grupo
      } : null,
      perfil_completo: true, // Porque tiene email y contraseña
      creado_en: usuario.creado_en,
      actualizado_en: usuario.actualizado_en
    };

    // Generar token JWT
    const token = jwt.sign(
      {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        rol: usuario.rol,
        grupo_familiar_id: usuario.grupo_familiar_id,
        necesita_completar_perfil: usuario.necesita_completar_perfil
      },
      JWT_SECRETO,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Actualizar último acceso
    await client.query(
      'UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = $1',
      [usuario.id]
    );

    console.log('✅ Login normal exitoso para:', usuario.email);

    return {
      exito: true,
      usuario: usuarioRespuesta,
      token: token,
      mensaje: 'Inicio de sesión exitoso'
    };

  } catch (error) {
    console.error('❌ Error en iniciarSesion:', error.message);

    return {
      exito: false,
      error: 'Error del servidor al iniciar sesión',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 2. Iniciar sesión con email + contraseña + código familiar
 */
export const iniciarSesionConCodigoFamiliar = async (email, contrasena, codigoFamiliar) => {
  let client;

  try {
    console.log('🔗 [AUTH] Login con código familiar para:', email);

    if (!email || !contrasena || !codigoFamiliar) {
      return {
        exito: false,
        error: 'Correo, contraseña y código familiar son requeridos',
        codigo: 'CREDENCIALES_INCOMPLETAS'
      };
    }

    // Limpiar código (quitar guiones)
    const codigoLimpio = codigoFamiliar.replace(/-/g, '').toUpperCase();

    if (codigoLimpio.length !== 6) {
      return {
        exito: false,
        error: 'El código familiar debe tener 6 caracteres',
        codigo: 'CODIGO_LONGITUD_INVALIDA'
      };
    }

    client = await pool.connect();

    // Primero autenticar usuario
    const usuarioResult = await iniciarSesion(email, contrasena);

    if (!usuarioResult.exito) {
      return usuarioResult;
    }

    const usuario = usuarioResult.usuario;

    // Verificar que el usuario no pertenezca ya a un grupo
    if (usuario.grupo_familiar) {
      return {
        exito: false,
        error: 'Ya perteneces a un grupo familiar',
        codigo: 'YA_EN_GRUPO'
      };
    }

    // Buscar grupo familiar activo por código
    const grupoQuery = `
      SELECT 
        gf.id,
        gf.codigo_familiar,
        gf.nombre_grupo,
        gf.fecha_expiracion,
        gf.activo,
        u_admin.nombre as admin_nombre,
        u_admin.email as admin_email,
        COUNT(ug.usuario_id) as total_miembros,
        gf.max_integrantes
      FROM grupos_familiares gf
      JOIN usuarios u_admin ON gf.usuario_admin_id = u_admin.id
      LEFT JOIN usuario_grupo ug ON gf.id = ug.grupo_familiar_id AND ug.estado = 'activo'
      WHERE gf.codigo_familiar = $1 
        AND gf.activo = true
        AND gf.fecha_expiracion > NOW()
      GROUP BY gf.id, u_admin.nombre, u_admin.email
    `;

    const grupoResult = await client.query(grupoQuery, [codigoLimpio]);

    if (grupoResult.rows.length === 0) {
      return {
        exito: false,
        error: 'Código familiar inválido, expirado o inactivo',
        codigo: 'CODIGO_FAMILIAR_INVALIDO'
      };
    }

    const grupo = grupoResult.rows[0];

    // Verificar límite de integrantes
    if (grupo.total_miembros >= grupo.max_integrantes) {
      return {
        exito: false,
        error: `El grupo familiar ha alcanzado el límite de ${grupo.max_integrantes} miembros`,
        codigo: 'GRUPO_LLENO'
      };
    }

    // Asociar usuario al grupo familiar
    await client.query(`
      INSERT INTO usuario_grupo (
        usuario_id,
        grupo_familiar_id,
        rol_en_grupo,
        estado,
        fecha_unio
      ) VALUES ($1, $2, 'familiar', 'activo', NOW())
    `, [usuario.id, grupo.id]);

    // Generar nuevo token con información actualizada del grupo
    const tokenActualizado = jwt.sign(
      {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        rol: usuario.rol,
        grupo_familiar_id: grupo.id,
        necesita_completar_perfil: usuario.necesita_completar_perfil
      },
      JWT_SECRETO,
      { expiresIn: JWT_EXPIRES_IN }
    );

    console.log('✅ Usuario asociado al grupo familiar:', grupo.codigo_familiar);

    return {
      exito: true,
      usuario: {
        ...usuario,
        grupo_familiar: {
          id: grupo.id,
          codigo: grupo.codigo_familiar,
          nombre: grupo.nombre_grupo,
          admin_nombre: grupo.admin_nombre,
          admin_email: grupo.admin_email,
          total_miembros: grupo.total_miembros + 1,
          max_integrantes: grupo.max_integrantes,
          rol_en_grupo: 'familiar'
        }
      },
      token: tokenActualizado,
      mensaje: 'Te has unido al grupo familiar exitosamente'
    };

  } catch (error) {
    console.error('❌ Error en iniciarSesionConCodigoFamiliar:', error.message);

    return {
      exito: false,
      error: 'Error al vincular con grupo familiar',
      codigo: 'ERROR_VINCULACION_GRUPO'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 3. Iniciar sesión SOLO con código personalizado (sin email/contraseña)
 */
export const iniciarSesionConCodigoPersonalizado = async (codigoPersonalizado) => {
  let client;

  try {
    console.log('✨ [AUTH] Login con código personalizado:', codigoPersonalizado);

    if (!codigoPersonalizado) {
      return {
        exito: false,
        error: 'El código personalizado es requerido',
        codigo: 'CODIGO_REQUERIDO'
      };
    }

    // Limpiar código (quitar guiones)
    const codigoLimpio = codigoPersonalizado.replace(/-/g, '').toUpperCase();

    if (codigoLimpio.length !== 6) {
      return {
        exito: false,
        error: 'El código debe tener 6 caracteres',
        codigo: 'CODIGO_LONGITUD_INVALIDA'
      };
    }

    client = await pool.connect();

    // Buscar código personalizado activo
    const codigoQuery = `
      SELECT 
        cp.*,
        gf.id as grupo_familiar_id,
        gf.codigo_familiar,
        gf.nombre_grupo,
        gf.usuario_admin_id,
        ua.nombre as admin_nombre,
        ua.email as admin_email,
        CASE 
          WHEN cp.fecha_expiracion IS NOT NULL AND cp.fecha_expiracion < NOW() THEN 'expirado'
          WHEN cp.max_usos IS NOT NULL AND cp.usos_actuales >= cp.max_usos THEN 'usado'
          WHEN cp.activo = false THEN 'inactivo'
          ELSE 'activo'
        END as estado_codigo
      FROM codigos_personalizados cp
      JOIN grupos_familiares gf ON cp.grupo_familiar_id = gf.id
      JOIN usuarios ua ON gf.usuario_admin_id = ua.id
      WHERE cp.codigo = $1
    `;

    const codigoResult = await client.query(codigoQuery, [codigoLimpio]);

    if (codigoResult.rows.length === 0) {
      return {
        exito: false,
        error: 'Código personalizado no encontrado',
        codigo: 'CODIGO_NO_ENCONTRADO'
      };
    }

    const codigoData = codigoResult.rows[0];

    // Verificar estado del código
    if (codigoData.estado_codigo !== 'activo') {
      return {
        exito: false,
        error: `El código está ${codigoData.estado_codigo}`,
        codigo: `CODIGO_${codigoData.estado_codido.toUpperCase()}`
      };
    }

    // Buscar si ya existe un usuario creado con este código
    const usuarioExistenteQuery = `
      SELECT u.*, ug.rol_en_grupo
      FROM usuarios u
      JOIN usuario_grupo ug ON u.id = ug.usuario_id
      WHERE ug.grupo_familiar_id = $1 
        AND u.email IS NULL 
        AND u.codigo_personalizado_id = $2
        AND u.estado = 'activo'
      LIMIT 1
    `;

    const usuarioExistenteResult = await client.query(usuarioExistenteQuery, [
      codigoData.grupo_familiar_id,
      codigoData.id
    ]);

    let usuario;
    let nuevoUsuario = false;

    if (usuarioExistenteResult.rows.length > 0) {
      // Usar usuario existente creado con este código
      usuario = usuarioExistenteResult.rows[0];
      console.log('🔄 Usando usuario existente del código personalizado');
    } else {
      // Crear nuevo usuario temporal
      const nombreUsuario = `${codigoData.nombre} ${codigoData.apellido}`.trim() ||
        `Familiar ${codigoData.codigo.substring(0, 3)}`;

      const passwordTemp = crypto
        .createHash('sha256')
        .update(codigoLimpio)
        .digest('hex')
        .toLowerCase();

      const insertUsuarioQuery = `
        INSERT INTO usuarios (
          nombre,
          email,
          password,
          rol,
          codigo_personalizado_id,
          necesita_completar_perfil,
          estado,
          creado_en
        ) VALUES ($1, NULL, $2, $3, $4, true, 'activo', NOW())
        RETURNING *
      `;

      const usuarioTempResult = await client.query(insertUsuarioQuery, [
        nombreUsuario,
        passwordTemp,
        codigoData.rol_asignado || 'familiar_secundario',
        codigoData.id
      ]);

      usuario = usuarioTempResult.rows[0];
      nuevoUsuario = true;

      // Asociar usuario al grupo familiar
      await client.query(`
        INSERT INTO usuario_grupo (
          usuario_id,
          grupo_familiar_id,
          rol_en_grupo,
          estado,
          fecha_unio,
          invitado_por,
          permisos
        ) VALUES ($1, $2, $3, 'activo', NOW(), $4, $5)
      `, [
        usuario.id,
        codigoData.grupo_familiar_id,
        codigoData.rol_asignado || 'familiar',
        codigoData.creado_por,
        codigoData.permisos || '{"ver_medicamentos": true, "ver_calendario": true}'
      ]);
    }

    // Incrementar contador de usos del código
    await client.query(`
      UPDATE codigos_personalizados 
      SET usos_actuales = usos_actuales + 1,
          actualizado_en = NOW()
      WHERE id = $1
    `, [codigoData.id]);

    // Si alcanzó el máximo de usos, desactivarlo
    if (codigoData.max_usos && codigoData.usos_actuales + 1 >= codigoData.max_usos) {
      await client.query(`
        UPDATE codigos_personalizados 
        SET activo = false,
            actualizado_en = NOW()
        WHERE id = $1
      `, [codigoData.id]);
    }

    // Preparar datos del usuario para respuesta
    const usuarioRespuesta = {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      necesita_completar_perfil: usuario.necesita_completar_perfil,
      estado: usuario.estado,
      grupo_familiar: {
        id: codigoData.grupo_familiar_id,
        codigo: codigoData.codigo_familiar,
        nombre: codigoData.nombre_grupo,
        admin_nombre: codigoData.admin_nombre,
        admin_email: codigoData.admin_email
      },
      codigo_personalizado: {
        id: codigoData.id,
        codigo: codigoData.codigo,
        nombre: codigoData.nombre,
        apellido: codigoData.apellido,
        rol_asignado: codigoData.rol_asignado,
        parentesco: codigoData.parentesco
      },
      perfil_completo: !usuario.necesita_completar_perfil,
      creado_en: usuario.creado_en
    };

    // Generar token (más corto para completar perfil)
    const token = jwt.sign(
      {
        id: usuario.id,
        rol: usuario.rol,
        necesita_completar_perfil: usuario.necesita_completar_perfil,
        grupo_familiar_id: codigoData.grupo_familiar_id,
        codigo_personalizado_id: codigoData.id
      },
      JWT_SECRETO,
      { expiresIn: '24h' } // Token más corto para usuarios temporales
    );

    // Actualizar último acceso
    await client.query(
      'UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = $1',
      [usuario.id]
    );

    console.log(`✅ Login con código personalizado exitoso: ${nuevoUsuario ? 'Nuevo' : 'Existente'} usuario`);

    return {
      exito: true,
      usuario: usuarioRespuesta,
      token: token,
      nuevo_usuario: nuevoUsuario,
      mensaje: nuevoUsuario
        ? 'Cuenta temporal creada. Por favor completa tu perfil.'
        : 'Inicio de sesión exitoso con código personalizado'
    };

  } catch (error) {
    console.error('❌ Error en iniciarSesionConCodigoPersonalizado:', error.message);

    return {
      exito: false,
      error: 'Error al iniciar sesión con código personalizado',
      codigo: 'ERROR_CODIGO_PERSONALIZADO'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 4. Completar perfil para usuario que ingresó con código personalizado
 */
export const completarPerfilConCodigo = async (usuarioId, datosPerfil) => {
  let client;

  try {
    console.log('📝 [AUTH] Completando perfil para usuario ID:', usuarioId);

    const {
      nombre,
      email,
      telefono,
      password,
      fecha_nacimiento,
      genero,
      parentesco
    } = datosPerfil;

    client = await pool.connect();

    // Verificar que el usuario existe y necesita completar perfil
    const usuarioQuery = `
      SELECT id, necesita_completar_perfil, codigo_personalizado_id
      FROM usuarios 
      WHERE id = $1 
        AND necesita_completar_perfil = true
        AND estado = 'activo'
    `;

    const usuarioResult = await client.query(usuarioQuery, [usuarioId]);

    if (usuarioResult.rows.length === 0) {
      return {
        exito: false,
        error: 'Usuario no encontrado o no necesita completar perfil',
        codigo: 'USUARIO_NO_VALIDO'
      };
    }

    const usuarioActual = usuarioResult.rows[0];

    // Si tiene código personalizado, obtener sus datos
    let datosCodigo = null;
    if (usuarioActual.codigo_personalizado_id) {
      const codigoQuery = `
        SELECT nombre, apellido, parentesco, rol_asignado
        FROM codigos_personalizados
        WHERE id = $1
      `;

      const codigoResult = await client.query(codigoQuery, [usuarioActual.codigo_personalizado_id]);
      if (codigoResult.rows.length > 0) {
        datosCodigo = codigoResult.rows[0];
      }
    }

    // Verificar email si se proporciona
    if (email) {
      const emailQuery = `
        SELECT id FROM usuarios 
        WHERE LOWER(email) = LOWER($1) AND id != $2
      `;
      const emailResult = await client.query(emailQuery, [email, usuarioId]);

      if (emailResult.rows.length > 0) {
        return {
          exito: false,
          error: 'El correo electrónico ya está registrado',
          codigo: 'EMAIL_EXISTENTE'
        };
      }
    }

    // Preparar valores para actualización
    const valores = [];
    const partesQuery = [];
    let contador = 1;

    // Usar nombre del código personalizado si no se proporciona uno nuevo
    const nombreFinal = nombre || (datosCodigo ? `${datosCodigo.nombre} ${datosCodigo.apellido}`.trim() : null);

    if (nombreFinal) {
      partesQuery.push(`nombre = $${contador}`);
      valores.push(nombreFinal);
      contador++;
    }

    if (email) {
      partesQuery.push(`email = $${contador}`);
      valores.push(email.toLowerCase());
      contador++;
    }

    if (telefono !== undefined) {
      partesQuery.push(`telefono = $${contador}`);
      valores.push(telefono);
      contador++;
    }

    if (password && password.length >= 6) {
      const passwordHash = crypto
        .createHash('sha256')
        .update(password)
        .digest('hex')
        .toLowerCase();

      partesQuery.push(`password = $${contador}`);
      valores.push(passwordHash);
      contador++;
    }

    if (fecha_nacimiento) {
      partesQuery.push(`fecha_nacimiento = $${contador}`);
      valores.push(fecha_nacimiento);
      contador++;
    }

    if (genero) {
      partesQuery.push(`genero = $${contador}`);
      valores.push(genero);
      contador++;
    }

    // Usar parentesco del código personalizado si no se proporciona uno nuevo
    const parentescoFinal = parentesco || (datosCodigo ? datosCodigo.parentesco : null);
    if (parentescoFinal) {
      partesQuery.push(`parentesco = $${contador}`);
      valores.push(parentescoFinal);
      contador++;
    }

    // Marcar como perfil completado
    partesQuery.push(`necesita_completar_perfil = false`);
    partesQuery.push(`actualizado_en = NOW()`);

    // Agregar ID del usuario
    valores.push(usuarioId);

    const query = `
      UPDATE usuarios 
      SET ${partesQuery.join(', ')}
      WHERE id = $${contador}
      RETURNING 
        id,
        nombre,
        email,
        telefono,
        rol,
        necesita_completar_perfil,
        fecha_nacimiento,
        genero,
        parentesco,
        estado,
        creado_en,
        actualizado_en
    `;

    const result = await client.query(query, valores);

    if (result.rows.length === 0) {
      return {
        exito: false,
        error: 'Error al actualizar perfil',
        codigo: 'ERROR_ACTUALIZACION'
      };
    }

    const usuarioActualizado = result.rows[0];

    // Generar nuevo token con perfil completo
    const token = jwt.sign(
      {
        id: usuarioActualizado.id,
        email: usuarioActualizado.email,
        nombre: usuarioActualizado.nombre,
        rol: usuarioActualizado.rol,
        necesita_completar_perfil: false
      },
      JWT_SECRETO,
      { expiresIn: JWT_EXPIRES_IN }
    );

    console.log('✅ Perfil completado para:', usuarioActualizado.nombre);

    return {
      exito: true,
      usuario: usuarioActualizado,
      token: token,
      mensaje: 'Perfil completado exitosamente'
    };

  } catch (error) {
    console.error('❌ Error en completarPerfilConCodigo:', error.message);
    return {
      exito: false,
      error: 'Error del servidor al completar perfil',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

// ==================== FUNCIONES DE REGISTRO ====================

/**
 * 5. Registrar nuevo usuario (para familias normales)
 */
export const registrarUsuario = async (datosUsuario) => {
  let client;

  try {
    console.log('👤 [AUTH] Registrando usuario:', datosUsuario.email);

    const {
      nombre,
      email,
      username,
      password,
      telefono,
      rol = 'familiar_secundario',
      codigo_familiar // Opcional: para vincular con grupo al registrarse
    } = datosUsuario;

    // Validaciones
    if (!nombre || nombre.trim().length === 0) {
      return {
        exito: false,
        error: 'El nombre es requerido',
        codigo: 'NOMBRE_REQUERIDO'
      };
    }

    if (!email || email.trim().length === 0) {
      return {
        exito: false,
        error: 'El email es requerido',
        codigo: 'EMAIL_REQUERIDO'
      };
    }

    if (!password || password.trim().length === 0) {
      return {
        exito: false,
        error: 'La contraseña es requerida',
        codigo: 'CONTRASENA_REQUERIDA'
      };
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        exito: false,
        error: 'Formato de email inválido',
        codigo: 'EMAIL_INVALIDO'
      };
    }

    // Validar contraseña
    if (password.length < 6) {
      return {
        exito: false,
        error: 'La contraseña debe tener al menos 6 caracteres',
        codigo: 'CONTRASENA_CORTA'
      };
    }

    const rolesPermitidos = ['familiar_admin', 'familiar_secundario', 'familiar_principal', 'familiar', 'profesional', 'anciano'];
    // Validar rol
    let rolFinal = rol;
    if (rolFinal === 'familiar_principal' || rolFinal === 'familiar') {
      rolFinal = 'familiar_admin';
    }
    // Luego en la validación usamos rolFinal
    if (!rolesPermitidos.includes(rolFinal)) {
      return { exito: false, error: `Rol no permitido...`, codigo: 'ROL_INVALIDO' };
    }

    client = await pool.connect();

    // Verificar si el usuario ya existe
    const usuarioExistente = await client.query(
      'SELECT id, email, username FROM usuarios WHERE LOWER(email) = LOWER($1) OR username = $2',
      [email.trim().toLowerCase(), username ? username.trim() : null]
    );

    if (usuarioExistente.rows.length > 0) {
      const usuarioExistenteData = usuarioExistente.rows[0];
      let mensajeError = 'El usuario ya existe';
      let codigoError = 'USUARIO_EXISTENTE';

      if (usuarioExistenteData.email.toLowerCase() === email.toLowerCase()) {
        mensajeError = 'Ya existe un usuario con este email';
        codigoError = 'EMAIL_EXISTENTE';
      } else if (username && usuarioExistenteData.username.toLowerCase() === username.toLowerCase()) {
        mensajeError = 'Ya existe un usuario con este nombre de usuario';
        codigoError = 'USERNAME_EXISTENTE';
      }

      return {
        exito: false,
        error: mensajeError,
        codigo: codigoError
      };
    }

    // Generar hash SHA256 de la contraseña
    const passwordHash = crypto
      .createHash('sha256')
      .update(password)
      .digest('hex')
      .toLowerCase();

    // Insertar nuevo usuario
    const insertQuery = `
      INSERT INTO usuarios (
        nombre, 
        email, 
        username, 
        password, 
        telefono,
        rolFinal,
        necesita_completar_perfil,
        estado,
        creado_en
      ) VALUES ($1, $2, $3, $4, $5, $6, false, 'activo', NOW())
      RETURNING 
        id,
        nombre,
        email,
        username,
        telefono,
        rol,
        necesita_completar_perfil,
        estado,
        creado_en
    `;

    const result = await client.query(insertQuery, [
      nombre.trim(),
      email.trim().toLowerCase(),
      username ? username.trim() : null,
      passwordHash,
      telefono || null,
      rol
    ]);

    const nuevoUsuario = result.rows[0];

    // Si se proporcionó código familiar, vincular al grupo
    // Si se proporcionó código familiar, vincular al grupo
    let grupoInfo = null;
    if (codigo_familiar) {
      const codigoLimpio = codigo_familiar.replace(/-/g, '').toUpperCase();

      const grupoResult = await client.query(`
        SELECT id FROM grupos_familiares 
        WHERE codigo_familiar = $1 AND activo = true AND fecha_expiracion > NOW()
      `, [codigoLimpio]);

      if (grupoResult.rows.length > 0) {
        const grupoId = grupoResult.rows[0].id;

        await client.query(`
          INSERT INTO usuario_grupo (
            usuario_id,
            grupo_familiar_id,
            rol_en_grupo,
            estado,
            fecha_unio
          ) VALUES ($1, $2, 'familiar', 'activo', NOW())
        `, [nuevoUsuario.id, grupoId]);

        // Obtener info del grupo
        const grupoInfoQuery = await client.query(`
          SELECT gf.codigo_familiar, gf.nombre_grupo, ua.nombre as admin_nombre
          FROM grupos_familiares gf
          JOIN usuarios ua ON gf.usuario_admin_id = ua.id
          WHERE gf.id = $1
        `, [grupoId]);

        if (grupoInfoQuery.rows.length > 0) {
          grupoInfo = grupoInfoQuery.rows[0];
        }
      }
    } else {
      // Si NO hay código familiar, CREAR GRUPO AUTOMÁTICAMENTE y asignar al usuario como ADMIN
      // Generar código único de 6 caracteres
      const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let codigoGrupo;
      let codigoUnico = false;
      let intentos = 0;

      while (!codigoUnico && intentos < 10) {
        codigoGrupo = '';
        for (let i = 0; i < 6; i++) {
          codigoGrupo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
        }
        const codigoCheck = await client.query(
          'SELECT id FROM grupos_familiares WHERE codigo_familiar = $1',
          [codigoGrupo]
        );
        if (codigoCheck.rows.length === 0) codigoUnico = true;
        intentos++;
      }

      if (!codigoUnico) {
        throw new Error('No se pudo generar código único para el grupo');
      }

      // Crear grupo
      const fechaExpiracion = new Date();
      fechaExpiracion.setDate(fechaExpiracion.getDate() + 30); // 30 días de validez

      const insertGrupo = await client.query(`
        INSERT INTO grupos_familiares (
          codigo_familiar,
          nombre_grupo,
          usuario_admin_id,
          fecha_expiracion,
          activo,
          max_integrantes
        ) VALUES ($1, $2, $3, $4, true, 10)
        RETURNING id, codigo_familiar, nombre_grupo
      `, [codigoGrupo, `Familia ${nuevoUsuario.nombre}`, nuevoUsuario.id, fechaExpiracion]);

      const grupoCreado = insertGrupo.rows[0];

      // Asignar usuario al grupo como admin
      await client.query(`
        INSERT INTO usuario_grupo (
          usuario_id,
          grupo_familiar_id,
          rol_en_grupo,
          estado,
          fecha_unio
        ) VALUES ($1, $2, 'admin', 'activo', NOW())
      `, [nuevoUsuario.id, grupoCreado.id]);

      grupoInfo = {
        codigo_familiar: grupoCreado.codigo_familiar,
        nombre_grupo: grupoCreado.nombre_grupo,
        admin_nombre: nuevoUsuario.nombre
      };
    }

    // Generar token
    const token = jwt.sign(
      {
        id: nuevoUsuario.id,
        email: nuevoUsuario.email,
        nombre: nuevoUsuario.nombre,
        rol: nuevoUsuario.rol,
        grupo_familiar_id: grupoInfo ? grupoId : null
      },
      JWT_SECRETO,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Preparar respuesta
    const respuesta = {
      exito: true,
      usuario: {
        ...nuevoUsuario,
        grupo_familiar: grupoInfo,
        perfil_completo: true
      },
      token: token
    };

    console.log('✅ Registro exitoso para:', email);

    return respuesta;

  } catch (error) {
    console.error('❌ Error en registrarUsuario:', error.message);

    if (error.message.includes('duplicate key') || error.code === '23505') {
      return {
        exito: false,
        error: 'El usuario ya existe',
        codigo: 'USUARIO_DUPLICADO'
      };
    }

    return {
      exito: false,
      error: 'Error del servidor en registro',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

// ==================== FUNCIONES DE RECUPERACIÓN DE CONTRASEÑA ====================

/**
 * 6. Solicitar recuperación de contraseña
 */
export const solicitarRecuperacionContrasena = async (email) => {
  let client;

  try {
    console.log('📧 [AUTH] Enviando código recuperación a:', email);

    if (!email || !email.includes('@')) {
      return {
        exito: false,
        error: 'Email inválido',
        codigo: 'EMAIL_INVALIDO'
      };
    }

    client = await pool.connect();

    // Verificar que el email existe
    const usuarioQuery = `
      SELECT id, nombre FROM usuarios 
      WHERE LOWER(email) = LOWER($1) AND estado = 'activo'
    `;

    const usuarioResult = await client.query(usuarioQuery, [email.toLowerCase()]);

    if (usuarioResult.rows.length === 0) {
      return {
        exito: false,
        error: 'No existe una cuenta activa con este email',
        codigo: 'EMAIL_NO_ENCONTRADO'
      };
    }

    const usuario = usuarioResult.rows[0];

    // Generar código de 6 dígitos
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();

    // Guardar código en base de datos (con expiración de 15 minutos)
    const expiracion = new Date();
    expiracion.setMinutes(expiracion.getMinutes() + 15);

    const insertCodigoQuery = `
      INSERT INTO codigos_recuperacion (
        usuario_id,
        codigo,
        expiracion,
        utilizado
      ) VALUES ($1, $2, $3, false)
      ON CONFLICT (usuario_id) 
      DO UPDATE SET 
        codigo = $2,
        expiracion = $3,
        utilizado = false,
        creado_en = NOW()
    `;

    await client.query(insertCodigoQuery, [usuario.id, codigo, expiracion]);

    console.log(`📨 Código generado para ${usuario.nombre}: ${codigo}`);

    // Después de guardar el código en BD:
    const emailEnviado = await enviarCodigoVerificacion(email, codigo, 'recuperacion');

    if (!emailEnviado.exito) {
      console.error('❌ Error enviando correo:', emailEnviado.error);
    }

    return {
      exito: true,
      mensaje: 'Código de recuperación enviado',
      usuario_id: usuario.id,
      codigo_demo: process.env.NODE_ENV === 'development' ? codigo : undefined
    };

  } catch (error) {
    console.error('❌ Error en solicitarRecuperacionContrasena:', error.message);
    return {
      exito: false,
      error: 'Error del servidor al enviar código',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 7. Verificar código de recuperación
 */
export const verificarCodigoRecuperacion = async (usuarioId, codigo) => {
  let client;

  try {
    console.log('🔐 [AUTH] Verificando código recuperación para usuario:', usuarioId);

    if (!usuarioId || !codigo) {
      return {
        exito: false,
        error: 'Datos incompletos',
        codigo: 'DATOS_INCOMPLETOS'
      };
    }

    client = await pool.connect();

    const query = `
      SELECT id, expiracion, utilizado
      FROM codigos_recuperacion
      WHERE usuario_id = $1 
        AND codigo = $2
        AND expiracion > NOW()
        AND utilizado = false
    `;

    const result = await client.query(query, [usuarioId, codigo]);

    if (result.rows.length === 0) {
      return {
        exito: false,
        error: 'Código inválido, expirado o ya utilizado',
        codigo: 'CODIGO_NO_VALIDO'
      };
    }

    return {
      exito: true,
      mensaje: 'Código verificado correctamente',
      codigo_id: result.rows[0].id
    };

  } catch (error) {
    console.error('❌ Error en verificarCodigoRecuperacion:', error.message);
    return {
      exito: false,
      error: 'Error del servidor al verificar código',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 8. Restablecer contraseña
 */
export const restablecerContrasena = async (usuarioId, codigoId, nuevaContrasena) => {
  let client;

  try {
    console.log('🔑 [AUTH] Restableciendo contraseña para usuario:', usuarioId);

    // Validar nueva contraseña
    if (!nuevaContrasena || nuevaContrasena.length < 6) {
      return {
        exito: false,
        error: 'La nueva contraseña debe tener al menos 6 caracteres',
        codigo: 'CONTRASENA_CORTA'
      };
    }

    client = await pool.connect();

    // Verificar que el código es válido
    const codigoQuery = `
      SELECT id FROM codigos_recuperacion
      WHERE id = $1 
        AND usuario_id = $2
        AND expiracion > NOW()
        AND utilizado = false
    `;

    const codigoResult = await client.query(codigoQuery, [codigoId, usuarioId]);

    if (codigoResult.rows.length === 0) {
      return {
        exito: false,
        error: 'Código inválido, expirado o ya utilizado',
        codigo: 'CODIGO_NO_VALIDO'
      };
    }

    // Encriptar nueva contraseña
    const nuevaPasswordHash = crypto
      .createHash('sha256')
      .update(nuevaContrasena)
      .digest('hex')
      .toLowerCase();

    // Iniciar transacción
    await client.query('BEGIN');

    try {
      // Actualizar contraseña
      await client.query(
        'UPDATE usuarios SET password = $1, actualizado_en = NOW() WHERE id = $2',
        [nuevaPasswordHash, usuarioId]
      );

      // Marcar código como utilizado
      await client.query(
        'UPDATE codigos_recuperacion SET utilizado = true WHERE id = $1',
        [codigoId]
      );

      await client.query('COMMIT');

      console.log('✅ Contraseña restablecida para usuario:', usuarioId);

      return {
        exito: true,
        mensaje: 'Contraseña restablecida exitosamente'
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('❌ Error en restablecerContrasena:', error.message);
    return {
      exito: false,
      error: 'Error del servidor al restablecer contraseña',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

// ==================== FUNCIONES DE VERIFICACIÓN ====================

/**
 * 9. Verificar token JWT
 */
export const verificarToken = async (token) => {
  try {
    console.log('🔍 [AUTH] Verificando token');

    if (!JWT_SECRETO) {
      throw new Error('JWT_SECRETO no configurado');
    }

    const decoded = jwt.verify(token, JWT_SECRETO);

    // Verificar que el usuario aún existe
    const client = await pool.connect();
    try {
      const usuarioQuery = `
        SELECT 
          u.id, 
          u.nombre, 
          u.email, 
          u.rol, 
          u.necesita_completar_perfil,
          u.estado,
          ug.grupo_familiar_id,
          ug.rol_en_grupo,
          gf.codigo_familiar
        FROM usuarios u
        LEFT JOIN usuario_grupo ug ON u.id = ug.usuario_id AND ug.estado = 'activo'
        LEFT JOIN grupos_familiares gf ON ug.grupo_familiar_id = gf.id AND gf.activo = true
        WHERE u.id = $1 AND u.estado = 'activo'
      `;

      const usuarioResult = await client.query(usuarioQuery, [decoded.id]);

      if (usuarioResult.rows.length === 0) {
        return {
          exito: false,
          error: 'Usuario no encontrado o inactivo',
          codigo: 'USUARIO_NO_ENCONTRADO'
        };
      }

      const usuario = usuarioResult.rows[0];

      return {
        exito: true,
        usuario: {
          id: usuario.id,
          nombre: usuario.nombre,
          email: usuario.email,
          rol: usuario.rol,
          necesita_completar_perfil: usuario.necesita_completar_perfil,
          estado: usuario.estado,
          grupo_familiar: usuario.grupo_familiar_id ? {
            id: usuario.grupo_familiar_id,
            codigo: usuario.codigo_familiar,
            rol_en_grupo: usuario.rol_en_grupo
          } : null,
          perfil_completo: !usuario.necesita_completar_perfil
        },
        mensaje: 'Token válido'
      };

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ Error en verificarToken:', error.message);

    if (error.name === 'TokenExpiredError') {
      return {
        exito: false,
        error: 'Token expirado',
        codigo: 'TOKEN_EXPIRADO'
      };
    }

    if (error.name === 'JsonWebTokenError') {
      return {
        exito: false,
        error: 'Token inválido',
        codigo: 'TOKEN_INVALIDO'
      };
    }

    return {
      exito: false,
      error: 'Error al verificar token',
      codigo: 'ERROR_VERIFICACION'
    };
  }
};

/**
 * 10. Cerrar sesión (lado del servidor)
 */
export const cerrarSesion = async (usuarioId) => {
  try {
    console.log('🚪 [AUTH] Cerrar sesión para usuario:', usuarioId);

    // Aquí podrías invalidar tokens, registrar logout, etc.
    // Por ahora, solo registro
    const client = await pool.connect();
    try {
      await client.query(
        'UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = $1',
        [usuarioId]
      );
    } finally {
      client.release();
    }

    return {
      exito: true,
      mensaje: 'Sesión cerrada correctamente'
    };

  } catch (error) {
    console.error('❌ Error en cerrarSesion:', error.message);
    return {
      exito: false,
      error: 'Error al cerrar sesión',
      codigo: 'ERROR_SERVIDOR'
    };
  }
};

/**
 * 11. Cambiar contraseña (para usuarios autenticados)
 */
export const cambiarContrasena = async (usuarioId, contrasenaActual, nuevaContrasena) => {
  let client;

  try {
    console.log('🔑 [AUTH] Cambiar contraseña para usuario ID:', usuarioId);

    // Validar nueva contraseña
    if (nuevaContrasena.length < 6) {
      return {
        exito: false,
        error: 'La nueva contraseña debe tener al menos 6 caracteres',
        codigo: 'CONTRASENA_CORTA'
      };
    }

    client = await pool.connect();

    // Obtener usuario actual
    const query = 'SELECT password FROM usuarios WHERE id = $1 AND estado = $2';
    const result = await client.query(query, [usuarioId, 'activo']);

    if (result.rows.length === 0) {
      return {
        exito: false,
        error: 'Usuario no encontrado o inactivo',
        codigo: 'USUARIO_NO_ENCONTRADO'
      };
    }

    const usuario = result.rows[0];
    const hashActual = usuario.password;

    // Verificar contraseña actual
    let contrasenaActualValida = false;

    if (hashActual.startsWith('$2')) {
      // Hash bcrypt
      contrasenaActualValida = await bcrypt.compare(contrasenaActual, hashActual);
    }
    else if (hashActual.length === 64 && /^[a-f0-9]{64}$/i.test(hashActual)) {
      // Hash SHA256
      const hashCalculado = crypto
        .createHash('sha256')
        .update(contrasenaActual)
        .digest('hex')
        .toLowerCase();

      contrasenaActualValida = hashCalculado === hashActual.toLowerCase();
    }

    if (!contrasenaActualValida) {
      return {
        exito: false,
        error: 'Contraseña actual incorrecta',
        codigo: 'CONTRASENA_ACTUAL_INCORRECTA'
      };
    }

    // Hash de la nueva contraseña con SHA256
    const nuevaPasswordHash = crypto
      .createHash('sha256')
      .update(nuevaContrasena)
      .digest('hex')
      .toLowerCase();

    // Actualizar en la base de datos
    await client.query(
      'UPDATE usuarios SET password = $1, actualizado_en = NOW() WHERE id = $2',
      [nuevaPasswordHash, usuarioId]
    );

    console.log('✅ Contraseña actualizada para usuario ID:', usuarioId);

    return {
      exito: true,
      mensaje: 'Contraseña actualizada correctamente'
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

// ==================== FUNCIONES DE VERIFICACIÓN DE DISPONIBILIDAD ====================

/**
 * 12. Verificar disponibilidad de email y username
 */
export const verificarDisponibilidadUsuario = async (email, username) => {
  let client;

  try {
    console.log('🔍 [AUTH] Verificando disponibilidad:', { email, username });

    client = await pool.connect();

    const errores = {};

    // Verificar email
    if (email) {
      const emailResult = await client.query(
        'SELECT id FROM usuarios WHERE LOWER(email) = LOWER($1) AND estado = $2',
        [email, 'activo']
      );
      if (emailResult.rows.length > 0) {
        errores.email = 'El correo electrónico ya está registrado';
      }
    }

    // Verificar username
    if (username) {
      const usernameResult = await client.query(
        'SELECT id FROM usuarios WHERE LOWER(username) = LOWER($1) AND estado = $2',
        [username, 'activo']
      );
      if (usernameResult.rows.length > 0) {
        errores.username = 'El nombre de usuario ya está en uso';
      }
    }

    return {
      exito: true,
      disponible: Object.keys(errores).length === 0,
      errores,
      mensaje: Object.keys(errores).length === 0
        ? 'Datos disponibles'
        : 'Hay conflictos con los datos'
    };

  } catch (error) {
    console.error('❌ Error en verificarDisponibilidadUsuario:', error);
    return {
      exito: false,
      error: 'Error al verificar disponibilidad',
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
  // Autenticación básica
  iniciarSesion,
  iniciarSesionConCodigoFamiliar,
  iniciarSesionConCodigoPersonalizado,
  completarPerfilConCodigo,
  registrarUsuario,

  // Recuperación de contraseña
  solicitarRecuperacionContrasena,
  verificarCodigoRecuperacion,
  restablecerContrasena,

  // Verificación y gestión
  verificarToken,
  cerrarSesion,
  cambiarContrasena,
  verificarDisponibilidadUsuario
};