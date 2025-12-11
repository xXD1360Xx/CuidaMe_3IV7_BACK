// controladores/infoAdultoControlador.js - Controlador de Información del Adulto Mayor
import { pool } from '../configuracion/basedeDatos.js';

// ==================== FUNCIONES PRINCIPALES ====================

/**
 * 1. Obtener información del adulto mayor principal
 */
export const obtenerAdultoMayorPrincipal = async (usuarioId) => {
  let client;
  
  try {
    console.log('👵 [INFO ADULTO] Obteniendo información del adulto mayor principal para usuario ID:', usuarioId);
    
    client = await pool.connect();
    
    // Obtener el adulto mayor principal del usuario
    const query = `
      SELECT 
        am.*,
        f.es_principal,
        f.rol_familiar
      FROM adultos_mayores am
      INNER JOIN familiares f ON am.id = f.adulto_mayor_id
      WHERE f.usuario_id = $1
        AND f.es_principal = true
      LIMIT 1
    `;
    
    const result = await client.query(query, [usuarioId]);
    
    if (result.rows.length === 0) {
      return { 
        exito: false, 
        error: 'No se encontró un adulto mayor principal asociado',
        codigo: 'ADULTO_NO_ENCONTRADO'
      };
    }
    
    const adultoMayor = result.rows[0];
    
    // Obtener información relacionada
    const [enfermedades, alergias, medicinas, articulos, hobbies, citas] = await Promise.all([
      obtenerEnfermedades(adultoMayor.id),
      obtenerAlergias(adultoMayor.id),
      obtenerMedicinas(adultoMayor.id),
      obtenerArticulos(adultoMayor.id),
      obtenerHobbies(adultoMayor.id),
      obtenerCitasRutinarias(adultoMayor.id)
    ]);
    
    const adultoCompleto = {
      ...adultoMayor,
      enfermedades: enfermedades.exito ? enfermedades.enfermedades : [],
      alergias: alergias.exito ? alergias.alergias : [],
      medicinas_habituales: medicinas.exito ? medicinas.medicinas : [],
      articulos: articulos.exito ? articulos.articulos : [],
      hobbies: hobbies.exito ? hobbies.hobbies : [],
      citas_rutinarias: citas.exito ? citas.citas : []
    };
    
    console.log('✅ Información del adulto mayor obtenida:', adultoCompleto.nombre);
    
    return {
      exito: true,
      adultoMayor: adultoCompleto,
      mensaje: 'Información del adulto mayor obtenida correctamente'
    };
    
  } catch (error) {
    console.error('❌ Error en obtenerAdultoMayorPrincipal:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al obtener información del adulto mayor',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 2. Actualizar información del adulto mayor
 */
export const actualizarAdultoMayor = async (adultoId, usuarioId, datos) => {
  let client;
  
  try {
    console.log('✏️ [INFO ADULTO] Actualizando información del adulto mayor ID:', adultoId);
    
    client = await pool.connect();
    
    // Verificar permisos
    const permisoQuery = `
      SELECT 1 FROM familiares 
      WHERE usuario_id = $1 AND adulto_mayor_id = $2
    `;
    
    const permisoResult = await client.query(permisoQuery, [usuarioId, adultoId]);
    
    if (permisoResult.rows.length === 0) {
      return { 
        exito: false, 
        error: 'No tienes permiso para actualizar este adulto mayor',
        codigo: 'SIN_PERMISOS'
      };
    }
    
    // Construir query dinámica
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    const camposPermitidos = [
      'nombre', 'fecha_nacimiento', 'genero', 'estado_salud', 
      'nivel_dependencia', 'contacto_emergencia', 'telefono_emergencia',
      'notas', 'direccion', 'telefono'
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
    
    values.push(adultoId);
    
    const query = `
      UPDATE adultos_mayores 
      SET ${updates.join(', ')}, actualizado_en = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    
    const result = await client.query(query, values);
    
    const adultoActualizado = result.rows[0];
    
    console.log('✅ Adulto mayor actualizado exitosamente');
    
    return {
      exito: true,
      adultoMayor: adultoActualizado,
      mensaje: 'Información del adulto mayor actualizada correctamente'
    };
    
  } catch (error) {
    console.error('❌ Error en actualizarAdultoMayor:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al actualizar adulto mayor',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 3. Obtener estadísticas de salud
 */
export const obtenerEstadisticasSalud = async (adultoId, usuarioId) => {
  let client;
  
  try {
    console.log('📊 [INFO ADULTO] Obteniendo estadísticas de salud para adulto ID:', adultoId);
    
    client = await pool.connect();
    
    // Verificar permisos
    const permisoQuery = `
      SELECT 1 FROM familiares 
      WHERE usuario_id = $1 AND adulto_mayor_id = $2
    `;
    
    const permisoResult = await client.query(permisoQuery, [usuarioId, adultoId]);
    
    if (permisoResult.rows.length === 0) {
      return { 
        exito: false, 
        error: 'No tienes acceso a este adulto mayor',
        codigo: 'SIN_ACCESO'
      };
    }
    
    // Obtener conteos
    const countsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM enfermedades_adulto WHERE adulto_mayor_id = $1) as total_enfermedades,
        (SELECT COUNT(*) FROM alergias_adulto WHERE adulto_mayor_id = $1) as total_alergias,
        (SELECT COUNT(*) FROM medicinas WHERE adulto_mayor_id = $1 AND activa = true) as total_medicinas,
        (SELECT COUNT(*) FROM articulos_adulto WHERE adulto_mayor_id = $1) as total_articulos
    `;
    
    const countsResult = await client.query(countsQuery, [adultoId]);
    
    // Obtener últimas mediciones de salud
    const medicionesQuery = `
      SELECT 
        tipo,
        valor,
        unidad,
        fecha_medicion
      FROM mediciones_salud
      WHERE adulto_mayor_id = $1
      ORDER BY fecha_medicion DESC
      LIMIT 10
    `;
    
    const medicionesResult = await client.query(medicionesQuery, [adultoId]);
    
    // Obtener próximas citas
    const citasQuery = `
      SELECT COUNT(*) as total_citas_proximas
      FROM citas_medicas
      WHERE adulto_mayor_id = $1
        AND fecha >= CURRENT_DATE
        AND fecha <= CURRENT_DATE + INTERVAL '7 days'
    `;
    
    const citasResult = await client.query(citasQuery, [adultoId]);
    
    const estadisticas = {
      ...countsResult.rows[0],
      mediciones_recientes: medicionesResult.rows,
      citas_proximas: citasResult.rows[0].total_citas_proximas,
      fecha_consulta: new Date().toISOString()
    };
    
    console.log('✅ Estadísticas de salud obtenidas');
    
    return {
      exito: true,
      estadisticas,
      adulto_id: adultoId
    };
    
  } catch (error) {
    console.error('❌ Error en obtenerEstadisticasSalud:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al obtener estadísticas',
      codigo: 'ERROR_SERVIDOR',
      estadisticas: {}
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

// ==================== FUNCIONES DE ENFERMEDADES ====================

/**
 * 4. Obtener enfermedades del adulto mayor
 */
export const obtenerEnfermedades = async (adultoId) => {
  let client;
  
  try {
    console.log('🤒 [INFO ADULTO] Obteniendo enfermedades para adulto ID:', adultoId);
    
    client = await pool.connect();
    
    const query = `
      SELECT 
        id,
        nombre,
        tipo,
        severidad,
        fecha_diagnostico,
        tratamiento,
        notas,
        activa,
        creado_en
      FROM enfermedades_adulto
      WHERE adulto_mayor_id = $1
        AND activa = true
      ORDER BY severidad DESC, fecha_diagnostico DESC
    `;
    
    const result = await client.query(query, [adultoId]);
    
    return {
      exito: true,
      enfermedades: result.rows,
      total: result.rows.length
    };
    
  } catch (error) {
    console.error('❌ Error en obtenerEnfermedades:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al obtener enfermedades',
      codigo: 'ERROR_SERVIDOR',
      enfermedades: []
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 5. Agregar enfermedad
 */
export const agregarEnfermedad = async (adultoId, usuarioId, enfermedad) => {
  let client;
  
  try {
    console.log('➕ [INFO ADULTO] Agregando enfermedad para adulto ID:', adultoId);
    
    // Validar datos requeridos
    if (!enfermedad.nombre) {
      return { 
        exito: false, 
        error: 'El nombre de la enfermedad es requerido',
        codigo: 'DATOS_INCOMPLETOS'
      };
    }
    
    client = await pool.connect();
    
    // Verificar permisos
    const permisoQuery = `
      SELECT 1 FROM familiares 
      WHERE usuario_id = $1 AND adulto_mayor_id = $2
    `;
    
    const permisoResult = await client.query(permisoQuery, [usuarioId, adultoId]);
    
    if (permisoResult.rows.length === 0) {
      return { 
        exito: false, 
        error: 'No tienes permiso para agregar enfermedades a este adulto mayor',
        codigo: 'SIN_PERMISOS'
      };
    }
    
    // Verificar si ya existe
    const existeQuery = `
      SELECT 1 FROM enfermedades_adulto 
      WHERE adulto_mayor_id = $1 
        AND LOWER(nombre) = LOWER($2)
        AND activa = true
    `;
    
    const existeResult = await client.query(existeQuery, [
      adultoId, 
      enfermedad.nombre.trim()
    ]);
    
    if (existeResult.rows.length > 0) {
      return { 
        exito: false, 
        error: 'Esta enfermedad ya está registrada',
        codigo: 'ENFERMEDAD_DUPLICADA'
      };
    }
    
    // Insertar nueva enfermedad
    const insertQuery = `
      INSERT INTO enfermedades_adulto (
        adulto_mayor_id,
        nombre,
        tipo,
        severidad,
        fecha_diagnostico,
        tratamiento,
        notas,
        usuario_registro_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const values = [
      adultoId,
      enfermedad.nombre.trim(),
      enfermedad.tipo || 'cronica',
      enfermedad.severidad || 'media',
      enfermedad.fecha_diagnostico || new Date().toISOString().split('T')[0],
      enfermedad.tratamiento || '',
      enfermedad.notas || '',
      usuarioId
    ];
    
    const result = await client.query(insertQuery, values);
    
    console.log('✅ Enfermedad agregada exitosamente:', enfermedad.nombre);
    
    return {
      exito: true,
      enfermedad: result.rows[0],
      mensaje: 'Enfermedad agregada correctamente'
    };
    
  } catch (error) {
    console.error('❌ Error en agregarEnfermedad:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al agregar enfermedad',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 6. Actualizar enfermedad
 */
export const actualizarEnfermedad = async (enfermedadId, usuarioId, datos) => {
  let client;
  
  try {
    console.log('✏️ [INFO ADULTO] Actualizando enfermedad ID:', enfermedadId);
    
    client = await pool.connect();
    
    // Verificar que la enfermedad existe y pertenece al adulto mayor del usuario
    const verifyQuery = `
      SELECT ea.id, ea.adulto_mayor_id
      FROM enfermedades_adulto ea
      WHERE ea.id = $1
    `;
    
    const verifyResult = await client.query(verifyQuery, [enfermedadId]);
    
    if (verifyResult.rows.length === 0) {
      return { 
        exito: false, 
        error: 'Enfermedad no encontrada',
        codigo: 'ENFERMEDAD_NO_ENCONTRADA'
      };
    }
    
    const adultoId = verifyResult.rows[0].adulto_mayor_id;
    
    // Verificar permisos
    const permisoQuery = `
      SELECT 1 FROM familiares 
      WHERE usuario_id = $1 AND adulto_mayor_id = $2
    `;
    
    const permisoResult = await client.query(permisoQuery, [usuarioId, adultoId]);
    
    if (permisoResult.rows.length === 0) {
      return { 
        exito: false, 
        error: 'No tienes permiso para modificar esta enfermedad',
        codigo: 'SIN_PERMISOS'
      };
    }
    
    // Construir query dinámica
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    const camposPermitidos = [
      'nombre', 'tipo', 'severidad', 'fecha_diagnostico', 
      'tratamiento', 'notas', 'activa'
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
    
    values.push(enfermedadId);
    
    const query = `
      UPDATE enfermedades_adulto 
      SET ${updates.join(', ')}, actualizado_en = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    
    const result = await client.query(query, values);
    
    console.log('✅ Enfermedad actualizada exitosamente');
    
    return {
      exito: true,
      enfermedad: result.rows[0],
      mensaje: 'Enfermedad actualizada correctamente'
    };
    
  } catch (error) {
    console.error('❌ Error en actualizarEnfermedad:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al actualizar enfermedad',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 7. Eliminar enfermedad (borrado lógico)
 */
export const eliminarEnfermedad = async (enfermedadId, usuarioId) => {
  let client;
  
  try {
    console.log('🗑️ [INFO ADULTO] Eliminando enfermedad ID:', enfermedadId);
    
    client = await pool.connect();
    
    // Verificar que la enfermedad existe y pertenece al adulto mayor del usuario
    const verifyQuery = `
      SELECT ea.id, ea.adulto_mayor_id
      FROM enfermedades_adulto ea
      WHERE ea.id = $1
    `;
    
    const verifyResult = await client.query(verifyQuery, [enfermedadId]);
    
    if (verifyResult.rows.length === 0) {
      return { 
        exito: false, 
        error: 'Enfermedad no encontrada',
        codigo: 'ENFERMEDAD_NO_ENCONTRADA'
      };
    }
    
    const adultoId = verifyResult.rows[0].adulto_mayor_id;
    
    // Verificar permisos
    const permisoQuery = `
      SELECT 1 FROM familiares 
      WHERE usuario_id = $1 AND adulto_mayor_id = $2
    `;
    
    const permisoResult = await client.query(permisoQuery, [usuarioId, adultoId]);
    
    if (permisoResult.rows.length === 0) {
      return { 
        exito: false, 
        error: 'No tienes permiso para eliminar esta enfermedad',
        codigo: 'SIN_PERMISOS'
      };
    }
    
    // Borrado lógico
    const deleteQuery = `
      UPDATE enfermedades_adulto 
      SET activa = false, actualizado_en = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id
    `;
    
    const result = await client.query(deleteQuery, [enfermedadId]);
    
    console.log('✅ Enfermedad eliminada exitosamente');
    
    return {
      exito: true,
      mensaje: 'Enfermedad eliminada correctamente',
      id: result.rows[0].id
    };
    
  } catch (error) {
    console.error('❌ Error en eliminarEnfermedad:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al eliminar enfermedad',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

// ==================== FUNCIONES DE ALERGIAS ====================

/**
 * 8. Obtener alergias del adulto mayor
 */
export const obtenerAlergias = async (adultoId) => {
  let client;
  
  try {
    console.log('🤧 [INFO ADULTO] Obteniendo alergias para adulto ID:', adultoId);
    
    client = await pool.connect();
    
    const query = `
      SELECT 
        id,
        nombre,
        tipo,
        severidad,
        reaccion,
        tratamiento,
        notas,
        activa,
        creado_en
      FROM alergias_adulto
      WHERE adulto_mayor_id = $1
        AND activa = true
      ORDER BY severidad DESC, creado_en DESC
    `;
    
    const result = await client.query(query, [adultoId]);
    
    return {
      exito: true,
      alergias: result.rows,
      total: result.rows.length
    };
    
  } catch (error) {
    console.error('❌ Error en obtenerAlergias:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al obtener alergias',
      codigo: 'ERROR_SERVIDOR',
      alergias: []
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 9. Agregar alergia
 */
export const agregarAlergia = async (adultoId, usuarioId, alergia) => {
  let client;
  
  try {
    console.log('➕ [INFO ADULTO] Agregando alergia para adulto ID:', adultoId);
    
    // Validar datos requeridos
    if (!alergia.nombre) {
      return { 
        exito: false, 
        error: 'El nombre de la alergia es requerido',
        codigo: 'DATOS_INCOMPLETOS'
      };
    }
    
    client = await pool.connect();
    
    // Verificar permisos
    const permisoQuery = `
      SELECT 1 FROM familiares 
      WHERE usuario_id = $1 AND adulto_mayor_id = $2
    `;
    
    const permisoResult = await client.query(permisoQuery, [usuarioId, adultoId]);
    
    if (permisoResult.rows.length === 0) {
      return { 
        exito: false, 
        error: 'No tienes permiso para agregar alergias a este adulto mayor',
        codigo: 'SIN_PERMISOS'
      };
    }
    
    // Verificar si ya existe
    const existeQuery = `
      SELECT 1 FROM alergias_adulto 
      WHERE adulto_mayor_id = $1 
        AND LOWER(nombre) = LOWER($2)
        AND activa = true
    `;
    
    const existeResult = await client.query(existeQuery, [
      adultoId, 
      alergia.nombre.trim()
    ]);
    
    if (existeResult.rows.length > 0) {
      return { 
        exito: false, 
        error: 'Esta alergia ya está registrada',
        codigo: 'ALERGIA_DUPLICADA'
      };
    }
    
    // Insertar nueva alergia
    const insertQuery = `
      INSERT INTO alergias_adulto (
        adulto_mayor_id,
        nombre,
        tipo,
        severidad,
        reaccion,
        tratamiento,
        notas,
        usuario_registro_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const values = [
      adultoId,
      alergia.nombre.trim(),
      alergia.tipo || 'medicamento',
      alergia.severidad || 'media',
      alergia.reaccion || '',
      alergia.tratamiento || '',
      alergia.notas || '',
      usuarioId
    ];
    
    const result = await client.query(insertQuery, values);
    
    console.log('✅ Alergia agregada exitosamente:', alergia.nombre);
    
    return {
      exito: true,
      alergia: result.rows[0],
      mensaje: 'Alergia agregada correctamente'
    };
    
  } catch (error) {
    console.error('❌ Error en agregarAlergia:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al agregar alergia',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

// ==================== FUNCIONES DE ARTÍCULOS ====================

/**
 * 10. Obtener artículos del adulto mayor
 */
export const obtenerArticulos = async (adultoId) => {
  let client;
  
  try {
    console.log('📦 [INFO ADULTO] Obteniendo artículos para adulto ID:', adultoId);
    
    client = await pool.connect();
    
    const query = `
      SELECT 
        id,
        nombre,
        tipo,
        cantidad,
        ubicacion,
        estado,
        fecha_adquisicion,
        notas,
        activo,
        creado_en
      FROM articulos_adulto
      WHERE adulto_mayor_id = $1
        AND activo = true
      ORDER BY tipo, nombre
    `;
    
    const result = await client.query(query, [adultoId]);
    
    return {
      exito: true,
      articulos: result.rows,
      total: result.rows.length
    };
    
  } catch (error) {
    console.error('❌ Error en obtenerArticulos:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al obtener artículos',
      codigo: 'ERROR_SERVIDOR',
      articulos: []
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 11. Agregar artículo
 */
export const agregarArticulo = async (adultoId, usuarioId, articulo) => {
  let client;
  
  try {
    console.log('➕ [INFO ADULTO] Agregando artículo para adulto ID:', adultoId);
    
    // Validar datos requeridos
    if (!articulo.nombre) {
      return { 
        exito: false, 
        error: 'El nombre del artículo es requerido',
        codigo: 'DATOS_INCOMPLETOS'
      };
    }
    
    client = await pool.connect();
    
    // Verificar permisos
    const permisoQuery = `
      SELECT 1 FROM familiares 
      WHERE usuario_id = $1 AND adulto_mayor_id = $2
    `;
    
    const permisoResult = await client.query(permisoQuery, [usuarioId, adultoId]);
    
    if (permisoResult.rows.length === 0) {
      return { 
        exito: false, 
        error: 'No tienes permiso para agregar artículos a este adulto mayor',
        codigo: 'SIN_PERMISOS'
      };
    }
    
    // Insertar nuevo artículo
    const insertQuery = `
      INSERT INTO articulos_adulto (
        adulto_mayor_id,
        nombre,
        tipo,
        cantidad,
        ubicacion,
        estado,
        fecha_adquisicion,
        notas,
        usuario_registro_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    
    const values = [
      adultoId,
      articulo.nombre.trim(),
      articulo.tipo || 'equipo_medico',
      articulo.cantidad || 1,
      articulo.ubicacion || '',
      articulo.estado || 'optimo',
      articulo.fecha_adquisicion || new Date().toISOString().split('T')[0],
      articulo.notas || '',
      usuarioId
    ];
    
    const result = await client.query(insertQuery, values);
    
    console.log('✅ Artículo agregado exitosamente:', articulo.nombre);
    
    return {
      exito: true,
      articulo: result.rows[0],
      mensaje: 'Artículo agregado correctamente'
    };
    
  } catch (error) {
    console.error('❌ Error en agregarArticulo:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al agregar artículo',
      codigo: 'ERROR_SERVIDOR'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

// ==================== FUNCIONES DE HOBBIES ====================

/**
 * 12. Obtener hobbies del adulto mayor
 */
export const obtenerHobbies = async (adultoId) => {
  let client;
  
  try {
    console.log('🎨 [INFO ADULTO] Obteniendo hobbies para adulto ID:', adultoId);
    
    client = await pool.connect();
    
    const query = `
      SELECT 
        id,
        nombre,
        tipo,
        frecuencia,
        notas,
        activo,
        creado_en
      FROM hobbies_adulto
      WHERE adulto_mayor_id = $1
        AND activo = true
      ORDER BY frecuencia DESC, nombre
    `;
    
    const result = await client.query(query, [adultoId]);
    
    return {
      exito: true,
      hobbies: result.rows,
      total: result.rows.length
    };
    
  } catch (error) {
    console.error('❌ Error en obtenerHobbies:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al obtener hobbies',
      codigo: 'ERROR_SERVIDOR',
      hobbies: []
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 13. Agregar hobby
 */
export const agregarHobby = async (adultoId, usuarioId, hobby) => {
  let client;
  
  try {
    console.log('➕ [INFO ADULTO] Agregando hobby para adulto ID:', adultoId);
    
    // Validar datos requeridos
    if (!hobby.nombre) {
      return { 
        exito: false, 
        error: 'El nombre del hobby es requerido',
        codigo: 'DATOS_INCOMPLETOS'
      };
    }
    
    client = await pool.connect();
    
    // Verificar permisos
    const permisoQuery = `
      SELECT 1 FROM familiares 
      WHERE usuario_id = $1 AND adulto_mayor_id = $2
    `;
    
    const permisoResult = await client.query(permisoQuery, [usuarioId, adultoId]);
    
    if (permisoResult.rows.length === 0) {
      return { 
        exito: false, 
        error: 'No tienes permiso para agregar hobbies a este adulto mayor',
        codigo: 'SIN_PERMISOS'
      };
    }
    
    // Insertar nuevo hobby
    const insertQuery = `
      INSERT INTO hobbies_adulto (
        adulto_mayor_id,
        nombre,
        tipo,
        frecuencia,
        notas,
        usuario_registro_id
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const values = [
      adultoId,
      hobby.nombre.trim(),
      hobby.tipo || 'recreativo',
      hobby.frecuencia || 'ocasional',
      hobby.notas || '',
      usuarioId
    ];
    
    const result = await client.query(insertQuery, values);
    
    console.log('✅ Hobby agregado exitosamente:', hobby.nombre);
    
    return {
      exito: true,
      hobby: result.rows[0],
      mensaje: 'Hobby agregado correctamente'
    };
    
  } catch (error) {
    console.error('❌ Error en agregarHobby:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al agregar hobby',
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
 * 14. Obtener medicinas del adulto mayor
 */
const obtenerMedicinas = async (adultoId) => {
  let client;
  
  try {
    client = await pool.connect();
    
    const query = `
      SELECT 
        id,
        nombre,
        dosis,
        frecuencia,
        proposito,
        hora_toma,
        activa
      FROM medicinas
      WHERE adulto_mayor_id = $1
        AND activa = true
      ORDER BY hora_toma
      LIMIT 5
    `;
    
    const result = await client.query(query, [adultoId]);
    
    return {
      exito: true,
      medicinas: result.rows,
      total: result.rows.length
    };
    
  } catch (error) {
    console.error('❌ Error en obtenerMedicinas:', error.message);
    return { 
      exito: false, 
      medicinas: []
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 15. Obtener citas rutinarias
 */
const obtenerCitasRutinarias = async (adultoId) => {
  let client;
  
  try {
    client = await pool.connect();
    
    const query = `
      SELECT 
        id,
        tipo,
        especialista,
        frecuencia,
        proxima_cita,
        ubicacion,
        notas
      FROM citas_rutinarias
      WHERE adulto_mayor_id = $1
        AND activa = true
      ORDER BY proxima_cita
      LIMIT 3
    `;
    
    const result = await client.query(query, [adultoId]);
    
    return {
      exito: true,
      citas: result.rows,
      total: result.rows.length
    };
    
  } catch (error) {
    console.error('❌ Error en obtenerCitasRutinarias:', error.message);
    return { 
      exito: false, 
      citas: []
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 16. Generar reporte de salud
 */
export const generarReporteSalud = async (adultoId, usuarioId, tipo = 'completo') => {
  let client;
  
  try {
    console.log('📄 [INFO ADULTO] Generando reporte de salud para adulto ID:', adultoId);
    
    client = await pool.connect();
    
    // Verificar permisos
    const permisoQuery = `
      SELECT 1 FROM familiares 
      WHERE usuario_id = $1 AND adulto_mayor_id = $2
    `;
    
    const permisoResult = await client.query(permisoQuery, [usuarioId, adultoId]);
    
    if (permisoResult.rows.length === 0) {
      return { 
        exito: false, 
        error: 'No tienes acceso a este adulto mayor',
        codigo: 'SIN_ACCESO'
      };
    }
    
    // Obtener información del adulto
    const adultoQuery = `
      SELECT * FROM adultos_mayores WHERE id = $1
    `;
    
    const adultoResult = await client.query(adultoQuery, [adultoId]);
    const adultoMayor = adultoResult.rows[0];
    
    // Calcular edad
    const edad = adultoMayor.fecha_nacimiento 
      ? Math.floor((new Date() - new Date(adultoMayor.fecha_nacimiento)) / (365.25 * 24 * 60 * 60 * 1000))
      : null;
    
    // Obtener toda la información relacionada
    const [
      enfermedadesResult,
      alergiasResult,
      medicinasResult,
      articulosResult,
      hobbiesResult,
      citasResult,
      medicionesResult
    ] = await Promise.all([
      obtenerEnfermedades(adultoId),
      obtenerAlergias(adultoId),
      obtenerMedicinasCompletas(adultoId),
      obtenerArticulos(adultoId),
      obtenerHobbies(adultoId),
      obtenerCitasRutinarias(adultoId),
      obtenerUltimasMediciones(adultoId)
    ]);
    
    // Construir reporte
    const reporte = {
      tipo: tipo,
      fecha_generacion: new Date().toISOString(),
      adulto_mayor: {
        ...adultoMayor,
        edad: edad
      },
      salud: {
        enfermedades: enfermedadesResult.exito ? enfermedadesResult.enfermedades : [],
        alergias: alergiasResult.exito ? alergiasResult.alergias : [],
        mediciones_recientes: medicionesResult.exito ? medicionesResult.mediciones : []
      },
      medicinas: medicinasResult.exito ? medicinasResult.medicinas : [],
      articulos: articulosResult.exito ? articulosResult.articulos : [],
      hobbies: hobbiesResult.exito ? hobbiesResult.hobbies : [],
      citas_rutinarias: citasResult.exito ? citasResult.citas : []
    };
    
    console.log('✅ Reporte de salud generado exitosamente');
    
    return {
      exito: true,
      reporte: reporte,
      mensaje: 'Reporte de salud generado correctamente'
    };
    
  } catch (error) {
    console.error('❌ Error en generarReporteSalud:', error.message);
    return { 
      exito: false, 
      error: 'Error del servidor al generar reporte',
      codigo: 'ERROR_SERVIDOR',
      reporte: {}
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 17. Obtener medicinas completas (función auxiliar)
 */
const obtenerMedicinasCompletas = async (adultoId) => {
  let client;
  
  try {
    client = await pool.connect();
    
    const query = `
      SELECT * FROM medicinas
      WHERE adulto_mayor_id = $1
        AND activa = true
      ORDER BY nombre
    `;
    
    const result = await client.query(query, [adultoId]);
    
    return {
      exito: true,
      medicinas: result.rows,
      total: result.rows.length
    };
    
  } catch (error) {
    console.error('❌ Error en obtenerMedicinasCompletas:', error.message);
    return { 
      exito: false, 
      medicinas: []
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * 18. Obtener últimas mediciones
 */
const obtenerUltimasMediciones = async (adultoId) => {
  let client;
  
  try {
    client = await pool.connect();
    
    const query = `
      SELECT 
        tipo,
        valor,
        unidad,
        fecha_medicion,
        notas
      FROM mediciones_salud
      WHERE adulto_mayor_id = $1
      ORDER BY fecha_medicion DESC
      LIMIT 10
    `;
    
    const result = await client.query(query, [adultoId]);
    
    return {
      exito: true,
      mediciones: result.rows,
      total: result.rows.length
    };
    
  } catch (error) {
    console.error('❌ Error en obtenerUltimasMediciones:', error.message);
    return { 
      exito: false, 
      mediciones: []
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

// ==================== EXPORTACIÓN ====================

export default {
  // Información principal
  obtenerAdultoMayorPrincipal,
  actualizarAdultoMayor,
  obtenerEstadisticasSalud,
  generarReporteSalud,
  
  // Enfermedades
  obtenerEnfermedades,
  agregarEnfermedad,
  actualizarEnfermedad,
  eliminarEnfermedad,
  
  // Alergias
  obtenerAlergias,
  agregarAlergia,
  
  // Artículos
  obtenerArticulos,
  agregarArticulo,
  
  // Hobbies
  obtenerHobbies,
  agregarHobby
};