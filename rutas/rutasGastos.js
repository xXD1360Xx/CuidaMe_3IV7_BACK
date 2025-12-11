import express from 'express';
const router = express.Router();
import GastosControlador from '../controllers/gastosControlador.js';
import { verificarToken, verificarAdminFamiliar } from '../middlewares/authMiddleware.js';

// ======================= 🔐 MIDDLEWARE DE AUTENTICACIÓN =======================
// Todas las rutas de gastos requieren token válido
router.use(verificarToken);

// ======================= 📋 GASTOS - CRUD BÁSICO =======================

/**
 * @route   POST /api/gastos
 * @desc    Crear un nuevo gasto
 * @access  Privado (Familiar o Administrador)
 */
router.post('/', GastosControlador.crearGasto);

/**
 * @route   GET /api/gastos/futuros
 * @desc    Obtener gastos futuros (desde hoy en adelante)
 * @access  Privado (Familiar o Administrador)
 */
router.get('/futuros', GastosControlador.obtenerGastosFuturos);

/**
 * @route   GET /api/gastos/mes-actual
 * @desc    Obtener gastos del mes actual
 * @access  Privado (Familiar o Administrador)
 */
router.get('/mes-actual', GastosControlador.obtenerGastosMesActual);

/**
 * @route   GET /api/gastos/:id
 * @desc    Obtener un gasto específico por ID
 * @access  Privado (Familiar o Administrador)
 */
router.get('/:id', GastosControlador.obtenerGastoPorId);

/**
 * @route   PUT /api/gastos/:id
 * @desc    Actualizar un gasto existente
 * @access  Privado (Familiar o Administrador)
 */
router.put('/:id', GastosControlador.actualizarGasto);

/**
 * @route   DELETE /api/gastos/:id
 * @desc    Eliminar un gasto (soft delete)
 * @access  Privado (Solo Administrador Familiar)
 */
router.delete('/:id', verificarAdminFamiliar, GastosControlador.eliminarGasto);

/**
 * @route   PUT /api/gastos/:id/pagado
 * @desc    Marcar un gasto como pagado
 * @access  Privado (Solo Administrador Familiar)
 */
router.put('/:id/pagado', verificarAdminFamiliar, GastosControlador.marcarGastoPagado);

// ======================= 💰 DISTRIBUCIONES Y PORCENTAJES =======================

/**
 * @route   GET /api/gastos/distribucion
 * @desc    Obtener distribución de porcentajes por familiar
 * @access  Privado (Familiar o Administrador)
 */
router.get('/distribucion', GastosControlador.obtenerDistribucionPorcentajes);

/**
 * @route   POST /api/gastos/distribucion
 * @desc    Guardar/actualizar distribución de porcentajes
 * @access  Privado (Solo Administrador Familiar)
 */
router.post('/distribucion', verificarAdminFamiliar, GastosControlador.guardarDistribucionPorcentajes);

// ======================= 💵 APORTES Y PAGOS =======================

/**
 * @route   GET /api/gastos/aportes/mes-actual
 * @desc    Obtener aportes del mes actual
 * @access  Privado (Familiar o Administrador)
 */
router.get('/aportes/mes-actual', GastosControlador.obtenerAportesMesActual);

// Nota: Esta ruta NO está en tu api.js del frontend, pero es útil
// router.post('/aportes', GastosControlador.crearAporte);

// ======================= 📊 REPORTES Y ESTADÍSTICAS =======================

/**
 * @route   POST /api/gastos/reporte/:tipoReporte
 * @desc    Generar reporte de gastos
 * @access  Privado (Familiar o Administrador)
 */
router.post('/reporte/:tipoReporte', GastosControlador.generarReporteGastos);

// ======================= 📅 GASTOS POR FECHA =======================

/**
 * @route   GET /api/gastos/fecha/:fecha
 * @desc    Obtener gastos de una fecha específica
 * @access  Privado (Familiar o Administrador)
 */
router.get('/fecha/:fecha', GastosControlador.obtenerGastosPorFecha);

/**
 * @route   GET /api/gastos
 * @desc    Obtener todos los gastos con filtros opcionales
 * @access  Privado (Familiar o Administrador)
 */
router.get('/', GastosControlador.obtenerTodosGastos);

export default router;