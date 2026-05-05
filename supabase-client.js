// public/supabase-client.js
// Cliente de Supabase para el frontend de Tienda La Reina

// Configuración de Supabase
// NOTA IMPORTANTE: En producción, estas credenciales deben ser ANON KEY, no SERVICE ROLE KEY
// La ANON KEY es segura para usar en el frontend porque tiene permisos limitados
const SUPABASE_URL = 'https://tu-proyecto.supabase.co';
const SUPABASE_ANON_KEY = 'tu-anon-key-aqui';

// Importar Supabase desde CDN
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';

// Crear instancia del cliente
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===========================================
// FUNCIONES PARA TIENDAS
// ===========================================

/**
 * Obtener todas las tiendas
 * @returns {Promise<Array>} Lista de tiendas
 */
async function getStores() {
    try {
        const { data, error } = await supabase
            .from('tiendas')
            .select('*')
            .order('id');
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error en getStores:', error);
        return [];
    }
}

/**
 * Obtener una tienda por ID
 * @param {string} storeId - ID de la tienda
 * @returns {Promise<Object|null>} Datos de la tienda
 */
async function getStoreById(storeId) {
    try {
        const { data, error } = await supabase
            .from('tiendas')
            .select('*')
            .eq('id', storeId)
            .single();
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error en getStoreById:', error);
        return null;
    }
}

/**
 * Obtener configuración de una tienda
 * @param {string} storeId - ID de la tienda
 * @returns {Promise<Object>} Configuración de la tienda
 */
async function getStoreConfig(storeId) {
    try {
        const { data, error } = await supabase
            .from('tiendas')
            .select('configuracion')
            .eq('id', storeId)
            .single();
        
        if (error) throw error;
        
        const defaultConfig = {
            envio: { disponible: true, costo: 0, tiempo_estimado: "24-48 horas" },
            garantia: { disponible: true, duracion: "12 meses", descripcion: "Garantía contra defectos" },
            metodos_pago: ["Efectivo", "Transferencia"],
            datos_bancarios: { numero_tarjeta: "", whatsapp_confirmacion: "" },
            contacto: { telefono: "+53 5XXXXXXX", email: "contacto@tienda.com" }
        };
        
        return data?.configuracion || defaultConfig;
    } catch (error) {
        console.error('Error en getStoreConfig:', error);
        return defaultConfig;
    }
}

// ===========================================
// FUNCIONES PARA PRODUCTOS
// ===========================================

/**
 * Obtener productos de una tienda
 * @param {string} storeId - ID de la tienda
 * @returns {Promise<Array>} Lista de productos
 */
async function getProducts(storeId) {
    try {
        const { data, error } = await supabase
            .from('productos')
            .select('*')
            .eq('tienda_id', storeId)
            .order('id', { ascending: false });
        
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error en getProducts:', error);
        return [];
    }
}

/**
 * Obtener un producto por ID
 * @param {number} productId - ID del producto
 * @param {string} storeId - ID de la tienda
 * @returns {Promise<Object|null>} Datos del producto
 */
async function getProductById(productId, storeId) {
    try {
        const { data, error } = await supabase
            .from('productos')
            .select('*')
            .eq('id', productId)
            .eq('tienda_id', storeId)
            .single();
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error en getProductById:', error);
        return null;
    }
}

/**
 * Obtener categorías de productos de una tienda
 * @param {string} storeId - ID de la tienda
 * @returns {Promise<Array>} Lista de categorías
 */
async function getCategories(storeId) {
    try {
        const { data, error } = await supabase
            .from('productos')
            .select('categoria')
            .eq('tienda_id', storeId)
            .not('categoria', 'is', null);
        
        if (error) throw error;
        
        const categories = [...new Set(data.map(p => p.categoria).filter(Boolean))];
        
        if (categories.length === 0) {
            // Si no hay productos, obtener categorías por defecto de la tienda
            const { data: storeData } = await supabase
                .from('tiendas')
                .select('categorias')
                .eq('id', storeId)
                .single();
            
            return storeData?.categorias || ['otros'];
        }
        
        return categories;
    } catch (error) {
        console.error('Error en getCategories:', error);
        return ['otros'];
    }
}

// ===========================================
// FUNCIONES PARA PEDIDOS
// ===========================================

/**
 * Crear un nuevo pedido
 * @param {Object} orderData - Datos del pedido
 * @returns {Promise<Object>} Resultado de la operación
 */
async function createOrder(orderData) {
    try {
        const { data, error } = await supabase
            .from('pedidos')
            .insert({
                tienda_id: orderData.tienda,
                codigo_cliente: orderData.codigoCliente || generateCodigoUnico(),
                fecha: new Date().toISOString(),
                estado: 'pendiente',
                nombre: orderData.nombre,
                telefono: orderData.telefono,
                direccion: orderData.direccion,
                items: orderData.items,
                total: orderData.total,
                moneda: orderData.moneda || 'CUP',
                metodo_pago: orderData.metodoPago || 'Efectivo'
            })
            .select()
            .single();
        
        if (error) throw error;
        return { success: true, orderId: data.id, codigoCliente: data.codigo_cliente };
    } catch (error) {
        console.error('Error en createOrder:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Obtener pedidos de una tienda (para admin)
 * @param {string} storeId - ID de la tienda
 * @returns {Promise<Array>} Lista de pedidos
 */
async function getOrders(storeId) {
    try {
        const { data, error } = await supabase
            .from('pedidos')
            .select('*')
            .eq('tienda_id', storeId)
            .order('fecha', { ascending: false });
        
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error en getOrders:', error);
        return [];
    }
}

/**
 * Actualizar estado de un pedido (para admin)
 * @param {number} orderId - ID del pedido
 * @param {string} status - Nuevo estado
 * @returns {Promise<boolean>} Resultado de la operación
 */
async function updateOrderStatus(orderId, status) {
    try {
        const { error } = await supabase
            .from('pedidos')
            .update({ estado: status })
            .eq('id', orderId);
        
        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error en updateOrderStatus:', error);
        return false;
    }
}

// ===========================================
// FUNCIONES PARA CONFIGURACIÓN
// ===========================================

/**
 * Obtener configuración global (tasas de cambio)
 * @returns {Promise<Object>} Configuración global
 */
async function getGlobalConfig() {
    try {
        const { data, error } = await supabase
            .from('config')
            .select('*')
            .eq('id', 1)
            .single();
        
        if (error) throw error;
        return data || { monedaBase: "CUP", tasas: { CUP: 1, USD: 0.04, EUR: 0.037 } };
    } catch (error) {
        console.error('Error en getGlobalConfig:', error);
        return { monedaBase: "CUP", tasas: { CUP: 1, USD: 0.04, EUR: 0.037 } };
    }
}

// ===========================================
// FUNCIONES PARA IMÁGENES (Storage)
// ===========================================

/**
 * Subir una imagen al bucket de productos
 * @param {File} file - Archivo de imagen
 * @returns {Promise<string|null>} URL pública de la imagen
 */
async function uploadProductImage(file) {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `productos/${fileName}`;
        
        const { data, error } = await supabase.storage
            .from('productos')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });
        
        if (error) throw error;
        
        const { data: { publicUrl } } = supabase.storage
            .from('productos')
            .getPublicUrl(filePath);
        
        return publicUrl;
    } catch (error) {
        console.error('Error en uploadProductImage:', error);
        return null;
    }
}

/**
 * Eliminar una imagen del bucket
 * @param {string} imageUrl - URL de la imagen
 * @returns {Promise<boolean>} Resultado de la operación
 */
async function deleteProductImage(imageUrl) {
    try {
        if (!imageUrl.includes('/storage/v1/object/public/')) return false;
        
        const filePath = imageUrl.split('/productos/')[1];
        if (!filePath) return false;
        
        const { error } = await supabase.storage
            .from('productos')
            .remove([filePath]);
        
        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error en deleteProductImage:', error);
        return false;
    }
}

// ===========================================
// FUNCIÓN PARA GENERAR CÓDIGO ÚNICO
// ===========================================

/**
 * Generar código único para pedidos
 * @returns {string} Código único de 12 caracteres
 */
function generateCodigoUnico() {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let codigo = '';
    for (let i = 0; i < 8; i++) {
        codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
    return `${codigo}${timestamp}`;
}

// ===========================================
// VERIFICAR CONEXIÓN A SUPABASE
// ===========================================

/**
 * Verificar si la conexión a Supabase está activa
 * @returns {Promise<boolean>} Estado de la conexión
 */
async function checkConnection() {
    try {
        const { data, error } = await supabase
            .from('tiendas')
            .select('id')
            .limit(1);
        
        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error de conexión a Supabase:', error);
        return false;
    }
}

// ===========================================
// EXPORTAR FUNCIONES
// ===========================================

// Para usar con módulos ES6
export {
    supabase,
    // Tiendas
    getStores,
    getStoreById,
    getStoreConfig,
    // Productos
    getProducts,
    getProductById,
    getCategories,
    // Pedidos
    createOrder,
    getOrders,
    updateOrderStatus,
    // Configuración
    getGlobalConfig,
    // Imágenes
    uploadProductImage,
    deleteProductImage,
    // Utilidades
    generateCodigoUnico,
    checkConnection
};

// Para usar con script tag (disponible globalmente)
if (typeof window !== 'undefined') {
    window.supabaseClient = {
        getStores,
        getStoreById,
        getStoreConfig,
        getProducts,
        getProductById,
        getCategories,
        createOrder,
        getOrders,
        updateOrderStatus,
        getGlobalConfig,
        uploadProductImage,
        deleteProductImage,
        generateCodigoUnico,
        checkConnection
    };
}