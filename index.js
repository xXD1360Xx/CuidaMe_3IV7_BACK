// index.js - API BACKEND PARA CUIDAME
import express from 'express';
import cors from 'cors';
import { verificarConexionDB } from './configuracion/basedeDatos.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ========== 1. CONFIGURACIÓN DE DIRECTORIOS ==========
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ========== 2. VERIFICACIÓN DE VARIABLES DE ENTORNO ==========
console.log('\n🚀 ========== INICIANDO API CUIDAME ==========');
console.log('📦 Variables de entorno críticas:');

const variablesCriticas = [
  'JWT_SECRETO',
  'DATABASE_URL',
  'PORT',
  'NODE_ENV'
];

let todasVariablesPresentes = true;
variablesCriticas.forEach(variable => {
  const valor = process.env[variable];
  if (valor) {
    if (variable.includes('SECRET') || variable.includes('KEY') || variable.includes('PASSWORD')) {
      console.log(`✅ ${variable}: ***PRESENTE*** (${valor.length} caracteres)`);
    } else {
      console.log(`✅ ${variable}: ${valor.substring(0, 20)}${valor.length > 20 ? '...' : ''}`);
    }
  } else {
    console.error(`❌ ${variable}: NO ENCONTRADA`);
    todasVariablesPresentes = false;
  }
});

if (!todasVariablesPresentes) {
  console.warn('⚠️  Advertencia: Algunas variables críticas no están configuradas');
}

// ========== 3. IMPORTACIÓN DE RUTAS ==========
console.log('\n🔗 IMPORTANDO RUTAS DE LA API...');

// Importar todas las rutas necesarias
import rutasAutenticacion from './rutas/rutasAutenticacion.js';
import rutasUsuario from './rutas/rutasUsuario.js';
import rutasGastos from './rutas/rutasGastos.js';
import rutasMedicinas from './rutas/rutasMedicinas.js';
import rutasCalendario from './rutas/rutasCalendario.js'; // Cambiado de rutasEventos
import rutasFamilia from './rutas/rutasFamilia.js';
import rutasHorario from './rutas/rutasHorario.js'; // Nueva ruta para horario
import rutasInfoAdulto from './rutas/rutasInfoAdulto.js'; // Nueva ruta para info adulto
import rutasPreferencias from './rutas/rutasPreferencias.js'; // Nueva ruta para preferencias

console.log('✅ Todas las rutas importadas correctamente');

// ========== 4. CONFIGURACIÓN DE EXPRESS ==========
const app = express();
const PORT = process.env.PORT || 3000;

// Configuración CORS para CuidaMe
app.use(cors({
  origin: function(origin, callback) {
    // Permitir todos los orígenes en desarrollo
    if (!origin || process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // Lista de orígenes permitidos en producción
    const allowedOrigins = [
      'https://cuidame-app.com',
      'https://www.cuidame-app.com',
      'http://localhost:3000',
      'http://localhost:19006',
      'exp://192.168.1.*:19000'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`⚠️  Origen no permitido: ${origin}`);
      callback(new Error('Origen no permitido por CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'Accept', 
    'X-Requested-With',
    'X-Auth-Token',
    'Origin'
  ],
  exposedHeaders: ['Authorization', 'X-Auth-Token'],
  maxAge: 86400 // 24 horas
}));

// Middleware para parsear JSON
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf.toString());
    } catch (e) {
      res.status(400).json({ 
        exito: false, 
        error: 'JSON inválido',
        codigo: 'JSON_INVALIDO' 
      });
      throw new Error('JSON inválido');
    }
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb',
  parameterLimit: 10000
}));

// ========== 5. MIDDLEWARE DE LOGGING ==========
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const datePart = timestamp.split('T')[0];
  const timePart = timestamp.split('T')[1].split('.')[0];
  const emoji = {
    'GET': '📥',
    'POST': '📤',
    'PUT': '✏️',
    'DELETE': '🗑️',
    'PATCH': '🔧',
    'OPTIONS': '🔍'
  }[req.method] || '❓';
  
  console.log(`${emoji} [${datePart} ${timePart}] ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
  
  // Log del cuerpo para desarrollo (excluyendo datos sensibles)
  if (process.env.NODE_ENV === 'development' && req.body && Object.keys(req.body).length > 0) {
    const logBody = { ...req.body };
    
    // Ocultar datos sensibles
    const sensitiveFields = ['contrasena', 'password', 'token', 'access_token', 'refresh_token', 'codigo'];
    sensitiveFields.forEach(field => {
      if (logBody[field]) {
        logBody[field] = '***OCULTO***';
      }
    });
    
    console.log('📝 Cuerpo de la petición:', JSON.stringify(logBody, null, 2));
  }
  
  next();
});

// ========== 6. RUTAS BÁSICAS DE SALUD Y DOCUMENTACIÓN ==========

// Ruta de prueba básica
app.get('/test', (req, res) => {
  res.json({ 
    exito: true, 
    mensaje: 'API CuidaMe funcionando correctamente',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    servicio: 'cuida-me-backend',
    entorno: process.env.NODE_ENV || 'development'
  });
});

// Ruta de salud completa
app.get('/health', async (req, res) => {
  try {
    const dbStatus = await verificarConexionDB(3);
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    res.json({
      estado: 'saludable',
      servicio: 'api-cuidame',
      timestamp: new Date().toISOString(),
      entorno: process.env.NODE_ENV || 'development',
      base_datos: {
        conectada: dbStatus.connected,
        tiempo_respuesta: dbStatus.pingTime ? `${dbStatus.pingTime}ms` : null
      },
      memoria: {
        heap_usado: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
        heap_total: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`
      },
      tiempo_activo: {
        segundos: Math.floor(uptime),
        formato_humano: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`
      },
      version_node: process.version,
      sistema: process.platform
    });
  } catch (error) {
    console.error('❌ Error en endpoint /health:', error);
    res.status(500).json({ 
      exito: false, 
      error: 'Error al verificar salud del sistema',
      codigo: 'ERROR_SALUD' 
    });
  }
});

// Documentación de la API
app.get('/api-docs', (req, res) => {
  res.json({
    api: 'CuidaMe API',
    version: '1.0.0',
    descripcion: 'API backend para la aplicación CuidaMe - Sistema de gestión para cuidados de adultos mayores',
    documentacion_completa: 'https://docs.cuidame-app.com',
    version_api: 'v1',
    endpoints_principales: {
      autenticacion: {
        base: '/api/auth',
        descripcion: 'Autenticación y gestión de usuarios',
        rutas: [
          'POST /login - Iniciar sesión',
          'POST /registro - Registrar nuevo usuario',
          'POST /recuperar-contrasena/solicitar - Solicitar recuperación',
          'POST /recuperar-contrasena/verificar - Verificar código',
          'POST /recuperar-contrasena/restablecer - Restablecer contraseña',
          'POST /cambiar-contrasena - Cambiar contraseña',
          'POST /verificar - Verificar token'
        ]
      },
      usuarios: {
        base: '/api/usuario',
        descripcion: 'Gestión de perfiles de usuario',
        rutas: [
          'GET /perfil - Obtener perfil del usuario',
          'PUT /perfil - Actualizar perfil'
        ]
      },
      info_adulto: {
        base: '/api/info-adulto',
        descripcion: 'Información del adulto mayor',
        rutas: [
          'POST /principal - Obtener adulto principal',
          'POST /completa - Información completa',
          'POST /enfermedades - Listar enfermedades',
          'POST /alergias - Listar alergias',
          'POST /exportar-pdf - Exportar a PDF'
        ]
      },
      medicinas: {
        base: '/api/medicinas',
        descripcion: 'Gestión de medicamentos',
        rutas: [
          'POST /todas - Todas las medicinas',
          'POST /hoy - Medicinas para hoy',
          'POST /crear - Crear nueva medicina',
          'POST /marcar-tomada - Marcar como tomada',
          'POST /estadisticas - Estadísticas de medicación'
        ]
      },
      calendario: {
        base: '/api/calendario',
        descripcion: 'Gestión de eventos y calendario',
        rutas: [
          'POST /eventos - Obtener eventos',
          'POST /crear-evento - Crear evento',
          'POST /eventos-hoy - Eventos de hoy',
          'PUT /actualizar-evento/:id - Actualizar evento',
          'DELETE /eliminar-evento/:id - Eliminar evento'
        ]
      },
      horario: {
        base: '/api/horario',
        descripcion: 'Gestión de horarios y actividades',
        rutas: [
          'POST /actividades-hoy - Actividades de hoy',
          'POST /crear-actividad - Crear actividad',
          'POST /actividades-semana - Actividades de la semana'
        ]
      },
      gastos: {
        base: '/api/gastos',
        descripcion: 'Gestión de gastos y finanzas',
        rutas: [
          'POST /crear - Crear gasto',
          'POST /futuros - Gastos futuros',
          'POST /mes-actual - Gastos del mes',
          'POST /distribucion - Distribución de gastos',
          'POST /aportes-mes - Aportes del mes'
        ]
      },
      familia: {
        base: '/api/familia',
        descripcion: 'Gestión familiar y grupos',
        rutas: [
          'POST /grupo-familiar - Obtener grupo familiar',
          'POST /codigo-familiar - Obtener código familiar',
          'POST /agregar-familiar - Agregar familiar',
          'POST /adulto-mayor - Info del adulto mayor'
        ]
      },
      preferencias: {
        base: '/api/preferencias',
        descripcion: 'Preferencias y configuración del usuario',
        rutas: [
          'POST /informacion-usuario - Info del usuario',
          'PUT /actualizar-usuario - Actualizar usuario',
          'POST /telefonos - Teléfonos del usuario',
          'POST /preferencias - Preferencias del usuario'
        ]
      }
    },
    formatos_respuesta: {
      exito: {
        exito: true,
        datos: { /* datos específicos */ },
        mensaje: 'Mensaje opcional'
      },
      error: {
        exito: false,
        error: 'Descripción del error',
        codigo: 'CÓDIGO_DEL_ERROR',
        detalles: 'Detalles adicionales opcionales'
      }
    },
    autenticacion: 'Bearer token en header Authorization',
    rate_limiting: '100 peticiones por minuto por IP',
    soporte: 'soporte@cuidame-app.com'
  });
});

// ========== 7. MONTAR RUTAS PRINCIPALES ==========
console.log('\n🔧 MONTANDO RUTAS DE LA API...');

// Autenticación
app.use('/api/auth', rutasAutenticacion);
console.log('✅ Rutas montadas en /api/auth');

// Usuarios
app.use('/api/usuario', rutasUsuario);
console.log('✅ Rutas montadas en /api/usuario');

// Información del adulto mayor
app.use('/api/info-adulto', rutasInfoAdulto);
console.log('✅ Rutas montadas en /api/info-adulto');

// Medicinas
app.use('/api/medicinas', rutasMedicinas);
console.log('✅ Rutas montadas en /api/medicinas');

// Calendario (eventos)
app.use('/api/calendario', rutasCalendario);
console.log('✅ Rutas montadas en /api/calendario');

// Horario (actividades)
app.use('/api/horario', rutasHorario);
console.log('✅ Rutas montadas en /api/horario');

// Gastos
app.use('/api/gastos', rutasGastos);
console.log('✅ Rutas montadas en /api/gastos');

// Familia
app.use('/api/familia', rutasFamilia);
console.log('✅ Rutas montadas en /api/familia');

// Preferencias
app.use('/api/preferencias', rutasPreferencias);
console.log('✅ Rutas montadas en /api/preferencias');

// ========== 8. SERVIR ARCHIVOS ESTÁTICOS ==========
const directoriosEstaticos = [
  { path: 'uploads', endpoint: '/uploads' },
  { path: 'public', endpoint: '/public' },
  { path: 'documentos', endpoint: '/docs' }
];

directoriosEstaticos.forEach(dir => {
  const dirPath = path.join(__dirname, dir.path);
  if (fs.existsSync(dirPath)) {
    app.use(dir.endpoint, express.static(dirPath));
    console.log(`📁 Serviendo archivos estáticos desde ${dir.endpoint}`);
  } else {
    console.log(`📁 Directorio no encontrado: ${dir.path} (${dir.endpoint} no estará disponible)`);
  }
});

// ========== 9. MIDDLEWARE PARA ERRORES 404 ==========
app.use((req, res, next) => {
  console.log(`❌ 404 - Ruta no encontrada: ${req.method} ${req.originalUrl}`);
  
  res.status(404).json({
    exito: false,
    error: 'Ruta no encontrada',
    codigo: 'RUTA_NO_ENCONTRADA',
    ruta_solicitada: req.originalUrl,
    metodo: req.method,
    sugerencias: [
      'Verifica la URL completa',
      'Revisa la documentación en /api-docs',
      'Asegúrate de que el método HTTP sea correcto'
    ],
    rutas_disponibles: [
      '/api/auth/* - Autenticación',
      '/api/usuario/* - Usuarios',
      '/api/info-adulto/* - Info adulto mayor',
      '/api/medicinas/* - Medicamentos',
      '/api/calendario/* - Calendario',
      '/api/horario/* - Horarios',
      '/api/gastos/* - Gastos',
      '/api/familia/* - Familia',
      '/api/preferencias/* - Preferencias',
      '/test - Prueba de conexión',
      '/health - Estado del sistema',
      '/api-docs - Documentación'
    ]
  });
});

// ========== 10. MIDDLEWARE DE MANEJO DE ERRORES ==========
app.use((err, req, res, next) => {
  console.error('🔥 ERROR EN LA API:', {
    mensaje: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    ruta: req.path,
    metodo: req.method,
    timestamp: new Date().toISOString(),
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  // Errores de validación de JSON
  if (err.message === 'JSON inválido') {
    return res.status(400).json({
      exito: false,
      error: 'JSON inválido en el cuerpo de la petición',
      codigo: 'JSON_INVALIDO',
      sugerencia: 'Verifica el formato JSON de tu petición'
    });
  }
  
  // Errores de CORS
  if (err.message === 'Origen no permitido por CORS') {
    return res.status(403).json({
      exito: false,
      error: 'Origen no permitido',
      codigo: 'CORS_ERROR',
      origen_solicitado: req.get('Origin')
    });
  }
  
  // Error genérico
  const statusCode = err.statusCode || err.status || 500;
  const respuestaError = {
    exito: false,
    error: process.env.NODE_ENV === 'development' ? err.message : 'Error interno del servidor',
    codigo: err.code || 'ERROR_INTERNO'
  };
  
  // Agregar detalles en desarrollo
  if (process.env.NODE_ENV === 'development' && err.stack) {
    respuestaError.stack = err.stack;
  }
  
  // Agregar ID de error para tracking
  const errorId = Date.now().toString(36) + Math.random().toString(36).substr(2);
  respuestaError.error_id = errorId;
  
  console.error(`📋 Error ID: ${errorId}`);
  
  res.status(statusCode).json(respuestaError);
});

// ========== 11. FUNCIÓN PARA INICIAR EL SERVIDOR ==========
const iniciarServidor = async () => {
  try {
    console.log('\n🔗 VERIFICANDO CONEXIÓN A BASE DE DATOS...');
    const dbStatus = await verificarConexionDB(3);
    
    if (!dbStatus.connected) {
      console.error('❌ ERROR CRÍTICO: No se pudo conectar a la base de datos');
      console.error('   Detalles:', dbStatus.error);
      
      // En desarrollo, podemos continuar sin BD para pruebas
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️  Modo desarrollo: Continuando sin conexión a BD (pruebas)');
      } else {
        throw new Error('Conexión a base de datos fallida');
      }
    }
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log('\n' + '='.repeat(70));
      console.log('🎉 API CUIDAME INICIADA CORRECTAMENTE');
      console.log('='.repeat(70));
      console.log(`📍 Puerto: ${PORT}`);
      console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 URL Base: http://localhost:${PORT}`);
      console.log(`🗄️  Base de datos: ${dbStatus.connected ? '✅ Conectada' : '❌ Desconectada'}`);
      
      console.log('\n📡 ENDPOINTS PRINCIPALES:');
      console.log(`   🏓  GET  /test          - Prueba de conexión`);
      console.log(`   🩺  GET  /health        - Estado del sistema`);
      console.log(`   📖  GET  /api-docs      - Documentación completa`);
      console.log(`   🔐  POST /api/auth/login - Iniciar sesión`);
      console.log(`   👴  POST /api/info-adulto/principal - Info adulto mayor`);
      console.log(`   💊  POST /api/medicinas/hoy - Medicinas para hoy`);
      console.log(`   📅  POST /api/calendario/eventos-hoy - Eventos de hoy`);
      console.log(`   💰  POST /api/gastos/mes-actual - Gastos del mes`);
      console.log(`   👨‍👩‍👧‍👦 POST /api/familia/grupo-familiar - Grupo familiar`);
      console.log('='.repeat(70));
      console.log('\n💡 Tips:');
      console.log('   • Usa /api-docs para ver todas las rutas disponibles');
      console.log('   • Los logs muestran emojis para identificar tipos de peticiones');
      console.log('   • En desarrollo, se muestran los cuerpos de las peticiones (sin datos sensibles)');
      console.log('='.repeat(70));
    });
    
    // Manejo de señales para apagado elegante
    process.on('SIGTERM', () => {
      console.log('\n🛑 Recibida señal SIGTERM. Apagando servidor...');
      process.exit(0);
    });
    
    process.on('SIGINT', () => {
      console.log('\n🛑 Recibida señal SIGINT (Ctrl+C). Apagando servidor...');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ ERROR AL INICIAR EL SERVIDOR:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
};

// ========== 12. INICIAR EL SERVIDOR ==========
if (process.env.NODE_ENV !== 'test') {
  iniciarServidor();
}

// ========== 13. EXPORTACIÓN PARA PRUEBAS ==========
export { app };
export default app;