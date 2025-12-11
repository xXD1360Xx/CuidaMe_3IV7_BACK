// controladores/gastosControlador.js - Controlador de Gastos Unificado
import { pool } from '../configuracion/basedeDatos.js';

// ==================== FUNCIONES DE GASTOS - CRUD BÁSICO ====================

/**
 * 1. Crear nuevo gasto
 */
export const crearGasto = async (usuarioId, datosGasto) => {
  let client;
  
  try {
    console.log('💰 [GASTOS] Creando nuevo gasto para usuario ID:', usuarioId);
    
    const {
      descripcion,
      monto,
      fecha,
      categoria = 'medicina',
      prioridad = 'media',
      estado = 'pendiente',
      notas,
      compartido = true,
      responsableId
    } = datosGasto;
    
    // Validaciones
    if (!descripcion || !monto || !fecha) {
      return { 
        exito: false, 
        error: 'Faltan campos requeridos: descripción, monto, fecha',
        codigo: 'DATOS_INCOMPLETOS'
      };
    }
    
    if (parseFloat(monto) <= 0) {
      return { 
        exito: false, 
        error: 'El monto debe ser mayor a 0',
        codigo: 'MONTO_INVALIDO'
      };
    }
    
    client = await pool.connect();
    
    // Obtener adulto mayor principal del usuario
    const adultoMayorQuery = `
      SELECT am.id 
      FROM adultos_mayores am
      INNER JOIN familiares f ON am.id = f.adulto_mayor_id
      WHERE f.usuario_id = $1
      ORDER BY f.es_principal DESC
      LIMIT 1
    `;
    
    const adultoMayorResult = await client.query(adultoMayorQuery, [usuarioId]);
    
    if (adultoMayorResult.rows.length === 0) {
      return { 
        exito: false, 
        error: 'No se encontró un adulto mayor asociado',
        codigo: 'ADULTO_NO_ENCONTRADO'
      };
    }
    
    const adulto_mayor_id = adultoMayorResult.rows[0].id;
    
    const query = `
      INSERT INTO gastos (
        descripcion, monto, fecha, categoria, prioridad, 
        estado, notas, compartido, creado_por, adulto_mayor_id, responsable_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    
    const values = [
      descripcion.trim(),
      parseFloat(monto),
      fecha,
      categoria,
      prioridad,
      estado,
      notas || null,
      compartido,
      usuarioId,
      adulto_mayor_id,
      responsableId || null
    ];
    
    const result = await client.query(query, values);
    
    console.log('✅ Gasto creado exitosamente ID:', result.rows[0].id);
    
    return {
      exito: true,
      mensaje: 'Gasto creado exitosamente',
      gasto: result.rows[0]
    };
    
  } catch (error) {
    console.error('❌ Error en crearGasto:', error.message);
    
    if (error.code === '23505') {
      return { 
        exito: false, 
        error: 'El gasto ya existe',
        codigo: 'GASTO_DUPLICADO'
      };
    }
    
    return { 
      exito: false, 
      error: 'Error del servidor al crear gasto',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 2. Obtener gastos futuros
 */
export const obtenerGastosFuturos = async (usuarioId) => {
  let client;
  
  try {
    console.log('📅 [GASTOS] Obteniendo gastos futuros para usuario ID:', usuarioId);
    
    const hoy = new Date().toISOString().split('T')[0];
    
    client = await pool.connect();
    
    const query = `
      SELECT g.*, 
             u_creador.nombre as creador_nombre,
             u_creador.apellido as creador_apellido,
             u_resp.nombre as responsable_nombre,
             u_resp.apellido as responsable_apellido,
             COUNT(ag.id) as total_aportes,
             COALESCE(SUM(ag.monto), 0) as total_aportado
      FROM gastos g
      LEFT JOIN usuarios u_creador ON g.creado_por = u_creador.id
      LEFT JOIN usuarios u_resp ON g.responsable_id = u_resp.id
      LEFT JOIN aportes_gastos ag ON g.id = ag.gasto_id
      WHERE g.adulto_mayor_id IN (
        SELECT adulto_mayor_id FROM familiares WHERE usuario_id = $1
      )
      AND g.fecha >= $2
      AND g.deleted_at IS NULL
      GROUP BY g.id, u_creador.id, u_resp.id
      ORDER BY g.fecha ASC, g.prioridad DESC
    `;
    
    const result = await client.query(query, [usuarioId, hoy]);
    
    // Calcular si está cubierto (total aportado >= monto)
    const gastosConEstado = result.rows.map(gasto => ({
      ...gasto,
      estado_calculado: parseFloat(gasto.total_aportado || 0) >= parseFloat(gasto.monto) ? 'cubierto' : 'pendiente'
    }));
    
    console.log(`✅ Encontrados ${result.rows.length} gastos futuros`);
    
    return {
      exito: true,
      gastos: gastosConEstado,
      total: result.rows.length
    };
    
  } catch (error) {
    console.error('❌ Error en obtenerGastosFuturos:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al obtener gastos futuros',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 3. Obtener gastos del mes actual
 */
export const obtenerGastosMesActual = async (usuarioId) => {
  let client;
  
  try {
    console.log('📊 [GASTOS] Obteniendo gastos del mes actual para usuario ID:', usuarioId);
    
    const hoy = new Date();
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
    const ultimoDiaMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).toISOString().split('T')[0];
    
    client = await pool.connect();
    
    const query = `
      SELECT g.*, 
             u_creador.nombre as creador_nombre,
             u_creador.apellido as creador_apellido,
             u_resp.nombre as responsable_nombre,
             u_resp.apellido as responsable_apellido,
             COUNT(ag.id) as total_aportes,
             COALESCE(SUM(ag.monto), 0) as total_aportado
      FROM gastos g
      LEFT JOIN usuarios u_creador ON g.creado_por = u_creador.id
      LEFT JOIN usuarios u_resp ON g.responsable_id = u_resp.id
      LEFT JOIN aportes_gastos ag ON g.id = ag.gasto_id
      WHERE g.adulto_mayor_id IN (
        SELECT adulto_mayor_id FROM familiares WHERE usuario_id = $1
      )
      AND g.fecha BETWEEN $2 AND $3
      AND g.deleted_at IS NULL
      GROUP BY g.id, u_creador.id, u_resp.id
      ORDER BY g.fecha DESC
    `;
    
    const result = await client.query(query, [usuarioId, primerDiaMes, ultimoDiaMes]);
    
    // Calcular totales
    const totalGastos = result.rows.reduce((sum, gasto) => sum + parseFloat(gasto.monto || 0), 0);
    const totalAportado = result.rows.reduce((sum, gasto) => sum + parseFloat(gasto.total_aportado || 0), 0);
    const totalPendiente = totalGastos - totalAportado;
    
    console.log(`✅ Encontrados ${result.rows.length} gastos del mes actual`);
    
    return {
      exito: true,
      gastos: result.rows,
      total: result.rows.length,
      estadisticas: {
        total_gastos: totalGastos.toFixed(2),
        total_aportado: totalAportado.toFixed(2),
        total_pendiente: totalPendiente.toFixed(2),
        porcentaje_aportado: totalGastos > 0 ? ((totalAportado / totalGastos) * 100).toFixed(2) : 0
      }
    };
    
  } catch (error) {
    console.error('❌ Error en obtenerGastosMesActual:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al obtener gastos del mes',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 4. Obtener gastos pasados (historial)
 */
export const obtenerGastosPasados = async (usuarioId, limite = 50) => {
  let client;
  
  try {
    console.log('📜 [GASTOS] Obteniendo historial de gastos para usuario ID:', usuarioId);
    
    const hoy = new Date().toISOString().split('T')[0];
    
    client = await pool.connect();
    
    const query = `
      SELECT g.*, 
             u_creador.nombre as creador_nombre,
             u_creador.apellido as creador_apellido,
             u_resp.nombre as responsable_nombre,
             u_resp.apellido as responsable_apellido,
             COUNT(ag.id) as total_aportes,
             COALESCE(SUM(ag.monto), 0) as total_aportado
      FROM gastos g
      LEFT JOIN usuarios u_creador ON g.creado_por = u_creador.id
      LEFT JOIN usuarios u_resp ON g.responsable_id = u_resp.id
      LEFT JOIN aportes_gastos ag ON g.id = ag.gasto_id
      WHERE g.adulto_mayor_id IN (
        SELECT adulto_mayor_id FROM familiares WHERE usuario_id = $1
      )
      AND g.fecha < $2
      AND g.deleted_at IS NULL
      GROUP BY g.id, u_creador.id, u_resp.id
      ORDER BY g.fecha DESC
      LIMIT $3
    `;
    
    const result = await client.query(query, [usuarioId, hoy, limite]);
    
    console.log(`✅ Encontrados ${result.rows.length} gastos en historial`);
    
    return {
      exito: true,
      gastos: result.rows,
      total: result.rows.length
    };
    
  } catch (error) {
    console.error('❌ Error en obtenerGastosPasados:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al obtener historial de gastos',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 5. Obtener gasto por ID
 */
export const obtenerGastoPorId = async (gastoId, usuarioId) => {
  let client;
  
  try {
    console.log('🔍 [GASTOS] Obteniendo gasto ID:', gastoId, 'para usuario ID:', usuarioId);
    
    client = await pool.connect();
    
    const query = `
      SELECT g.*, 
             u_creador.nombre as creador_nombre,
             u_creador.apellido as creador_apellido,
             u_resp.nombre as responsable_nombre,
             u_resp.apellido as responsable_apellido,
             am.nombre as adulto_mayor_nombre,
             am.apellido as adulto_mayor_apellido
      FROM gastos g
      LEFT JOIN usuarios u_creador ON g.creado_por = u_creador.id
      LEFT JOIN usuarios u_resp ON g.responsable_id = u_resp.id
      LEFT JOIN adultos_mayores am ON g.adulto_mayor_id = am.id
      WHERE g.id = $1
      AND g.deleted_at IS NULL
      AND g.adulto_mayor_id IN (
        SELECT adulto_mayor_id FROM familiares WHERE usuario_id = $2
      )
    `;
    
    const result = await client.query(query, [gastoId, usuarioId]);
    
    if (result.rows.length === 0) {
      return { 
        exito: false, 
        error: 'Gasto no encontrado o no tienes permiso para verlo',
        codigo: 'GASTO_NO_ENCONTRADO'
      };
    }
    
    // Obtener aportes para este gasto
    const aportesQuery = `
      SELECT ag.*, u.nombre, u.apellido, u.email
      FROM aportes_gastos ag
      LEFT JOIN usuarios u ON ag.usuario_id = u.id
      WHERE ag.gasto_id = $1
      ORDER BY ag.created_at DESC
    `;
    
    const aportesResult = await client.query(aportesQuery, [gastoId]);
    
    const gasto = result.rows[0];
    gasto.aportes = aportesResult.rows;
    
    // Calcular total aportado
    gasto.total_aportado = aportesResult.rows.reduce((sum, aporte) => 
      sum + parseFloat(aporte.monto || 0), 0
    );
    gasto.saldo_pendiente = parseFloat(gasto.monto) - gasto.total_aportado;
    gasto.porcentaje_cubierto = parseFloat(gasto.monto) > 0 ? 
      ((gasto.total_aportado / parseFloat(gasto.monto)) * 100).toFixed(2) : 0;
    
    console.log('✅ Gasto encontrado:', gasto.descripcion);
    
    return {
      exito: true,
      gasto
    };
    
  } catch (error) {
    console.error('❌ Error en obtenerGastoPorId:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al obtener gasto',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 6. Actualizar gasto
 */
export const actualizarGasto = async (gastoId, usuarioId, datosActualizacion) => {
  let client;
  
  try {
    console.log('✏️ [GASTOS] Actualizando gasto ID:', gastoId, 'por usuario ID:', usuarioId);
    
    client = await pool.connect();
    
    // Verificar que el usuario puede editar este gasto
    const verificarQuery = `
      SELECT 1 FROM gastos 
      WHERE id = $1 
      AND (creado_por = $2 OR adulto_mayor_id IN (
        SELECT adulto_mayor_id FROM familiares WHERE usuario_id = $2
      ))
      AND deleted_at IS NULL
    `;
    
    const verificarResult = await client.query(verificarQuery, [gastoId, usuarioId]);
    
    if (verificarResult.rows.length === 0) {
      return { 
        exito: false, 
        error: 'No tienes permiso para editar este gasto',
        codigo: 'SIN_PERMISOS'
      };
    }
    
    // Construir query dinámica
    const campos = [];
    const valores = [];
    let index = 1;
    
    // Campos permitidos para actualizar
    const camposPermitidos = [
      'descripcion', 'monto', 'fecha', 'categoria', 'prioridad',
      'estado', 'notas', 'compartido', 'responsable_id'
    ];
    
    camposPermitidos.forEach(campo => {
      if (datosActualizacion[campo] !== undefined) {
        campos.push(`${campo} = $${index}`);
        
        // Parsear monto si es necesario
        if (campo === 'monto') {
          valores.push(parseFloat(datosActualizacion[campo]));
        } else {
          valores.push(datosActualizacion[campo]);
        }
        
        index++;
      }
    });
    
    if (campos.length === 0) {
      return { 
        exito: false, 
        error: 'No hay campos para actualizar',
        codigo: 'SIN_CAMPOS'
      };
    }
    
    // Agregar campo de actualización
    campos.push('actualizado_en = NOW()');
    
    // Agregar ID del gasto
    valores.push(gastoId);
    
    const query = `
      UPDATE gastos 
      SET ${campos.join(', ')}
      WHERE id = $${index}
      RETURNING *
    `;
    
    const result = await client.query(query, valores);
    
    console.log('✅ Gasto actualizado exitosamente');
    
    return {
      exito: true,
      mensaje: 'Gasto actualizado exitosamente',
      gasto: result.rows[0]
    };
    
  } catch (error) {
    console.error('❌ Error en actualizarGasto:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al actualizar gasto',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 7. Eliminar gasto (soft delete)
 */
export const eliminarGasto = async (gastoId, usuarioId) => {
  let client;
  
  try {
    console.log('🗑️ [GASTOS] Eliminando gasto ID:', gastoId, 'por usuario ID:', usuarioId);
    
    client = await pool.connect();
    
    // Verificar que el usuario puede eliminar este gasto
    const verificarQuery = `
      SELECT 1 FROM gastos 
      WHERE id = $1 
      AND (creado_por = $2 OR adulto_mayor_id IN (
        SELECT adulto_mayor_id FROM familiares WHERE usuario_id = $2
      ))
      AND deleted_at IS NULL
    `;
    
    const verificarResult = await client.query(verificarQuery, [gastoId, usuarioId]);
    
    if (verificarResult.rows.length === 0) {
      return { 
        exito: false, 
        error: 'No tienes permiso para eliminar este gasto',
        codigo: 'SIN_PERMISOS'
      };
    }
    
    const query = `
      UPDATE gastos 
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, descripcion
    `;
    
    const result = await client.query(query, [gastoId]);
    
    if (result.rows.length === 0) {
      return { 
        exito: false, 
        error: 'Gasto no encontrado',
        codigo: 'GASTO_NO_ENCONTRADO'
      };
    }
    
    console.log('✅ Gasto eliminado exitosamente:', result.rows[0].descripcion);
    
    return {
      exito: true,
      mensaje: 'Gasto eliminado exitosamente',
      gasto_id: result.rows[0].id
    };
    
  } catch (error) {
    console.error('❌ Error en eliminarGasto:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al eliminar gasto',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 8. Marcar gasto como pagado
 */
export const marcarGastoPagado = async (gastoId, usuarioId) => {
  let client;
  
  try {
    console.log('✅ [GASTOS] Marcando gasto como pagado ID:', gastoId, 'por usuario ID:', usuarioId);
    
    client = await pool.connect();
    
    // Verificar que el usuario puede marcar como pagado
    const verificarQuery = `
      SELECT 1 FROM gastos 
      WHERE id = $1 
      AND (creado_por = $2 OR adulto_mayor_id IN (
        SELECT adulto_mayor_id FROM familiares WHERE usuario_id = $2
      ))
      AND deleted_at IS NULL
    `;
    
    const verificarResult = await client.query(verificarQuery, [gastoId, usuarioId]);
    
    if (verificarResult.rows.length === 0) {
      return { 
        exito: false, 
        error: 'No tienes permiso para modificar este gasto',
        codigo: 'SIN_PERMISOS'
      };
    }
    
    const query = `
      UPDATE gastos 
      SET estado = 'pagado', actualizado_en = NOW()
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await client.query(query, [gastoId]);
    
    console.log('✅ Gasto marcado como pagado:', result.rows[0].descripcion);
    
    return {
      exito: true,
      mensaje: 'Gasto marcado como pagado',
      gasto: result.rows[0]
    };
    
  } catch (error) {
    console.error('❌ Error en marcarGastoPagado:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al marcar gasto como pagado',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

// ==================== FUNCIONES DE DISTRIBUCIONES Y PORCENTAJES ====================

/**
 * 9. Obtener distribución de porcentajes
 */
export const obtenerDistribucionPorcentajes = async (usuarioId) => {
  let client;
  
  try {
    console.log('📊 [GASTOS] Obteniendo distribución de porcentajes para usuario ID:', usuarioId);
    
    client = await pool.connect();
    
    // Obtener el adulto mayor principal del usuario
    const adultoMayorQuery = `
      SELECT am.id
      FROM adultos_mayores am
      INNER JOIN familiares f ON am.id = f.adulto_mayor_id
      WHERE f.usuario_id = $1
      ORDER BY f.es_principal DESC
      LIMIT 1
    `;
    
    const adultoMayorResult = await client.query(adultoMayorQuery, [usuarioId]);
    
    if (adultoMayorResult.rows.length === 0) {
      return {
        exito: true,
        distribucion: {},
        miembros: [],
        totalPorcentaje: 0,
        mensaje: 'No se encontró un adulto mayor asociado'
      };
    }
    
    const adulto_mayor_id = adultoMayorResult.rows[0].id;
    
    // Obtener distribución actual
    const query = `
      SELECT dg.usuario_id, dg.porcentaje, 
             u.nombre, u.apellido, u.email, u.telefono, u.rol
      FROM distribuciones_gastos dg
      INNER JOIN usuarios u ON dg.usuario_id = u.id
      WHERE dg.adulto_mayor_id = $1
      AND u.deleted_at IS NULL
      ORDER BY dg.porcentaje DESC
    `;
    
    const result = await client.query(query, [adulto_mayor_id]);
    
    // Si no hay distribución, obtener familiares del adulto mayor
    if (result.rows.length === 0) {
      const familiaresQuery = `
        SELECT u.id as usuario_id, u.nombre, u.apellido, u.email, u.telefono, u.rol
        FROM familiares f
        INNER JOIN usuarios u ON f.usuario_id = u.id
        WHERE f.adulto_mayor_id = $1
        AND u.deleted_at IS NULL
        ORDER BY u.nombre
      `;
      
      const familiaresResult = await client.query(familiaresQuery, [adulto_mayor_id]);
      
      const distribucion = {};
      const miembros = familiaresResult.rows.map(familiar => ({
        usuario_id: familiar.usuario_id,
        nombre: familiar.nombre,
        apellido: familiar.apellido,
        email: familiar.email,
        telefono: familiar.telefono,
        rol: familiar.rol,
        porcentaje: 0
      }));
      
      return {
        exito: true,
        distribucion,
        miembros,
        totalPorcentaje: 0,
        mensaje: 'No hay distribución configurada'
      };
    }
    
    // Calcular total
    const totalPorcentaje = result.rows.reduce((total, item) => 
      total + parseFloat(item.porcentaje || 0), 0
    );
    
    // Formatear distribución
    const distribucion = {};
    const miembros = [];
    
    result.rows.forEach(item => {
      distribucion[item.usuario_id] = parseFloat(item.porcentaje);
      miembros.push({
        usuario_id: item.usuario_id,
        nombre: item.nombre,
        apellido: item.apellido,
        email: item.email,
        telefono: item.telefono,
        rol: item.rol,
        porcentaje: parseFloat(item.porcentaje)
      });
    });
    
    console.log(`✅ Distribución encontrada: ${result.rows.length} miembros, total: ${totalPorcentaje.toFixed(2)}%`);
    
    return {
      exito: true,
      distribucion,
      miembros,
      totalPorcentaje: parseFloat(totalPorcentaje.toFixed(2)),
      adulto_mayor_id
    };
    
  } catch (error) {
    console.error('❌ Error en obtenerDistribucionPorcentajes:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al obtener distribución',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 10. Guardar distribución de porcentajes
 */
export const guardarDistribucionPorcentajes = async (usuarioId, porcentajes) => {
  let client;
  
  try {
    console.log('💾 [GASTOS] Guardando distribución de porcentajes por usuario ID:', usuarioId);
    
    if (!porcentajes || typeof porcentajes !== 'object') {
      return { 
        exito: false, 
        error: 'Formato de porcentajes inválido',
        codigo: 'FORMATO_INVALIDO'
      };
    }
    
    client = await pool.connect();
    
    // Obtener el adulto mayor principal del usuario
    const adultoMayorQuery = `
      SELECT am.id
      FROM adultos_mayores am
      INNER JOIN familiares f ON am.id = f.adulto_mayor_id
      WHERE f.usuario_id = $1
      ORDER BY f.es_principal DESC
      LIMIT 1
    `;
    
    const adultoMayorResult = await client.query(adultoMayorQuery, [usuarioId]);
    
    if (adultoMayorResult.rows.length === 0) {
      return { 
        exito: false, 
        error: 'No se encontró un adulto mayor asociado',
        codigo: 'ADULTO_NO_ENCONTRADO'
      };
    }
    
    const adulto_mayor_id = adultoMayorResult.rows[0].id;
    
    // Verificar que el usuario es administrador
    const esAdminQuery = `
      SELECT 1 FROM familiares 
      WHERE usuario_id = $1 
      AND adulto_mayor_id = $2
      AND (rol = 'familiar_admin' OR es_principal = true)
    `;
    
    const esAdminResult = await client.query(esAdminQuery, [usuarioId, adulto_mayor_id]);
    
    if (esAdminResult.rows.length === 0) {
      return { 
        exito: false, 
        error: 'Solo el administrador puede configurar la distribución',
        codigo: 'NO_ADMIN'
      };
    }
    
    // Verificar que el total sea 100%
    const total = Object.values(porcentajes).reduce((sum, val) => 
      sum + parseFloat(val || 0), 0
    );
    
    if (Math.abs(total - 100) > 0.01) {
      return { 
        exito: false, 
        error: `La suma de porcentajes debe ser 100%. Actual: ${total.toFixed(2)}%`,
        codigo: 'PORCENTAJE_INVALIDO'
      };
    }
    
    // Usar transacción para asegurar consistencia
    await client.query('BEGIN');
    
    try {
      // Eliminar distribución existente
      await client.query(
        'DELETE FROM distribuciones_gastos WHERE adulto_mayor_id = $1',
        [adulto_mayor_id]
      );
      
      // Insertar nueva distribución
      for (const [usuarioIdDist, porcentaje] of Object.entries(porcentajes)) {
        const porcentajeNum = parseFloat(porcentaje);
        
        if (porcentajeNum < 0 || porcentajeNum > 100) {
          throw new Error(`Porcentaje inválido: ${porcentajeNum}%`);
        }
        
        // Verificar que el usuario es familiar del adulto mayor
        const usuarioValidoQuery = `
          SELECT 1 FROM familiares 
          WHERE usuario_id = $1 
          AND adulto_mayor_id = $2
        `;
        const usuarioValidoResult = await client.query(usuarioValidoQuery, [usuarioIdDist, adulto_mayor_id]);
        
        if (usuarioValidoResult.rows.length === 0) {
          throw new Error(`El usuario ID ${usuarioIdDist} no es familiar de este adulto mayor`);
        }
        
        await client.query(`
          INSERT INTO distribuciones_gastos (adulto_mayor_id, usuario_id, porcentaje)
          VALUES ($1, $2, $3)
        `, [adulto_mayor_id, usuarioIdDist, porcentajeNum]);
      }
      
      await client.query('COMMIT');
      
      console.log('✅ Distribución guardada exitosamente');
      
      return {
        exito: true,
        mensaje: 'Distribución guardada exitosamente',
        adulto_mayor_id
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('❌ Error en guardarDistribucionPorcentajes:', error.message);
    
    if (error.message.includes('Porcentaje inválido') || error.message.includes('no es familiar')) {
      return { 
        exito: false, 
        error: error.message,
        codigo: 'DATOS_INVALIDOS'
      };
    }
    
    return { 
      exito: false, 
      error: 'Error del servidor al guardar distribución',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

// ==================== FUNCIONES DE APORTES Y PAGOS ====================

/**
 * 11. Obtener aportes del mes actual
 */
export const obtenerAportesMesActual = async (usuarioId) => {
  let client;
  
  try {
    console.log('💵 [GASTOS] Obteniendo aportes del mes actual para usuario ID:', usuarioId);
    
    const hoy = new Date();
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
    const ultimoDiaMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).toISOString().split('T')[0];
    
    client = await pool.connect();
    
    const query = `
      SELECT ag.*, 
             u.nombre, u.apellido, u.email,
             g.descripcion as gasto_descripcion,
             g.monto as gasto_monto,
             g.estado as gasto_estado,
             g.fecha as gasto_fecha
      FROM aportes_gastos ag
      INNER JOIN usuarios u ON ag.usuario_id = u.id
      LEFT JOIN gastos g ON ag.gasto_id = g.id
      WHERE ag.fecha_aporte BETWEEN $1 AND $2
      AND g.adulto_mayor_id IN (
        SELECT adulto_mayor_id FROM familiares WHERE usuario_id = $3
      )
      AND ag.deleted_at IS NULL
      ORDER BY ag.fecha_aporte DESC, ag.created_at DESC
    `;
    
    const result = await client.query(query, [primerDiaMes, ultimoDiaMes, usuarioId]);
    
    // Calcular totales
    const totalAportado = result.rows.reduce((sum, aporte) => 
      sum + parseFloat(aporte.monto || 0), 0
    );
    
    // Agrupar por usuario
    const aportesPorUsuario = {};
    result.rows.forEach(aporte => {
      if (!aportesPorUsuario[aporte.usuario_id]) {
        aportesPorUsuario[aporte.usuario_id] = {
          usuario_id: aporte.usuario_id,
          nombre: aporte.nombre,
          apellido: aporte.apellido,
          email: aporte.email,
          total_aportado: 0,
          aportes: []
        };
      }
      
      aportesPorUsuario[aporte.usuario_id].total_aportado += parseFloat(aporte.monto || 0);
      aportesPorUsuario[aporte.usuario_id].aportes.push(aporte);
    });
    
    console.log(`✅ Encontrados ${result.rows.length} aportes del mes actual`);
    
    return {
      exito: true,
      aportes: result.rows,
      total_aportado: totalAportado.toFixed(2),
      aportes_por_usuario: Object.values(aportesPorUsuario),
      total: result.rows.length
    };
    
  } catch (error) {
    console.error('❌ Error en obtenerAportesMesActual:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al obtener aportes',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 12. Registrar aporte a gasto
 */
export const registrarAporteGasto = async (gastoId, usuarioId, monto, notas = '') => {
  let client;
  
  try {
    console.log('💰 [GASTOS] Registrando aporte para gasto ID:', gastoId, 'por usuario ID:', usuarioId);
    
    if (!monto || parseFloat(monto) <= 0) {
      return { 
        exito: false, 
        error: 'El monto del aporte debe ser mayor a 0',
        codigo: 'MONTO_INVALIDO'
      };
    }
    
    client = await pool.connect();
    
    // Verificar que el gasto existe
    const gastoQuery = `
      SELECT g.*, am.id as adulto_mayor_id
      FROM gastos g
      INNER JOIN adultos_mayores am ON g.adulto_mayor_id = am.id
      WHERE g.id = $1
      AND g.deleted_at IS NULL
    `;
    
    const gastoResult = await client.query(gastoQuery, [gastoId]);
    
    if (gastoResult.rows.length === 0) {
      return { 
        exito: false, 
        error: 'Gasto no encontrado',
        codigo: 'GASTO_NO_ENCONTRADO'
      };
    }
    
    const gasto = gastoResult.rows[0];
    
    // Verificar que el usuario es familiar del adulto mayor
    const usuarioValidoQuery = `
      SELECT 1 FROM familiares 
      WHERE usuario_id = $1 
      AND adulto_mayor_id = $2
    `;
    
    const usuarioValidoResult = await client.query(usuarioValidoQuery, [usuarioId, gasto.adulto_mayor_id]);
    
    if (usuarioValidoResult.rows.length === 0) {
      return { 
        exito: false, 
        error: 'No tienes permiso para aportar a este gasto',
        codigo: 'SIN_PERMISOS'
      };
    }
    
    // Verificar si ya se cubrió el gasto completamente
    const aportesQuery = `
      SELECT COALESCE(SUM(monto), 0) as total_aportado
      FROM aportes_gastos
      WHERE gasto_id = $1
      AND deleted_at IS NULL
    `;
    
    const aportesResult = await client.query(aportesQuery, [gastoId]);
    const totalAportado = parseFloat(aportesResult.rows[0].total_aportado);
    const saldoPendiente = parseFloat(gasto.monto) - totalAportado;
    
    if (saldoPendiente <= 0) {
      return { 
        exito: false, 
        error: 'El gasto ya ha sido completamente cubierto',
        codigo: 'GASTO_CUBIERTO'
      };
    }
    
    // Verificar que el aporte no exceda el saldo pendiente
    const montoAporte = parseFloat(monto);
    if (montoAporte > saldoPendiente) {
      return { 
        exito: false, 
        error: `El aporte excede el saldo pendiente. Saldo: $${saldoPendiente.toFixed(2)}`,
        codigo: 'APORTE_EXCEDENTE'
      };
    }
    
    // Registrar el aporte
    const insertAporteQuery = `
      INSERT INTO aportes_gastos (gasto_id, usuario_id, monto, notas, fecha_aporte)
      VALUES ($1, $2, $3, $4, CURRENT_DATE)
      RETURNING *
    `;
    
    const aporteResult = await client.query(insertAporteQuery, [
      gastoId,
      usuarioId,
      montoAporte,
      notas.trim()
    ]);
    
    // Actualizar estado del gasto si se cubrió completamente
    const nuevoTotalAportado = totalAportado + montoAporte;
    if (Math.abs(parseFloat(gasto.monto) - nuevoTotalAportado) < 0.01) {
      await client.query(
        'UPDATE gastos SET estado = \'pagado\', actualizado_en = NOW() WHERE id = $1',
        [gastoId]
      );
      console.log('✅ Gasto marcado como completamente pagado');
    }
    
    // Registrar transacción en historial si existe la tabla
    try {
      const historialQuery = `
        INSERT INTO historial_transacciones (
          usuario_id, tipo, monto, descripcion, gasto_id, fecha
        ) VALUES ($1, 'aporte', $2, $3, $4, CURRENT_TIMESTAMP)
      `;
      
      await client.query(historialQuery, [
        usuarioId,
        montoAporte,
        `Aporte para gasto: ${gasto.descripcion}`,
        gastoId
      ]);
    } catch (historialError) {
      console.log('ℹ️ Tabla historial_transacciones no disponible, omitiendo registro');
    }
    
    console.log('✅ Aporte registrado exitosamente');
    
    return {
      exito: true,
      mensaje: 'Aporte registrado exitosamente',
      aporte: aporteResult.rows[0],
      saldo_anterior: saldoPendiente,
      saldo_actual: saldoPendiente - montoAporte,
      gasto_cubierto: Math.abs(parseFloat(gasto.monto) - nuevoTotalAportado) < 0.01
    };
    
  } catch (error) {
    console.error('❌ Error en registrarAporteGasto:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al registrar aporte',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 13. Obtener familiares del adulto mayor
 */
export const obtenerFamiliares = async (usuarioId) => {
  let client;
  
  try {
    console.log('👨‍👩‍👧‍👦 [GASTOS] Obteniendo familiares para usuario ID:', usuarioId);
    
    client = await pool.connect();
    
    // Obtener el adulto mayor principal del usuario
    const adultoMayorQuery = `
      SELECT am.id
      FROM adultos_mayores am
      INNER JOIN familiares f ON am.id = f.adulto_mayor_id
      WHERE f.usuario_id = $1
      ORDER BY f.es_principal DESC
      LIMIT 1
    `;
    
    const adultoMayorResult = await client.query(adultoMayorQuery, [usuarioId]);
    
    if (adultoMayorResult.rows.length === 0) {
      return {
        exito: true,
        familiares: [],
        mensaje: 'No se encontró un adulto mayor asociado'
      };
    }
    
    const adulto_mayor_id = adultoMayorResult.rows[0].id;
    
    // Obtener todos los familiares del adulto mayor
    const familiaresQuery = `
      SELECT 
        u.id,
        u.nombre,
        u.apellido,
        u.email,
        u.telefono,
        u.rol,
        f.es_principal,
        f.rol as rol_familiar,
        f.parentesco,
        f.fecha_registro
      FROM familiares f
      INNER JOIN usuarios u ON f.usuario_id = u.id
      WHERE f.adulto_mayor_id = $1
      AND u.deleted_at IS NULL
      ORDER BY f.es_principal DESC, u.nombre
    `;
    
    const result = await client.query(familiaresQuery, [adulto_mayor_id]);
    
    console.log(`✅ Encontrados ${result.rows.length} familiares`);
    
    return {
      exito: true,
      familiares: result.rows,
      adulto_mayor_id,
      total: result.rows.length
    };
    
  } catch (error) {
    console.error('❌ Error en obtenerFamiliares:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al obtener familiares',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 14. Calcular distribución sugerida
 */
export const calcularDistribucionSugerida = async (usuarioId) => {
  try {
    console.log('🧮 [GASTOS] Calculando distribución sugerida para usuario ID:', usuarioId);
    
    // Obtener gastos futuros
    const gastosFuturosResult = await obtenerGastosFuturos(usuarioId);
    if (!gastosFuturosResult.exito) {
      return gastosFuturosResult;
    }
    
    // Obtener distribución de porcentajes
    const distribucionResult = await obtenerDistribucionPorcentajes(usuarioId);
    if (!distribucionResult.exito) {
      return distribucionResult;
    }
    
    // Obtener aportes del mes
    const aportesResult = await obtenerAportesMesActual(usuarioId);
    
    // Calcular total de gastos futuros
    const totalGastosFuturos = gastosFuturosResult.gastos.reduce((total, gasto) => 
      total + parseFloat(gasto.monto || 0), 0
    );
    
    // Calcular distribución sugerida
    const distribucionSugerida = distribucionResult.miembros.map(familiar => {
      const porcentaje = familiar.porcentaje || 0;
      const montoSugerido = (totalGastosFuturos * porcentaje) / 100;
      
      // Calcular aportado este mes
      let aportado = 0;
      if (aportesResult.exito) {
        aportado = aportesResult.aportes
          .filter(aporte => aporte.usuario_id === familiar.usuario_id)
          .reduce((total, aporte) => total + parseFloat(aporte.monto || 0), 0);
      }
      
      const diferencia = montoSugerido - aportado;
      
      return {
        familiar_id: familiar.usuario_id,
        nombre: familiar.nombre,
        apellido: familiar.apellido,
        porcentaje,
        monto_sugerido: parseFloat(montoSugerido.toFixed(2)),
        aportado_mes: parseFloat(aportado.toFixed(2)),
        diferencia: parseFloat(diferencia.toFixed(2)),
        estado: diferencia >= 0 ? 'pendiente' : 'excedente'
      };
    });
    
    console.log('✅ Distribución sugerida calculada');
    
    return {
      exito: true,
      distribucion_sugerida: distribucionSugerida,
      total_gastos_futuros: parseFloat(totalGastosFuturos.toFixed(2)),
      total_aportado_mes: aportesResult.exito ? aportesResult.total_aportado : 0,
      saldo_total: parseFloat((totalGastosFuturos - (aportesResult.exito ? parseFloat(aportesResult.total_aportado) : 0)).toFixed(2))
    };
    
  } catch (error) {
    console.error('❌ Error en calcularDistribucionSugerida:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al calcular distribución sugerida',
      codigo: 'ERROR_SERVIDOR'
    };
  }
};

/**
 * 15. Generar reporte de gastos
 */
export const generarReporteGastos = async (usuarioId, tipoReporte = 'categoria', filtros = {}) => {
  let client;
  
  try {
    console.log('📈 [GASTOS] Generando reporte tipo:', tipoReporte, 'para usuario ID:', usuarioId);
    
    client = await pool.connect();
    
    // Obtener adulto mayor principal
    const adultoMayorQuery = `
      SELECT am.id
      FROM adultos_mayores am
      INNER JOIN familiares f ON am.id = f.adulto_mayor_id
      WHERE f.usuario_id = $1
      ORDER BY f.es_principal DESC
      LIMIT 1
    `;
    
    const adultoMayorResult = await client.query(adultoMayorQuery, [usuarioId]);
    
    if (adultoMayorResult.rows.length === 0) {
      return { 
        exito: false, 
        error: 'No se encontró un adulto mayor asociado',
        codigo: 'ADULTO_NO_ENCONTRADO'
      };
    }
    
    const adulto_mayor_id = adultoMayorResult.rows[0].id;
    
    let query;
    const values = [adulto_mayor_id];
    let paramIndex = 2;
    
    switch (tipoReporte) {
      case 'categoria':
        query = `
          SELECT 
            g.categoria,
            COUNT(*) as cantidad,
            SUM(g.monto) as total,
            SUM(CASE WHEN g.estado = 'pagado' THEN g.monto ELSE 0 END) as total_pagado,
            SUM(CASE WHEN g.estado = 'pendiente' THEN g.monto ELSE 0 END) as total_pendiente,
            ROUND((SUM(g.monto) / (SELECT SUM(monto) FROM gastos WHERE adulto_mayor_id = $1 AND deleted_at IS NULL)) * 100, 2) as porcentaje
          FROM gastos g
          WHERE g.adulto_mayor_id = $1
          AND g.deleted_at IS NULL
          GROUP BY g.categoria
          ORDER BY total DESC
        `;
        break;
        
      case 'mes':
        query = `
          SELECT 
            TO_CHAR(g.fecha, 'YYYY-MM') as mes,
            TO_CHAR(g.fecha, 'Month YYYY') as mes_nombre,
            COUNT(*) as cantidad,
            SUM(g.monto) as total,
            SUM(CASE WHEN g.estado = 'pagado' THEN g.monto ELSE 0 END) as total_pagado,
            SUM(CASE WHEN g.estado = 'pendiente' THEN g.monto ELSE 0 END) as total_pendiente
          FROM gastos g
          WHERE g.adulto_mayor_id = $1
          AND g.deleted_at IS NULL
          GROUP BY TO_CHAR(g.fecha, 'YYYY-MM'), TO_CHAR(g.fecha, 'Month YYYY')
          ORDER BY mes DESC
        `;
        break;
        
      case 'familiar':
        query = `
          SELECT 
            u.id as familiar_id,
            u.nombre,
            u.apellido,
            COUNT(DISTINCT g.id) as gastos_asignados,
            COALESCE(SUM(CASE WHEN g.estado = 'pagado' THEN g.monto ELSE 0 END), 0) as total_pagado,
            COALESCE(SUM(CASE WHEN g.estado = 'pendiente' THEN g.monto ELSE 0 END), 0) as total_pendiente,
            COALESCE(SUM(ag.monto), 0) as total_aportado
          FROM usuarios u
          LEFT JOIN gastos g ON u.id = g.responsable_id AND g.adulto_mayor_id = $1 AND g.deleted_at IS NULL
          LEFT JOIN aportes_gastos ag ON u.id = ag.usuario_id AND ag.gasto_id IN (
            SELECT id FROM gastos WHERE adulto_mayor_id = $1
          )
          WHERE u.id IN (
            SELECT usuario_id FROM familiares WHERE adulto_mayor_id = $1
          )
          AND u.deleted_at IS NULL
          GROUP BY u.id, u.nombre, u.apellido
          ORDER BY total_aportado DESC
        `;
        break;
        
      default:
        return { 
          exito: false, 
          error: 'Tipo de reporte no válido',
          codigo: 'TIPO_REPORTE_INVALIDO'
        };
    }
    
    const result = await client.query(query, values);
    
    console.log(`✅ Reporte generado: ${tipoReporte} (${result.rows.length} registros)`);
    
    return {
      exito: true,
      reporte: result.rows,
      tipo: tipoReporte,
      total_registros: result.rows.length,
      adulto_mayor_id
    };
    
  } catch (error) {
    console.error('❌ Error en generarReporteGastos:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al generar reporte',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

// ==================== FUNCIONES AUXILIARES ====================

/**
 * 16. Verificar permisos de administrador
 */
export const verificarEsAdministrador = async (usuarioId) => {
  let client;
  
  try {
    console.log('👑 [GASTOS] Verificando si usuario es administrador ID:', usuarioId);
    
    client = await pool.connect();
    
    const query = `
      SELECT 1 FROM familiares 
      WHERE usuario_id = $1 
      AND (rol = 'familiar_admin' OR es_principal = true)
    `;
    
    const result = await client.query(query, [usuarioId]);
    
    const esAdministrador = result.rows.length > 0;
    
    console.log(`✅ Usuario ${usuarioId} es administrador:`, esAdministrador);
    
    return {
      exito: true,
      es_administrador: esAdministrador
    };
    
  } catch (error) {
    console.error('❌ Error en verificarEsAdministrador:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al verificar permisos',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 17. Obtener estadísticas resumen
 */
export const obtenerEstadisticasResumen = async (usuarioId) => {
  try {
    console.log('📊 [GASTOS] Obteniendo estadísticas resumen para usuario ID:', usuarioId);
    
    // Obtener gastos futuros
    const gastosFuturosResult = await obtenerGastosFuturos(usuarioId);
    if (!gastosFuturosResult.exito) {
      return gastosFuturosResult;
    }
    
    // Obtener aportes del mes
    const aportesResult = await obtenerAportesMesActual(usuarioId);
    
    // Obtener distribución sugerida
    const distribucionResult = await calcularDistribucionSugerida(usuarioId);
    
    // Calcular totales
    const totalGastosFuturos = gastosFuturosResult.gastos.reduce((total, gasto) => 
      total + parseFloat(gasto.monto || 0), 0
    );
    
    const totalAportado = aportesResult.exito ? parseFloat(aportesResult.total_aportado || 0) : 0;
    const saldoPendiente = totalGastosFuturos - totalAportado;
    
    // Obtener categorías principales
    const categorias = {};
    gastosFuturosResult.gastos.forEach(gasto => {
      if (!categorias[gasto.categoria]) {
        categorias[gasto.categoria] = 0;
      }
      categorias[gasto.categoria] += parseFloat(gasto.monto || 0);
    });
    
    // Convertir categorías a array
    const categoriasArray = Object.entries(categorias).map(([nombre, total]) => ({
      nombre,
      total: parseFloat(total.toFixed(2))
    })).sort((a, b) => b.total - a.total);
    
    console.log('✅ Estadísticas resumen calculadas');
    
    return {
      exito: true,
      estadisticas: {
        total_gastos_futuros: parseFloat(totalGastosFuturos.toFixed(2)),
        total_aportado: parseFloat(totalAportado.toFixed(2)),
        saldo_pendiente: parseFloat(saldoPendiente.toFixed(2)),
        porcentaje_aportado: totalGastosFuturos > 0 ? 
          parseFloat(((totalAportado / totalGastosFuturos) * 100).toFixed(2)) : 0,
        total_gastos: gastosFuturosResult.total,
        categorias_principales: categoriasArray.slice(0, 5)
      },
      distribucion_sugerida: distribucionResult.exito ? distribucionResult.distribucion_sugerida : []
    };
    
  } catch (error) {
    console.error('❌ Error en obtenerEstadisticasResumen:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al obtener estadísticas',
      codigo: 'ERROR_SERVIDOR'
    };
  }
};

// ==================== EXPORTACIÓN ====================

export default {
  // CRUD de gastos
  crearGasto,
  obtenerGastosFuturos,
  obtenerGastosMesActual,
  obtenerGastosPasados,
  obtenerGastoPorId,
  actualizarGasto,
  eliminarGasto,
  marcarGastoPagado,
  
  // Distribuciones y porcentajes
  obtenerDistribucionPorcentajes,
  guardarDistribucionPorcentajes,
  
  // Aportes y pagos
  obtenerAportesMesActual,
  registrarAporteGasto,
  
  // Familiares
  obtenerFamiliares,
  
  // Cálculos y reportes
  calcularDistribucionSugerida,
  generarReporteGastos,
  
  // Utilidades
  verificarEsAdministrador,
  obtenerEstadisticasResumen
};