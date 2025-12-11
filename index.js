// index.js - VERSIÓN PARA CUIDAME
import express from 'express';
import cors from 'cors';
import { verificarConexionDB } from './configuracion/basedeDatos.js';
import fs from 'fs';
import path from 'path';

// ========== 1. VERIFICAR VARIABLES NORTHFLANK ==========
console.log('\n🚀 ========== INICIANDO CUIDAME BACKEND ==========');
console.log('📦 Variables de entorno disponibles:');

// Verificar variables críticas para CuidaMe
const variablesCriticas = [
  'JWT_SECRETO',
  'DATABASE_URL',
  'PORT'
];

variablesCriticas.forEach(variable => {
  const valor = process.env[variable];
  if (valor) {
    if (variable.includes('SECRET') || variable.includes('KEY')) {
      console.log(`✅ ${variable}: ***PRESENTE*** (${valor.length} chars)`);
    } else {
      console.log(`✅ ${variable}: ${valor}`);
    }
  } else {
    console.error(`❌ ${variable}: NO ENCONTRADA en Northflank`);
  }
});

// ========== 2. IMPORTAR RUTAS DE CUIDAME ==========
console.log('\n🔗 IMPORTANDO RUTAS DE CUIDAME...');

// Importar todas las rutas de CuidaMe
import rutasAutenticacion from './rutas/rutasAutenticacion.js';
import rutasUsuario from './rutas/rutasUsuario.js';
import rutasGastos from './rutas/rutasGastos.js';
import rutasMedicinas from './rutas/rutasMedicinas.js';
import rutasEventos from './rutas/rutasEventos.js';
import rutasFamilia from './rutas/rutasFamilia.js';
import rutasProfesional from './rutas/rutasProfesional.js';
import rutasAnciano from './rutas/rutasAnciano.js';

console.log('✅ Todas las rutas importadas');

// ========== 3. CONFIGURAR EXPRESS ==========
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware personalizado para CuidaMe
app.use((req, res, next) => {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const emoji = {
    'GET': '📥',
    'POST': '📤',
    'PUT': '✏️',
    'DELETE': '🗑️',
    'PATCH': '🔧'
  }[req.method] || '🔍';
  
  console.log(`${emoji} [${timestamp}] ${req.method} ${req.originalUrl}`);
  next();
});

// ========== 4. RUTAS BÁSICAS DE SALUD ==========
app.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'API CuidaMe funcionando',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: 'cuida-me-backend'
  });
});

app.get('/health', async (req, res) => {
  try {
    const dbStatus = await verificarConexionDB(3);
    
    res.json({
      status: 'healthy',
      service: 'cuida-me-api',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: dbStatus.connected ? 'connected' : 'disconnected',
      memory: {
        heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`
      },
      uptime: `${Math.floor(process.uptime())}s`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Documentación de la API
app.get('/api-docs', (req, res) => {
  res.json({
    api: 'CuidaMe API',
    version: '1.0.0',
    endpoints: {
      auth: {
        base: '/api/auth',
        routes: [
          'POST /login',
          'POST /registro',
          'POST /recuperar-contrasena',
          'POST /cambiar-contrasena',
          'GET /verificar'
        ]
      },
      gastos: {
        base: '/api/gastos',
        routes: [
          'GET /futuros - Gastos futuros',
          'GET /mes-actual - Gastos del mes',
          'POST / - Crear gasto',
          'GET /distribucion - Distribución de porcentajes',
          'POST /distribucion - Guardar distribución',
          'GET /aportes/mes-actual - Aportes del mes'
        ]
      },
      medicinas: {
        base: '/api/medicinas',
        routes: [
          'GET /fecha/:fecha - Medicinas por fecha',
          'GET /frecuentes - Medicinas frecuentes',
          'POST / - Crear medicina'
        ]
      },
      eventos: {
        base: '/api/eventos',
        routes: [
          'GET / - Eventos por rango de fechas',
          'POST / - Crear evento'
        ]
      }
    }
  });
});

// ========== 5. MONTAR RUTAS PRINCIPALES DE CUIDAME ==========
console.log('\n🔧 Montando rutas de la API CuidaMe...');

app.use('/api/auth', rutasAutenticacion);
console.log('✅ Rutas montadas en /api/auth');

app.use('/api/usuarios', rutasUsuario);
console.log('✅ Rutas montadas en /api/usuarios');

app.use('/api/gastos', rutasGastos);
console.log('✅ Rutas montadas en /api/gastos');

app.use('/api/medicinas', rutasMedicinas);
console.log('✅ Rutas montadas en /api/medicinas');

app.use('/api/eventos', rutasEventos);
console.log('✅ Rutas montadas en /api/eventos');

app.use('/api/familia', rutasFamilia);
console.log('✅ Rutas montadas en /api/familia');

app.use('/api/profesional', rutasProfesional);
console.log('✅ Rutas montadas en /api/profesional');

app.use('/api/anciano', rutasAnciano);
console.log('✅ Rutas montadas en /api/anciano');

// ========== 6. SERVIR ARCHIVOS ESTÁTICOS (si necesitas) ==========
// Si tienes imágenes, documentos, etc.
const uploadsDir = path.join(process.cwd(), 'uploads');
if (fs.existsSync(uploadsDir)) {
  app.use('/uploads', express.static(uploadsDir));
  console.log('📁 Serviendo archivos estáticos desde /uploads');
}

// ========== 7. MIDDLEWARE DE ERRORES ==========
app.use((err, req, res, next) => {
  console.error('🔥 Error en CuidaMe API:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
  
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'development' ? err.message : 'Error interno del servidor',
    code: err.code || 'INTERNAL_ERROR'
  });
});

// ========== 8. RUTA DE FALLBACK ==========
app.use('*', (req, res) => {
  console.log(`❌ 404 - Ruta no encontrada: ${req.method} ${req.originalUrl}`);
  
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada',
    suggestions: [
      '/test - Verificar API',
      '/health - Estado del sistema',
      '/api-docs - Documentación',
      '/api/auth/login - Iniciar sesión',
      '/api/gastos/futuros - Gastos futuros'
    ],
    supported_routes: [
      '/api/auth/*',
      '/api/usuarios/*',
      '/api/gastos/*',
      '/api/medicinas/*',
      '/api/eventos/*',
      '/api/familia/*',
      '/api/profesional/*',
      '/api/anciano/*'
    ]
  });
});

// ========== 9. INICIAR SERVIDOR ==========
const iniciarServidor = async () => {
  try {
    console.log('\n🔗 Verificando conexión a base de datos...');
    const dbStatus = await verificarConexionDB(3);
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log('\n' + '='.repeat(60));
      console.log('🎉 CUIDAME BACKEND INICIADO');
      console.log('='.repeat(60));
      console.log(`📍 Puerto: ${PORT}`);
      console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🗄️  Base de datos: ${dbStatus.connected ? '✅ Conectada' : '❌ Desconectada'}`);
      
      console.log('\n📡 ENDPOINTS PRINCIPALES:');
      console.log(`   🏓  GET /test - Verificar API`);
      console.log(`   🩺  GET /health - Estado del sistema`);
      console.log(`   📖  GET /api-docs - Documentación`);
      console.log(`   🔐  POST /api/auth/login - Iniciar sesión`);
      console.log(`   💰  GET /api/gastos/futuros - Gastos futuros`);
      console.log(`   💊  GET /api/medicinas/fecha/:fecha - Medicinas por fecha`);
      console.log(`   📅  GET /api/eventos - Eventos del calendario`);
      console.log('='.repeat(60));
    });
  } catch (error) {
    console.error('❌ ERROR al iniciar servidor:', error.message);
    process.exit(1);
  }
};

// Iniciar servidor
iniciarServidor();

export default app;