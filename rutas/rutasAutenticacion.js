// rutas/rutasAutenticacion.js
import express from 'express';
import authControlador from '../controladores/autenticacionControlador.js';

const router = express.Router();

// ==================== MIDDLEWARE DE LOGGING ====================
router.use((req, res, next) => {
  const emoji = {
    'POST': '📤',
    'GET': '📥',
    'PUT': '✏️',
    'DELETE': '🗑️'
  }[req.method] || '🔍';
  
  console.log(`${emoji} [AUTH] ${req.method} ${req.originalUrl}`);
  next();
});

// ==================== AUTENTICACIÓN BÁSICA ====================

/**
 * @route POST /api/auth/login
 * @desc Iniciar sesión con email/username y contraseña
 * @access Público
 */
router.post('/login', async (req, res) => {
  try {
    const { identificador, contrasena } = req.body;
    
    if (!identificador || !contrasena) {
      return res.status(400).json({
        exito: false,
        error: 'Identificador y contraseña son requeridos',
        codigo: 'CREDENCIALES_INCOMPLETAS'
      });
    }
    
    const resultado = await authControlador.iniciarSesion(identificador, contrasena);
    
    if (!resultado.exito) {
      const statusCode = 
        resultado.codigo === 'USUARIO_NO_ENCONTRADO' || 
        resultado.codigo === 'CONTRASENA_INCORRECTA' ? 401 : 400;
      
      return res.status(statusCode).json(resultado);
    }
    
    return res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en POST /api/auth/login:', error);
    return res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_SERVIDOR'
    });
  }
});

/**
 * @route POST /api/auth/login-codigo-familiar
 * @desc Iniciar sesión con email, contraseña y código familiar
 * @access Público
 */
router.post('/login-codigo-familiar', async (req, res) => {
  try {
    const { email, contrasena, codigo_familiar } = req.body;
    
    if (!email || !contrasena || !codigo_familiar) {
      return res.status(400).json({
        exito: false,
        error: 'Correo, contraseña y código familiar son requeridos',
        codigo: 'CREDENCIALES_INCOMPLETAS'
      });
    }
    
    const resultado = await authControlador.iniciarSesionConCodigoFamiliar(
      email, 
      contrasena, 
      codigo_familiar
    );
    
    if (!resultado.exito) {
      const statusCode = 
        resultado.codigo === 'CODIGO_FAMILIAR_INVALIDO' || 
        resultado.codigo === 'GRUPO_LLENO' || 
        resultado.codigo === 'YA_EN_GRUPO' ? 400 : 401;
      
      return res.status(statusCode).json(resultado);
    }
    
    return res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en POST /api/auth/login-codigo-familiar:', error);
    return res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_SERVIDOR'
    });
  }
});

/**
 * @route POST /api/auth/login-codigo-personalizado
 * @desc Iniciar sesión SOLO con código personalizado
 * @access Público
 */
router.post('/login-codigo-personalizado', async (req, res) => {
  try {
    const { codigo_personalizado } = req.body;
    
    if (!codigo_personalizado) {
      return res.status(400).json({
        exito: false,
        error: 'El código personalizado es requerido',
        codigo: 'CODIGO_REQUERIDO'
      });
    }
    
    const resultado = await authControlador.iniciarSesionConCodigoPersonalizado(codigo_personalizado);
    
    if (!resultado.exito) {
      const statusCode = resultado.codigo === 'CODIGO_NO_ENCONTRADO' ? 404 : 400;
      return res.status(statusCode).json(resultado);
    }
    
    return res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en POST /api/auth/login-codigo-personalizado:', error);
    return res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_SERVIDOR'
    });
  }
});

/**
 * @route POST /api/auth/completar-perfil
 * @desc Completar perfil para usuario que ingresó con código personalizado
 * @access Público (pero requiere token temporal)
 */
router.post('/completar-perfil', async (req, res) => {
  try {
    const { usuario_id, ...datosPerfil } = req.body;
    
    if (!usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario es requerido',
        codigo: 'USUARIO_ID_REQUERIDO'
      });
    }
    
    const resultado = await authControlador.completarPerfilConCodigo(usuario_id, datosPerfil);
    
    if (!resultado.exito) {
      return res.status(400).json(resultado);
    }
    
    return res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en POST /api/auth/completar-perfil:', error);
    return res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_SERVIDOR'
    });
  }
});

// ==================== REGISTRO ====================

/**
 * @route POST /api/auth/registro
 * @desc Registrar nuevo usuario
 * @access Público
 */
router.post('/registro', async (req, res) => {
  try {
    const datosUsuario = req.body;
    
    if (!datosUsuario.email || !datosUsuario.password || !datosUsuario.nombre) {
      return res.status(400).json({
        exito: false,
        error: 'Nombre, email y contraseña son requeridos',
        codigo: 'DATOS_INCOMPLETOS'
      });
    }
    
    const resultado = await authControlador.registrarUsuario(datosUsuario);
    
    if (!resultado.exito) {
      const statusCode = 
        resultado.codigo === 'EMAIL_EXISTENTE' || 
        resultado.codigo === 'USERNAME_EXISTENTE' ? 409 : 400;
      
      return res.status(statusCode).json(resultado);
    }
    
    return res.status(201).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en POST /api/auth/registro:', error);
    return res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_SERVIDOR'
    });
  }
});

// ==================== RECUPERACIÓN DE CONTRASEÑA ====================

/**
 * @route POST /api/auth/recuperar-contrasena/solicitar
 * @desc Solicitar recuperación de contraseña
 * @access Público
 */
router.post('/recuperar-contrasena/solicitar', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        exito: false,
        error: 'Email es requerido',
        codigo: 'EMAIL_REQUERIDO'
      });
    }
    
    const resultado = await authControlador.solicitarRecuperacionContrasena(email);
    
    if (!resultado.exito) {
      return res.status(400).json(resultado);
    }
    
    return res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en POST /api/auth/recuperar-contrasena/solicitar:', error);
    return res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_SERVIDOR'
    });
  }
});

/**
 * @route POST /api/auth/recuperar-contrasena/verificar
 * @desc Verificar código de recuperación
 * @access Público
 */
router.post('/recuperar-contrasena/verificar', async (req, res) => {
  try {
    const { usuario_id, codigo } = req.body;
    
    if (!usuario_id || !codigo) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario y código son requeridos',
        codigo: 'DATOS_INCOMPLETOS'
      });
    }
    
    const resultado = await authControlador.verificarCodigoRecuperacion(usuario_id, codigo);
    
    if (!resultado.exito) {
      return res.status(400).json(resultado);
    }
    
    return res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en POST /api/auth/recuperar-contrasena/verificar:', error);
    return res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_SERVIDOR'
    });
  }
});

/**
 * @route POST /api/auth/recuperar-contrasena/restablecer
 * @desc Restablecer contraseña con código verificado
 * @access Público
 */
router.post('/recuperar-contrasena/restablecer', async (req, res) => {
  try {
    const { usuario_id, codigo_id, nueva_contrasena } = req.body;
    
    if (!usuario_id || !codigo_id || !nueva_contrasena) {
      return res.status(400).json({
        exito: false,
        error: 'Todos los campos son requeridos',
        codigo: 'DATOS_INCOMPLETOS'
      });
    }
    
    const resultado = await authControlador.restablecerContrasena(
      usuario_id, 
      codigo_id, 
      nueva_contrasena
    );
    
    if (!resultado.exito) {
      return res.status(400).json(resultado);
    }
    
    return res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en POST /api/auth/recuperar-contrasena/restablecer:', error);
    return res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_SERVIDOR'
    });
  }
});

// ==================== VERIFICACIÓN Y GESTIÓN ====================

/**
 * @route POST /api/auth/verificar
 * @desc Verificar token JWT
 * @access Público (pero requiere token)
 */
router.post('/verificar', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        exito: false,
        error: 'Token es requerido',
        codigo: 'TOKEN_REQUERIDO'
      });
    }
    
    const resultado = await authControlador.verificarToken(token);
    
    if (!resultado.exito) {
      const statusCode = 
        resultado.codigo === 'TOKEN_EXPIRADO' || 
        resultado.codigo === 'TOKEN_INVALIDO' ? 401 : 400;
      
      return res.status(statusCode).json(resultado);
    }
    
    return res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en POST /api/auth/verificar:', error);
    return res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_SERVIDOR'
    });
  }
});

/**
 * @route GET /api/auth/verificar-token
 * @desc Verificar token JWT desde headers (para frontend)
 * @access Privado (requiere token en Authorization header)
 */
router.get('/verificar-token', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        exito: false,
        error: 'Token no proporcionado',
        codigo: 'TOKEN_NO_PROVIDED'
      });
    }
    
    const token = authHeader.split(' ')[1];
    const resultado = await authControlador.verificarToken(token);
    
    if (!resultado.exito) {
      return res.status(401).json(resultado);
    }
    
    return res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en GET /api/auth/verificar-token:', error);
    return res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_SERVIDOR'
    });
  }
});

/**
 * @route POST /api/auth/cerrar-sesion
 * @desc Cerrar sesión (lado del servidor)
 * @access Privado (requiere token)
 */
router.post('/cerrar-sesion', async (req, res) => {
  try {
    const { usuario_id } = req.body;
    
    if (!usuario_id) {
      return res.status(400).json({
        exito: false,
        error: 'ID de usuario es requerido',
        codigo: 'USUARIO_ID_REQUERIDO'
      });
    }
    
    const resultado = await authControlador.cerrarSesion(usuario_id);
    
    if (!resultado.exito) {
      return res.status(400).json(resultado);
    }
    
    return res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en POST /api/auth/cerrar-sesion:', error);
    return res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_SERVIDOR'
    });
  }
});

/**
 * @route POST /api/auth/cambiar-contrasena
 * @desc Cambiar contraseña (para usuarios autenticados)
 * @access Privado (requiere token)
 */
router.post('/cambiar-contrasena', async (req, res) => {
  try {
    const { usuario_id, contrasena_actual, nueva_contrasena } = req.body;
    
    if (!usuario_id || !contrasena_actual || !nueva_contrasena) {
      return res.status(400).json({
        exito: false,
        error: 'Todos los campos son requeridos',
        codigo: 'DATOS_INCOMPLETOS'
      });
    }
    
    const resultado = await authControlador.cambiarContrasena(
      usuario_id, 
      contrasena_actual, 
      nueva_contrasena
    );
    
    if (!resultado.exito) {
      const statusCode = 
        resultado.codigo === 'CONTRASENA_ACTUAL_INCORRECTA' ? 401 : 400;
      
      return res.status(statusCode).json(resultado);
    }
    
    return res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en POST /api/auth/cambiar-contrasena:', error);
    return res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_SERVIDOR'
    });
  }
});

/**
 * @route GET /api/auth/verificar-disponibilidad
 * @desc Verificar disponibilidad de email y username
 * @access Público
 */
router.get('/verificar-disponibilidad', async (req, res) => {
  try {
    const { email, username } = req.query;
    
    // Al menos uno debe estar presente
    if (!email && !username) {
      return res.status(400).json({
        exito: false,
        error: 'Email o username son requeridos',
        codigo: 'DATOS_INCOMPLETOS'
      });
    }
    
    const resultado = await authControlador.verificarDisponibilidadUsuario(email, username);
    
    if (!resultado.exito) {
      return res.status(400).json(resultado);
    }
    
    return res.status(200).json(resultado);
    
  } catch (error) {
    console.error('❌ Error en GET /api/auth/verificar-disponibilidad:', error);
    return res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
      codigo: 'ERROR_SERVIDOR'
    });
  }
});

// ==================== DOCUMENTACIÓN DE RUTAS ====================

/**
 * @route GET /api/auth/rutas
 * @desc Documentación de todas las rutas de autenticación
 * @access Público
 */
router.get('/rutas', (req, res) => {
  res.json({
    exito: true,
    mensaje: 'Rutas de autenticación CuidaMe',
    rutas: [
      {
        metodo: 'POST',
        ruta: '/api/auth/login',
        descripcion: 'Iniciar sesión con email/username y contraseña',
        body: {
          identificador: 'string (email o username)',
          contrasena: 'string'
        }
      },
      {
        metodo: 'POST',
        ruta: '/api/auth/login-codigo-familiar',
        descripcion: 'Iniciar sesión con email + contraseña + código familiar',
        body: {
          email: 'string',
          contrasena: 'string',
          codigo_familiar: 'string (6 caracteres)'
        }
      },
      {
        metodo: 'POST',
        ruta: '/api/auth/login-codigo-personalizado',
        descripcion: 'Iniciar sesión SOLO con código personalizado',
        body: {
          codigo_personalizado: 'string (6 caracteres)'
        }
      },
      {
        metodo: 'POST',
        ruta: '/api/auth/completar-perfil',
        descripcion: 'Completar perfil para usuario con código personalizado',
        body: {
          usuario_id: 'number',
          nombre: 'string (opcional)',
          email: 'string (opcional)',
          telefono: 'string (opcional)',
          password: 'string (opcional, mínimo 6 caracteres)',
          fecha_nacimiento: 'string (opcional, formato YYYY-MM-DD)',
          genero: 'string (opcional)',
          parentesco: 'string (opcional)'
        }
      },
      {
        metodo: 'POST',
        ruta: '/api/auth/registro',
        descripcion: 'Registrar nuevo usuario',
        body: {
          nombre: 'string',
          email: 'string',
          password: 'string (mínimo 6 caracteres)',
          username: 'string (opcional)',
          telefono: 'string (opcional)',
          rol: 'string (opcional, default: "familiar_secundario")',
          codigo_familiar: 'string (opcional, para unirse a grupo)'
        }
      },
      {
        metodo: 'POST',
        ruta: '/api/auth/recuperar-contrasena/solicitar',
        descripcion: 'Solicitar recuperación de contraseña',
        body: {
          email: 'string'
        }
      },
      {
        metodo: 'POST',
        ruta: '/api/auth/recuperar-contrasena/verificar',
        descripcion: 'Verificar código de recuperación',
        body: {
          usuario_id: 'number',
          codigo: 'string (6 dígitos)'
        }
      },
      {
        metodo: 'POST',
        ruta: '/api/auth/recuperar-contrasena/restablecer',
        descripcion: 'Restablecer contraseña',
        body: {
          usuario_id: 'number',
          codigo_id: 'number',
          nueva_contrasena: 'string (mínimo 6 caracteres)'
        }
      },
      {
        metodo: 'GET',
        ruta: '/api/auth/verificar-token',
        descripcion: 'Verificar token JWT (desde Authorization header)',
        headers: {
          Authorization: 'Bearer <token>'
        }
      },
      {
        metodo: 'POST',
        ruta: '/api/auth/verificar',
        descripcion: 'Verificar token JWT (desde body)',
        body: {
          token: 'string'
        }
      },
      {
        metodo: 'POST',
        ruta: '/api/auth/cambiar-contrasena',
        descripcion: 'Cambiar contraseña',
        body: {
          usuario_id: 'number',
          contrasena_actual: 'string',
          nueva_contrasena: 'string (mínimo 6 caracteres)'
        }
      },
      {
        metodo: 'POST',
        ruta: '/api/auth/cerrar-sesion',
        descripcion: 'Cerrar sesión (lado servidor)',
        body: {
          usuario_id: 'number'
        }
      },
      {
        metodo: 'GET',
        ruta: '/api/auth/verificar-disponibilidad',
        descripcion: 'Verificar disponibilidad de email/username',
        query: {
          email: 'string (opcional)',
          username: 'string (opcional)'
        }
      }
    ]
  });
});

// ==================== MIDDLEWARE DE ERRORES ====================
router.use((err, req, res, next) => {
  console.error('🔥 Error en rutas de autenticación:', err);
  
  res.status(err.status || 500).json({
    exito: false,
    error: err.message || 'Error interno del servidor',
    codigo: 'ERROR_INTERNO'
  });
});

// ==================== RUTA DE FALLBACK ====================
router.use('*', (req, res) => {
  res.status(404).json({
    exito: false,
    error: 'Ruta de autenticación no encontrada',
    sugerencias: [
      'POST /api/auth/login - Iniciar sesión',
      'POST /api/auth/registro - Registrarse',
      'GET /api/auth/rutas - Ver todas las rutas'
    ]
  });
});

export default router;