import pkg from 'pg';
const { Pool } = pkg;

// ========== CONFIGURACIÓN DINÁMICA ==========
// Extraer configuración de DATABASE_URL
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ ERROR CRÍTICO: DATABASE_URL no está definida en las variables de entorno');
  console.error('   Por favor, configura la variable DATABASE_URL en tu entorno');
  process.exit(1);
}

// Parsear la URL de conexión 
const parseDatabaseUrl = (url) => {
  try {
    const parsed = new URL(url);

    return {
      host: parsed.hostname,
      port: 5432,
      database: parsed.pathname?.substring(1),
      user: parsed.username,
      password: parsed.password
    };

  } catch (error) {
    console.error('❌ Error parseando DATABASE_URL:', error.message);
    return null;
  }
};

const parsed = parseDatabaseUrl(DATABASE_URL);

if (!parsed) {
  console.error('❌ ERROR CRÍTICO: No se pudo obtener configuración de DB');
  process.exit(1);
}

console.log('✅ Configuración obtenida de DATABASE_URL');
const dbConfig = parsed;

// ========== CONFIGURACIÓN DEL POOL ==========
const poolConfig = {
  ...dbConfig,
  ssl: {
    rejectUnauthorized: false,
    require: true
  },
  max: 10,
  min: 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 20000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000
};

console.log('📊 PostgreSQL configurado');
console.log(`   Host: ${poolConfig.host}`);
console.log(`   Database: ${poolConfig.database}`);
console.log(`   User: ${poolConfig.user}`);

// ========== CREAR POOL ==========
const pool = new Pool(poolConfig);

// ========== MANEJO DE ERRORES DEL POOL ==========
pool.on('error', (err) => {
  console.error('❌ Error inesperado en el pool de PostgreSQL:', err.message);
});

// ========== FUNCIONES DE CONEXIÓN Y VERIFICACIÓN ==========

/**
 * Verificación BÁSICA de conexión
 * @returns {Promise<Object>} Resultado de la verificación básica
 */
export const verificarConexionDB = async (intentos = 1) => {
  let client;

  try {
    client = await pool.connect();

    // Verificación básica únicamente
    const result = await client.query(`
      SELECT 
        NOW() as server_time,
        version() as pg_version,
        current_database() as db_name,
        current_user as db_user,
        inet_server_addr() as server_ip
    `);

    console.log('✅ Conexión PostgreSQL exitosa');
    console.log(`   Database: ${result.rows[0].db_name}`);
    console.log(`   PostgreSQL: ${result.rows[0].pg_version.split(',')[0]}`);
    console.log(`   Hora servidor: ${result.rows[0].server_time}`);

    return {
      success: true,
      connected: true,
      database: result.rows[0].db_name,
      user: result.rows[0].db_user,
      server_time: result.rows[0].server_time,
      version: result.rows[0].pg_version,
      server_ip: result.rows[0].server_ip
    };

  } catch (error) {
    console.error('❌ Error conectando a PostgreSQL:', error.message);

    // Información detallada para debugging
    console.error(`   Código error: ${error.code}`);

    if (error.code === 'ECONNREFUSED') {
      console.error('   ⚠️ El servidor PostgreSQL rechazó la conexión');
    } else if (error.code === 'ENOTFOUND') {
      console.error('   ⚠️ No se pudo resolver el hostname');
      console.error(`   Host intentado: ${poolConfig.host}`);
    } else if (error.code === '28P01') {
      console.error('   ⚠️ Autenticación fallida - usuario/contraseña incorrectos');
    } else if (error.code === '3D000') {
      console.error('   ⚠️ Base de datos no existe');
    }

    return {
      success: false,
      connected: false,
      error: error.message,
      code: error.code
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * Obtiene información de TODAS las tablas y sus columnas
 * @returns {Promise<Object>} Información completa de estructura
 */
export const obtenerEstructuraCompletaDB = async () => {
  let client;

  try {
    client = await pool.connect();

    // 1. Obtener TODAS las tablas
    const tablas = await client.query(`
      SELECT 
        table_name,
        table_type,
        (SELECT COUNT(*) 
         FROM information_schema.columns c 
         WHERE c.table_schema = t.table_schema 
           AND c.table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log(`📊 Total tablas encontradas: ${tablas.rows.length}`);

    // 2. Para cada tabla, obtener sus columnas DETALLADAS
    const tablasConDetalles = await Promise.all(
      tablas.rows.map(async (tabla) => {
        const columnas = await client.query(`
          SELECT 
            column_name,
            data_type,
            character_maximum_length,
            is_nullable,
            column_default,
            ordinal_position
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = $1
          ORDER BY ordinal_position
        `, [tabla.table_name]);

        // Formatear columnas
        const columnasFormateadas = columnas.rows.map(col => ({
          nombre: col.column_name,
          tipo: col.data_type + (col.character_maximum_length ? `(${col.character_maximum_length})` : ''),
          nulo: col.is_nullable === 'YES' ? 'SÍ' : 'NO',
          valor_default: col.column_default || 'Ninguno',
          posicion: col.ordinal_position
        }));

        return {
          nombre: tabla.table_name,
          tipo: tabla.table_type,
          total_columnas: tabla.column_count,
          columnas: columnasFormateadas
        };
      })
    );

    // 3. Mostrar información detallada de cada tabla
    console.log('\n📋 ===== LISTA COMPLETA DE TABLAS =====');

    tablasConDetalles.forEach((tabla, index) => {
      console.log(`\n${index + 1}. ${tabla.nombre} (${tabla.tipo}, ${tabla.total_columnas} columnas)`);
      console.log('   Columnas:');
      tabla.columnas.forEach(col => {
        console.log(`     ${col.posicion}. ${col.nombre} (${col.tipo}) - Nulo: ${col.nulo}`);
      });
    });

    // 4. Resumen para la API
    const resumenTablas = {
      total_tablas: tablas.rows.length,
      tablas: tablasConDetalles.map(t => ({
        nombre: t.nombre,
        tipo: t.tipo,
        total_columnas: t.total_columnas,
        columnas: t.columnas.map(c => ({
          nombre: c.nombre,
          tipo: c.tipo,
          nulo: c.nulo,
          posicion: c.posicion
        }))
      }))
    };

    return {
      success: true,
      estructura_completa: tablasConDetalles,
      resumen: resumenTablas
    };

  } catch (error) {
    console.error('❌ Error obteniendo estructura de base de datos:', error.message);
    return {
      success: false,
      error: error.message
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * Función de prueba rápida de conexión
 * @returns {Promise<Object>} Resultado simple
 */
export const testConexionSimple = async () => {
  let client;

  try {
    client = await pool.connect();
    const result = await client.query('SELECT 1 as ok');
    client.release();

    return {
      success: true,
      test: result.rows[0].ok,
      message: 'Conexión a PostgreSQL funcional'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: 'Error conectando a PostgreSQL'
    };
  }
};

/**
 * Inicializa la base de datos con verificación COMPLETA
 * @returns {Promise<Object>} Estado de inicialización detallado
 */
export const inicializarDB = async () => {
  console.log('\n🔧 ===== INICIALIZANDO BASE DE DATOS =====');

  // 1. Verificar conexión básica
  console.log('🔗 Verificando conexión básica...');
  const conexion = await verificarConexionDB();

  if (!conexion.success) {
    console.error('❌ No se pudo conectar a PostgreSQL');
    return {
      initialized: false,
      connection: conexion,
      estructura: null
    };
  }

  console.log('✅ Conexión básica establecida');

  // 2. Obtener estructura COMPLETA de la base de datos
  console.log('🔍 Obteniendo estructura completa...');
  const estructura = await obtenerEstructuraCompletaDB();

  if (!estructura.success) {
    console.error('⚠️ No se pudo obtener estructura completa');
    return {
      initialized: true, // Conexión sí, estructura no
      connection: conexion,
      estructura: null,
      warning: 'Conexión exitosa pero no se pudo analizar estructura'
    };
  }

  console.log('✅ Estructura obtenida exitosamente');

  // 3. Generar resumen para logs
  console.log('\n📋 ===== RESUMEN INICIAL =====');
  console.log(`   ✅ PostgreSQL conectado: ${conexion.database}`);
  console.log(`   ✅ Total tablas: ${estructura.resumen.total_tablas}`);

  return {
    initialized: true,
    connection: conexion,
    estructura: estructura,
    resumen: {
      database: conexion.database,
      total_tablas: estructura.resumen.total_tablas
    }
  };
};

// ========== EXPORTAR ==========
export { pool };

// Inicialización automática al cargar el módulo
if (process.env.NODE_ENV === 'development') {
  inicializarDB().then(estado => {
    if (estado.initialized) {
      console.log('\n✅ PostgreSQL inicializado correctamente');
      console.log('========================================');
    } else {
      console.error('\n❌ Falló la inicialización de PostgreSQL');
    }
  }).catch(error => {
    console.error('\n❌ Error en inicialización:', error.message);
  });
} else {
  // En producción, solo verificamos conexión simple
  testConexionSimple().then(resultado => {
    if (resultado.success) {
      console.log('✅ PostgreSQL conectado');
    } else {
      console.error('❌ No se pudo conectar a PostgreSQL:', resultado.error);
    }
  });
}

console.log('✅ Módulo PostgreSQL cargado');