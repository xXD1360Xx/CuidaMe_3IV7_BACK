// middleware/autenticacionMiddleware.js - Middleware ÚNICO para toda la aplicación CuidaMe
import jwt from 'jsonwebtoken';
import { pool } from '../configuracion/basedeDatos.js';

// Configuración
const JWT_SECRETO = process.env.JWT_SECRETO || 'cuidame_secret_key_2024_produccion';

/**
 * Middleware PRINCIPAL - Autenticar usuario con JWT
 * Se usa en TODAS las rutas protegidas de TODOS los controladores
 */
export const autenticarUsuario = async (req, res, next) => {
  try {
    console.log('🔐 [MIDDLEWARE] Verificando autenticación...');
    console.log('🔐 Headers recibidos:', req.headers.authorization);

    // 1. Obtener token de diferentes fuentes
    let token = obtenerTokenDeRequest(req);

    if (!token) {
      console.error('❌ [MIDDLEWARE] Token no encontrado');
      return responderErrorAutenticacion(res,
        'Acceso denegado. Token de autenticación requerido.',
        'TOKEN_NO_ENCONTRADO',
        401
      );
    }
    console.log('✅ [MIDDLEWARE] Token encontrado');

    // 2. Verificar y decodificar token
    const usuarioDecodificado = await verificarYDecodificarToken(token);

    if (!usuarioDecodificado) {
      return responderErrorAutenticacion(res,
        'Token inválido o expirado',
        'TOKEN_INVALIDO',
        401
      );
    }

    // 3. Obtener información completa del usuario desde BD
    const usuarioCompleto = await obtenerInformacionUsuarioBD(usuarioDecodificado.id);

    if (!usuarioCompleto) {
      return responderErrorAutenticacion(res,
        'Usuario no encontrado o inactivo',
        'USUARIO_NO_ENCONTRADO',
        401
      );
    }

    // 4. Adjuntar información del usuario a la request
    adjuntarUsuarioARequest(req, usuarioCompleto);

    console.log(`👤 [MIDDLEWARE] Usuario autenticado: ${usuarioCompleto.nombre} (ID: ${usuarioCompleto.id}, Rol: ${usuarioCompleto.rol})`);

    next();

  } catch (error) {
    console.error('🔥 [MIDDLEWARE] Error en autenticación:', error.message);

    if (error.name === 'JsonWebTokenError') {
      return responderErrorAutenticacion(res,
        'Token inválido o mal formado',
        'TOKEN_INVALIDO',
        401
      );
    }

    if (error.name === 'TokenExpiredError') {
      return responderErrorAutenticacion(res,
        'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
        'TOKEN_EXPIRADO',
        401
      );
    }

    return responderErrorAutenticacion(res,
      'Error en la autenticación',
      'ERROR_AUTENTICACION',
      500
    );
  }
};

/**
 * Función auxiliar: Obtener token de diferentes fuentes
 */
const obtenerTokenDeRequest = (req) => {
  let token = null;

  // 1. Headers Authorization (estándar para React Native/Expo/APIs)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  // 2. Headers personalizados (alternativa)
  if (!token && req.headers['x-access-token']) {
    token = req.headers['x-access-token'];
  }

  // 3. Query string (para debugging/testing)
  if (!token && req.query.token) {
    token = req.query.token;
  }

  // 4. Cookies (para web)
  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  // 5. Body (último recurso, no recomendado para GET)
  if (!token && req.body && req.body.token) {
    token = req.body.token;
  }

  return token;
};

/**
 * Función auxiliar: Verificar y decodificar token JWT
 */
const verificarYDecodificarToken = async (token) => {
  try {
    if (!JWT_SECRETO) {
      console.error('❌ JWT_SECRETO no configurado en variables de entorno');
      return null;
    }

    const decoded = jwt.verify(token, JWT_SECRETO);

    // Verificar estructura mínima
    if (!decoded.id) {
      console.error('❌ Token no contiene ID de usuario');
      return null;
    }

    return {
      id: decoded.id,
      email: decoded.email || null,
      nombre: decoded.nombre || null,
      rol: decoded.rol || 'usuario'
    };

  } catch (error) {
    console.error('❌ Error verificando token:', error.message);
    throw error;
  }
};

/**
 * Función auxiliar: Obtener información completa del usuario desde BD
 */
const obtenerInformacionUsuarioBD = async (usuarioId) => {
  try {
    const query = `
      SELECT 
        u.id,
        u.nombre,
        u.email,
        u.username,
        u.rol,
        u.telefono,
        u.necesita_completar_perfil,
        u.estado,
        u.imagen_perfil,
        u.notificaciones_email,
        u.notificaciones_push,
        u.creado_en,
        u.actualizado_en,
        u.ultimo_acceso,
        ug.grupo_familiar_id,
        ug.rol_en_grupo,
        gf.codigo_familiar,
        gf.nombre_grupo,
        gf.activo as grupo_activo
      FROM usuarios u
      LEFT JOIN usuario_grupo ug ON u.id = ug.usuario_id AND ug.estado = 'activo'
      LEFT JOIN grupos_familiares gf ON ug.grupo_familiar_id = gf.id AND gf.activo = true
      WHERE u.id = $1 AND u.estado = 'activo'
      LIMIT 1
    `;

    const result = await pool.query(query, [usuarioId]);

    if (result.rows.length === 0) {
      console.log('❌ Usuario no encontrado o inactivo en BD');
      return null;
    }

    return result.rows[0];

  } catch (error) {
    console.error('❌ Error obteniendo usuario de BD:', error.message);
    return null;
  }
};

/**
 * Función auxiliar: Adjuntar información del usuario al request
 */
const adjuntarUsuarioARequest = (req, usuario) => {
  req.usuario = {
    // Información básica
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    rol: usuario.rol,

    // Información adicional
    telefono: usuario.telefono,
    necesita_completar_perfil: usuario.necesita_completar_perfil,
    estado: usuario.estado,
    imagen_perfil: usuario.imagen_perfil,

    // Preferencias
    notificaciones_email: usuario.notificaciones_email,
    notificaciones_push: usuario.notificaciones_push,

    // Información de grupo familiar
    grupo_familiar_id: usuario.grupo_familiar_id,
    rol_en_grupo: usuario.rol_en_grupo,
    codigo_familiar: usuario.codigo_familiar,
    nombre_grupo: usuario.nombre_grupo,
    grupo_activo: usuario.grupo_activo,

    // Timestamps
    creado_en: usuario.creado_en,
    actualizado_en: usuario.actualizado_en,
    ultimo_acceso: usuario.ultimo_acceso
  };

  // Log reducido para seguridad
  console.log(`✅ Usuario adjuntado a request: ${usuario.nombre} (${usuario.rol})`);
};

/**
 * Función auxiliar: Responder error de autenticación
 */
const responderErrorAutenticacion = (res, mensaje, codigo, status = 401) => {
  console.error(`❌ Error autenticación [${codigo}]: ${mensaje}`);

  return res.status(status).json({
    exito: false,
    error: mensaje,
    codigo: codigo,
    timestamp: new Date().toISOString()
  });
};

// ==================== MIDDLEWARES ESPECÍFICOS ====================

/**
 * Middleware para verificar rol específico
 * Uso: router.get('/ruta', verificarRol('admin', 'familiar_admin'), controlador)
 */
export const verificarRol = (...rolesPermitidos) => {
  return (req, res, next) => {
    console.log(`👮‍♂️ [MIDDLEWARE] Verificando roles: ${rolesPermitidos.join(', ')}`);

    if (!req.usuario) {
      return responderErrorAutenticacion(res,
        'Usuario no autenticado',
        'NO_AUTENTICADO',
        401
      );
    }

    const rolUsuario = req.usuario.rol;
    const tienePermiso = rolesPermitidos.includes(rolUsuario);

    if (!tienePermiso) {
      console.error(`❌ Rol insuficiente: ${rolUsuario}. Requerido: ${rolesPermitidos.join(', ')}`);
      return responderErrorAutenticacion(res,
        'No tienes permisos para realizar esta acción',
        'PERMISO_DENEGADO',
        403
      );
    }

    console.log(`✅ Rol verificado: ${rolUsuario}`);
    next();
  };
};

/**
 * Middleware para verificar que pertenece a un grupo familiar
 * Uso: router.get('/ruta', verificarGrupo(), controlador)
 */
export const verificarGrupo = (req, res, next) => {
  console.log('🏠 [MIDDLEWARE] Verificando grupo familiar...');

  if (!req.usuario) {
    return responderErrorAutenticacion(res,
      'Usuario no autenticado',
      'NO_AUTENTICADO',
      401
    );
  }

  if (!req.usuario.grupo_familiar_id) {
    console.error('❌ Usuario no tiene grupo familiar asignado');
    return responderErrorAutenticacion(res,
      'No perteneces a ningún grupo familiar',
      'SIN_GRUPO',
      403
    );
  }

  if (!req.usuario.grupo_activo) {
    console.error('❌ Grupo familiar inactivo');
    return responderErrorAutenticacion(res,
      'Tu grupo familiar está inactivo',
      'GRUPO_INACTIVO',
      403
    );
  }

  console.log(`✅ Usuario pertenece al grupo: ${req.usuario.grupo_familiar_id}`);
  next();
};

/**
 * Middleware para verificar que es administrador del grupo
 * Uso: router.get('/ruta', verificarAdminGrupo(), controlador)
 */
export const verificarAdminGrupo = (req, res, next) => {
  console.log('👑 [MIDDLEWARE] Verificando administrador de grupo...');

  if (!req.usuario) {
    return responderErrorAutenticacion(res,
      'Usuario no autenticado',
      'NO_AUTENTICADO',
      401
    );
  }

  const esAdmin = req.usuario.rol === 'admin' ||
    req.usuario.rol === 'familiar_admin' ||
    req.usuario.rol_en_grupo === 'admin';

  if (!esAdmin) {
    console.error(`❌ No es administrador: rol=${req.usuario.rol}, rol_en_grupo=${req.usuario.rol_en_grupo}`);
    return responderErrorAutenticacion(res,
      'Solo los administradores pueden realizar esta acción',
      'NO_ADMIN',
      403
    );
  }

  console.log('✅ Usuario es administrador del grupo');
  next();
};

/**
 * Middleware para verificar que necesita completar perfil
 * Uso: router.get('/ruta', verificarPerfilCompleto(), controlador)
 */
export const verificarPerfilCompleto = (req, res, next) => {
  console.log('📋 [MIDDLEWARE] Verificando perfil completo...');

  if (!req.usuario) {
    return responderErrorAutenticacion(res,
      'Usuario no autenticado',
      'NO_AUTENTICADO',
      401
    );
  }

  if (req.usuario.necesita_completar_perfil) {
    console.error('❌ Usuario necesita completar perfil');
    return responderErrorAutenticacion(res,
      'Debes completar tu perfil antes de acceder a esta funcionalidad',
      'PERFIL_INCOMPLETO',
      403
    );
  }

  console.log('✅ Perfil completo');
  next();
};

/**
 * Middleware para logging de requests autenticadas (opcional)
 * Uso: router.use(logAutenticado)
 */
export const logAutenticado = (req, res, next) => {
  if (req.usuario) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const metodo = req.method;
    const ruta = req.originalUrl;
    const usuarioId = req.usuario.id;
    const usuarioEmail = req.usuario.email;

    console.log(`📝 [${timestamp}] ${metodo} ${ruta} - Usuario: ${usuarioEmail} (ID: ${usuarioId})`);
  }
  next();
};

/**
 * Middleware para actualizar último acceso
 * Uso: router.use(actualizarUltimoAcceso)
 */
export const actualizarUltimoAcceso = async (req, res, next) => {
  try {
    if (req.usuario && req.usuario.id) {
      // Actualizar último acceso de forma asíncrona (no bloquear la respuesta)
      setTimeout(async () => {
        try {
          await pool.query(
            'UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = $1',
            [req.usuario.id]
          );
          console.log(`🕒 Último acceso actualizado para usuario: ${req.usuario.id}`);
        } catch (error) {
          console.error('❌ Error actualizando último acceso:', error.message);
        }
      }, 0);
    }
  } catch (error) {
    // No bloquear la request si hay error
    console.error('❌ Error en middleware de último acceso:', error.message);
  }

  next();
};

/**
 * Middleware para CORS específico para usuarios autenticados
 * Uso: router.use(corsAutenticado)
 */
export const corsAutenticado = (req, res, next) => {
  // Headers adicionales para requests autenticadas
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  next();
};

/**
 * Middleware para validar datos de usuario en requests
 * Uso: router.post('/ruta', validarDatosUsuario, controlador)
 */
export const validarDatosUsuario = (req, res, next) => {
  console.log('🔍 [MIDDLEWARE] Validando datos de usuario...');

  if (!req.usuario) {
    return responderErrorAutenticacion(res,
      'Usuario no autenticado',
      'NO_AUTENTICADO',
      401
    );
  }

  // Verificar que el usuario está intentando modificar sus propios datos
  const usuarioIdRequest = req.params.id || req.body.usuario_id;

  if (usuarioIdRequest && parseInt(usuarioIdRequest) !== req.usuario.id && req.usuario.rol !== 'admin') {
    console.error(`❌ Intento de modificar datos de otro usuario: ${usuarioIdRequest}`);
    return responderErrorAutenticacion(res,
      'No puedes modificar datos de otros usuarios',
      'MODIFICACION_NO_PERMITIDA',
      403
    );
  }

  console.log('✅ Validación de datos completada');
  next();
};

/**
 * Middleware para limitar tasa de requests por usuario
 * Uso: router.use(limitarRequests)
 */
export const limitarRequests = (req, res, next) => {
  if (req.usuario) {
    // Aquí implementarías lógica de rate limiting
    // Por ejemplo, usando redis o memoria para contar requests por usuario
    console.log(`⚡ Rate limiting para usuario: ${req.usuario.id}`);
  }

  next();
};

export default {
  autenticarUsuario,
  verificarRol,
  verificarGrupo,
  verificarAdminGrupo,
  verificarPerfilCompleto,
  logAutenticado,
  actualizarUltimoAcceso,
  corsAutenticado,
  validarDatosUsuario,
  limitarRequests
};