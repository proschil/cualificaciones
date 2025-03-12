/**
 * Visor de Cualificaciones Profesionales
 * 
 * Esta aplicación carga y muestra información sobre cualificaciones profesionales,
 * certificados y ciclos formativos desde tres archivos CSV relacionados.
 * Permite al usuario filtrar la información por familia profesional.
 */

// Contenedores globales de datos
let allData = [];             // Almacena todos los datos combinados después del procesamiento
let familyOptions = [];       // Almacena las opciones únicas de familias profesionales
let file1Data = [],           // Datos del archivo UNO.csv (cualificaciones base)
    file2Data = [],           // Datos del archivo DOS.csv (certificados profesionales)
    file3Data = [];           // Datos del archivo TRES.csv (ciclos formativos)

// Elementos del DOM para interacción con la UI
const familySelect = document.getElementById('familySelect');       // Selector de familia profesional
const tableBody = document.getElementById('tableBody');             // Cuerpo de la tabla para mostrar datos
const loadingElement = document.getElementById('loading');          // Indicador de carga
const tableContainer = document.getElementById('tableContainer');   // Contenedor de la tabla

/**
 * Inicializa la aplicación cuando el DOM está completamente cargado
 * Carga los archivos CSV, procesa los datos y configura los eventos
 */
document.addEventListener('DOMContentLoaded', initApp);

/**
 * Función principal que inicializa la aplicación
 * Carga los datos, los procesa y configura la interfaz de usuario
 */
async function initApp() {
    // Oculta la tabla mientras se cargan los datos
    tableContainer.classList.add('hidden');
    
    try {
        // Carga todos los archivos CSV en paralelo para optimizar el tiempo de carga
        await Promise.all([
            loadCSVFile('data/UNO.csv', 'file1'),     // Archivo de cualificaciones base
            loadCSVFile('data/DOS.csv', 'file2'),     // Archivo de certificados profesionales
            loadCSVFile('data/TRES.csv', 'file3')     // Archivo de ciclos formativos
        ]);
        
        // Combina y procesa los datos de los tres archivos
        processData();
        
        // Rellena el desplegable de familias profesionales
        populateFamilyDropdown();
        
        // Añade el manejador de eventos para el cambio de selección de familia
        familySelect.addEventListener('change', handleFamilyChange);
        
        // Oculta el indicador de carga una vez finalizados los procesos
        loadingElement.classList.add('hidden');
        
        // Muestra el contenedor de la tabla con los datos cargados
        tableContainer.classList.remove('hidden');
        
        // Selecciona automáticamente la primera familia profesional para mostrar datos iniciales
        if (familyOptions.length > 0) {
            familySelect.value = familyOptions[0];
            handleFamilyChange();
        }
    } catch (error) {
        console.error('Error al inicializar la aplicación:', error);
        loadingElement.textContent = 'Error al cargar los datos. Consulta la consola para más detalles.';
    }
}

/**
 * Carga y parsea un archivo CSV usando la biblioteca Papa Parse
 * @param {string} filePath - Ruta al archivo CSV
 * @param {string} fileId - Identificador del archivo ('file1', 'file2' o 'file3')
 * @returns {Promise} - Promesa que se resuelve cuando el archivo se ha cargado
 */
function loadCSVFile(filePath, fileId) {
    return new Promise((resolve, reject) => {
        // Realiza una petición fetch para obtener el contenido del archivo
        fetch(filePath)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Error al cargar ${filePath}: ${response.status} ${response.statusText}`);
                }
                return response.text();
            })
            .then(csvText => {
                // Usa Papa Parse para convertir el texto CSV a un array de objetos
                Papa.parse(csvText, {
                    header: true,              // Usa la primera fila como encabezados
                    skipEmptyLines: true,      // Ignora las líneas vacías
                    complete: (results) => {
                        // Almacena los datos según el identificador del archivo
                        if (fileId === 'file1') {
                            file1Data = results.data;
                        } else if (fileId === 'file2') {
                            file2Data = results.data;
                        } else if (fileId === 'file3') {
                            file3Data = results.data;
                        }
                        console.log(`Cargadas ${results.data.length} filas desde ${filePath}`);
                        resolve();
                    },
                    error: (error) => {
                        console.error(`Error al parsear ${filePath}:`, error);
                        reject(error);
                    }
                });
            })
            .catch(error => {
                console.error(`Error al obtener ${filePath}:`, error);
                reject(error);
            });
    });
}

/**
 * Normaliza el código QP para asegurar consistencia entre archivos
 * Elimina espacios y convierte a minúsculas para evitar problemas de comparación
 * @param {string} code - Código QP a normalizar
 * @returns {string} - Código QP normalizado
 */
function normalizeCode(code) {
    if (!code) return '';
    // Elimina espacios y convierte a minúsculas para comparaciones consistentes
    return code.trim().toLowerCase();
}

/**
 * Procesa y combina los datos de los tres archivos CSV
 * Crea un conjunto unificado de datos usando el código QP como clave
 */
function processData() {
    // Crea un mapa para combinar los datos de los tres archivos usando Código QP como clave
    const combinedDataMap = new Map();
    
    // Crea mapas auxiliares para certificados y ciclos formativos
    const certificadosMap = new Map();
    const ciclosMap = new Map();
    
    // Pre-procesa archivo DOS.csv (certificados) para acceso más rápido
    file2Data.forEach(row => {
        if (row['Código QP'] && row['Código QP'].trim() !== '') {
            const normalizedCode = normalizeCode(row['Código QP']);
            
            // Si ya existe un certificado para este código, lo combina
            if (certificadosMap.has(normalizedCode)) {
                const existingCert = certificadosMap.get(normalizedCode);
                certificadosMap.set(
                    normalizedCode, 
                    `${existingCert} | ${row['Código y certificado'] || row['Certificado Profesional'] || ''}`
                );
            } else {
                certificadosMap.set(
                    normalizedCode, 
                    row['Código y certificado'] || row['Certificado Profesional'] || ''
                );
            }
        }
    });
    
    // Pre-procesa archivo TRES.csv (ciclos formativos) para acceso más rápido
    file3Data.forEach(row => {
        if (row['Código QP'] && row['Código QP'].trim() !== '') {
            const normalizedCode = normalizeCode(row['Código QP']);
            const cicloInfo = `${row['Básico/Medio/Superior'] || ''} - ${row['Ciclo Formativo'] || ''}`;
            
            // Si ya existe un ciclo para este código, lo combina
            if (ciclosMap.has(normalizedCode)) {
                const existingCiclo = ciclosMap.get(normalizedCode);
                ciclosMap.set(normalizedCode, `${existingCiclo} | ${cicloInfo}`);
            } else {
                ciclosMap.set(normalizedCode, cicloInfo);
            }
        }
    });
    
    // Procesa archivo UNO.csv - Contiene información básica de cualificaciones
    file1Data.forEach(row => {
        if (row['Código QP'] && row['Código QP'].trim() !== '') {
            const normalizedCode = normalizeCode(row['Código QP']);
            
            // Obtiene certificado y ciclo si existen (o cadena vacía si no existen)
            const certificado = certificadosMap.get(normalizedCode) || '';
            const ciclo = ciclosMap.get(normalizedCode) || '';
            
            combinedDataMap.set(normalizedCode, {
                'Familia profesional': row['Familia profesional'],
                'Código cualificación': row['Código QP'],
                'Cualificación profesional (Resolución febrero 2025)': row['Cualificación profesional'],
                'Nivel': row['Nivel'],
                'Previsión 2025': row['Previsión 2025'] || '', 
                'Certificado profesional - Grado C (Código y denominación)': certificado,
                'Ciclo formativo - Grado D/Grado básico, medio o superior': ciclo
            });
        }
    });
    
    // Asegura la inclusión de cualificaciones que pueden estar en DOS.csv o TRES.csv pero no en UNO.csv
    
    // Verifica certificados (DOS.csv)
    file2Data.forEach(row => {
        if (row['Código QP'] && row['Código QP'].trim() !== '') {
            const normalizedCode = normalizeCode(row['Código QP']);
            
            if (!combinedDataMap.has(normalizedCode)) {
                // Crea un nuevo registro si no existe
                combinedDataMap.set(normalizedCode, {
                    'Familia profesional': row['Familia profesional'] || '',
                    'Código cualificación': row['Código QP'],
                    'Cualificación profesional (Resolución febrero 2025)': row['Cualificación Profesional'] || '',
                    'Nivel': row['Nivel'] || '',
                    'Previsión 2025': '',
                    'Certificado profesional - Grado C (Código y denominación)': 
                        row['Código y certificado'] || row['Certificado Profesional'] || '',
                    'Ciclo formativo - Grado D/Grado básico, medio o superior': 
                        ciclosMap.get(normalizedCode) || ''
                });
            }
        }
    });
    
    // Verifica ciclos formativos (TRES.csv)
    file3Data.forEach(row => {
        if (row['Código QP'] && row['Código QP'].trim() !== '') {
            const normalizedCode = normalizeCode(row['Código QP']);
            
            if (!combinedDataMap.has(normalizedCode)) {
                // Crea un nuevo registro si no existe
                combinedDataMap.set(normalizedCode, {
                    'Familia profesional': row['Familia profesional'] || '',
                    'Código cualificación': row['Código QP'],
                    'Cualificación profesional (Resolución febrero 2025)': row['Nombre cualificación'] || '',
                    'Nivel': row['Nivel'] || '',
                    'Previsión 2025': '',
                    'Certificado profesional - Grado C (Código y denominación)': 
                        certificadosMap.get(normalizedCode) || '',
                    'Ciclo formativo - Grado D/Grado básico, medio o superior': 
                        `${row['Básico/Medio/Superior'] || ''} - ${row['Ciclo Formativo'] || ''}`
                });
            }
        }
    });
    
    // Convierte el mapa a un array para su uso posterior
    allData = Array.from(combinedDataMap.values());
    
    // Extrae opciones únicas de familias profesionales
    const familySet = new Set();
    
    allData.forEach(row => {
        if (row['Familia profesional'] && row['Familia profesional'].trim() !== '') {
            familySet.add(row['Familia profesional']);
        }
    });
    
    // Ordena alfabéticamente las familias profesionales
    familyOptions = Array.from(familySet).sort();
    
    console.log(`Procesados ${allData.length} registros con ${familyOptions.length} familias profesionales únicas`);
}

/**
 * Rellena el desplegable de selección de familias profesionales
 * con las opciones extraídas de los datos
 */
function populateFamilyDropdown() {
    // Limpia las opciones existentes
    familySelect.innerHTML = '';
    
    // Añade una opción por defecto
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Seleccione una Familia profesional';
    familySelect.appendChild(defaultOption);
    
    // Añade opciones para cada familia
    familyOptions.forEach(family => {
        const option = document.createElement('option');
        option.value = family;
        option.textContent = family;
        familySelect.appendChild(option);
    });
}

/**
 * Maneja el cambio de selección en el desplegable de familias
 * Filtra y muestra los datos correspondientes a la familia seleccionada
 */
function handleFamilyChange() {
    const selectedFamily = familySelect.value;
    
    if (!selectedFamily) {
        // Limpia la tabla si no hay familia seleccionada
        tableBody.innerHTML = '';
        return;
    }
    
    // Filtra los datos basándose en la familia seleccionada
    const filteredData = allData.filter(row => 
        row['Familia profesional'] === selectedFamily
    );
    
    // Muestra los datos filtrados en la tabla
    renderTable(filteredData);
}

/**
 * Renderiza la tabla con los datos filtrados
 * @param {Array} data - Array de objetos con datos a mostrar
 */
function renderTable(data) {
    // Limpia las filas existentes en la tabla
    tableBody.innerHTML = '';
    
    // Si no hay datos, muestra un mensaje
    if (data.length === 0) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 6; // Abarca todas las columnas
        cell.textContent = 'No hay datos disponibles para esta selección';
        cell.style.textAlign = 'center';
        row.appendChild(cell);
        tableBody.appendChild(row);
        return;
    }
    
    // Crea una fila para cada elemento de datos
    data.forEach(item => {
        const row = document.createElement('tr');
        
        // Añade celdas para cada columna requerida
        addCell(row, item['Código cualificación']);
        addCell(row, item['Cualificación profesional (Resolución febrero 2025)']);
        addCell(row, item['Nivel']);
        addCell(row, item['Previsión 2025']);
        addCell(row, item['Certificado profesional - Grado C (Código y denominación)']);
        addCell(row, item['Ciclo formativo - Grado D/Grado básico, medio o superior']);
        
        tableBody.appendChild(row);
    });
}

/**
 * Función auxiliar para añadir una celda a una fila
 * @param {HTMLElement} row - Elemento de fila HTML
 * @param {string} text - Texto a mostrar en la celda
 */
function addCell(row, text) {
    const cell = document.createElement('td');
    cell.textContent = text || ''; // Maneja valores undefined o null
    row.appendChild(cell);
}

/**
 * Función auxiliar para añadir una celda con una clase CSS
 * @param {HTMLElement} row - Elemento de fila HTML
 * @param {string} text - Texto a mostrar en la celda
 * @param {string} className - Nombre de la clase CSS a aplicar
 */
function addCellWithClass(row, text, className) {
    const cell = document.createElement('td');
    cell.textContent = text || ''; // Maneja valores undefined o null
    cell.classList.add(className);
    row.appendChild(cell);
}