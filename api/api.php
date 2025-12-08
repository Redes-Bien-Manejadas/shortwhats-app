<?php
/********************************
Simple API generator
Copyright (REDY) Luis Guzmán
Autor: Redyman
Liscense: MIT
Versión: 3.0
********************************/
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header("Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept");
// header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json'); //

// Obtener el método HTTP y el parámetro api
$method = $_SERVER['REQUEST_METHOD'];
$api = isset($_GET['api']) ? $_GET['api'] : '';
$user = isset($_GET['user']) ? $_GET['user'] : '';

// Configuración para gestión de archivos
$config = [
    'upload_dir' => 'uploads/',
    'users_dir' => 'users/',
    'max_file_size' => 10485760, // 10MB en bytes
    'allowed_extensions' => ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'zip', 'rar', 'webp'],
    'allowed_mime_types' => [
        'image/jpeg', 'image/png', 'image/gif',
        'application/pdf',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'application/zip', 'application/x-rar-compressed'
    ]
];

// Crear funciones útiles para manejar directorios y archivos
function getFullPath($folder = '', $filename = '') {
    $base_path = './'; // Directorio base
    $folder_path = ($folder !== '') ? $folder . '/' : '';
    return $base_path . $folder_path . $filename;
}

function createFolderIfNotExists($folder) {
    if (!empty($folder) && !is_dir(getFullPath($folder))) {
        mkdir(getFullPath($folder), 0755, true);
        return true;
    }
    return false;
}

function getFilesList($folder = '') {
    return glob(getFullPath($folder, '*.json'));
}

function getDirectoriesList() {
    $dirs = array_filter(glob('./*'), 'is_dir');
    return array_map(function($dir) {
        return basename($dir);
    }, $dirs);
}

function searchInFiles($searchTerm, $folder = '', $searchInContent = false) {
    $results = [];
    $files = getFilesList($folder);

    foreach ($files as $file) {
        $filename = basename($file);
        // Buscar en nombre de archivo
        if (stripos($filename, $searchTerm) !== false) {
            $results[] = [
                'file' => $filename,
                'folder' => $folder,
                'match' => 'filename'
            ];
        }

        // Si se solicita buscar en contenido
        if ($searchInContent) {
            $content = json_decode(file_get_contents($file), true);
            // Convertimos el contenido a string para búsqueda simple
            $contentStr = json_encode($content);
            if (stripos($contentStr, $searchTerm) !== false) {
                $results[] = [
                    'file' => $filename,
                    'folder' => $folder,
                    'match' => 'content'
                ];
            }
        }
    }

    return $results;
}

function getItemIndex($key, $itemId, $folder = '') {
    $filePath = getFullPath($folder, "$key.json");
    if (file_exists($filePath)) {
        $data = json_decode(file_get_contents($filePath), true);
        if (isset($data['estructura']) && is_array($data['estructura'])) {
            foreach ($data['estructura'] as $index => $item) {
                // Asumimos que cada item tiene un id o identificador similar
                if (isset($item['id']) && $item['id'] == $itemId) {
                    return $index;
                }
            }
        }
    }
    return -1; // No encontrado
}

function updateSpecificProperty($key, $propertyPath, $newValue, $folder = '') {
    $filePath = getFullPath($folder, "$key.json");
    if (file_exists($filePath)) {
        $data = json_decode(file_get_contents($filePath), true);
        if (!isset($data['estructura']) || !is_array($data['estructura'])) {
            return ['success' => false, 'message' => 'Estructura no válida'];
        }

        $updated = 0;
        // Dividir la ruta de la propiedad (ejemplo: "user.profile.name")
        $properties = explode('.', $propertyPath);

        // Función recursiva para actualizar propiedades anidadas
        $updateNestedProp = function(&$item, $props, $depth = 0) use (&$updateNestedProp, $newValue, &$updated) {
            if ($depth >= count($props) - 1) {
                if (isset($item[$props[$depth]])) {
                    $item[$props[$depth]] = $newValue;
                    $updated++;
                }
                return;
            }

            if (isset($item[$props[$depth]]) && is_array($item[$props[$depth]])) {
                $updateNestedProp($item[$props[$depth]], $props, $depth + 1);
            }
        };

        // Actualizar cada elemento de la estructura
        foreach ($data['estructura'] as &$item) {
            $updateNestedProp($item, $properties);
        }

        // Guardar cambios
        file_put_contents($filePath, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

        return [
            'success' => true,
            'message' => "Se actualizaron $updated elementos",
            'count' => $updated
        ];
    }

    return ['success' => false, 'message' => 'Archivo no encontrado'];
}

// FUNCIONES PARA GESTIÓN DE ARCHIVOS

/**
 * Sanitiza un nombre de archivo
 * Elimina caracteres especiales y espacios
 */
function sanitizeFileName($fileName) {
    // Obtener extensión
    $fileInfo = pathinfo($fileName);
    $extension = isset($fileInfo['extension']) ? '.' . $fileInfo['extension'] : '';
    $baseName = isset($fileInfo['filename']) ? $fileInfo['filename'] : $fileName;

    // Eliminar caracteres no deseados
    $baseName = preg_replace('/[^a-zA-Z0-9_-]/', '', $baseName);

    // Convertir a minúsculas
    $baseName = strtolower($baseName);

    // Asegurar que no quede vacío
    if (empty($baseName)) {
        $baseName = 'file_' . time();
    }

    return $baseName . $extension;
}

/**
 * Valida un archivo según las restricciones configuradas
 */
function validateFile($file, $config) {
    // Verify if there are errors
    if ($file['error'] !== UPLOAD_ERR_OK) {
        return [
            'valid' => false,
            'message' => getUploadErrorMessage($file['error'])
        ];
    }

    // Verify size
    if ($file['size'] > $config['max_file_size']) {
        return [
            'valid' => false,
            'message' => 'El archivo excede el tamaño máximo permitido (' . formatBytes($config['max_file_size']) . ')'
        ];
    }

    // Verify extension
    $fileInfo = pathinfo($file['name']);
    $extension = strtolower($fileInfo['extension']);
    if (!in_array($extension, $config['allowed_extensions'])) {
        return [
            'valid' => false,
            'message' => 'Extensión de archivo no permitida'
        ];
    }

    // Use file type from upload instead of finfo
    $mime = $file['type'];

    if (!in_array($mime, $config['allowed_mime_types'])) {
        return [
            'valid' => false,
            'message' => 'Tipo de archivo no permitido'
        ];
    }

    return ['valid' => true];
}

/**
 * Obtiene mensaje de error según código
 */
function getUploadErrorMessage($error) {
    switch ($error) {
        case UPLOAD_ERR_INI_SIZE:
            return 'El archivo excede el tamaño máximo permitido por el servidor';
        case UPLOAD_ERR_FORM_SIZE:
            return 'El archivo excede el tamaño máximo permitido por el formulario';
        case UPLOAD_ERR_PARTIAL:
            return 'El archivo fue subido parcialmente';
        case UPLOAD_ERR_NO_FILE:
            return 'No se subió ningún archivo';
        case UPLOAD_ERR_NO_TMP_DIR:
            return 'Falta la carpeta temporal';
        case UPLOAD_ERR_CANT_WRITE:
            return 'No se pudo escribir el archivo en el disco';
        case UPLOAD_ERR_EXTENSION:
            return 'Una extensión PHP detuvo la subida';
        default:
            return 'Error desconocido al subir el archivo';
    }
}

/**
 * Formatea bytes a unidades legibles
 */
function formatBytes($bytes, $precision = 2) {
    $units = ['B', 'KB', 'MB', 'GB', 'TB'];

    $bytes = max($bytes, 0);
    $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
    $pow = min($pow, count($units) - 1);

    $bytes /= pow(1024, $pow);

    return round($bytes, $precision) . ' ' . $units[$pow];
}

/**
 * Sube un archivo al servidor
 */
function uploadFile($file, $targetDir, $customName = null) {
    global $config;

    // Validar archivo
    $validation = validateFile($file, $config);
    if (!$validation['valid']) {
        return [
            'success' => false,
            'message' => $validation['message']
        ];
    }

    // Crear directorio si no existe
    if (!file_exists($targetDir)) {
        mkdir($targetDir, 0755, true);
    }

    // Generar nombre de archivo
    $fileName = $customName ? $customName : sanitizeFileName($file['name']);

    // Si ya existe, agregar timestamp
    if (file_exists($targetDir . $fileName)) {
        $fileInfo = pathinfo($fileName);
        $extension = isset($fileInfo['extension']) ? '.' . $fileInfo['extension'] : '';
        $baseName = isset($fileInfo['filename']) ? $fileInfo['filename'] : $fileName;
        $fileName = $baseName . '_' . time() . $extension;
    }

    // Ruta completa
    $targetFile = $targetDir . $fileName;

    // Subir archivo
    if (move_uploaded_file($file['tmp_name'], $targetFile)) {
        return [
            'success' => true,
            'message' => 'Archivo subido correctamente',
            'file' => [
                'name' => $fileName,
                'path' => $targetFile,
                'size' => $file['size'],
                'type' => $file['type']
            ]
        ];
    } else {
        return [
            'success' => false,
            'message' => 'Error al subir el archivo'
        ];
    }
}

// FUNCIONES PARA GESTIÓN DE USUARIOS

/**
 * Crea o actualiza un usuario
 */
function saveUser($userData, $isUpdate = false) {
    global $config;

    // Validar datos requeridos
    if (!isset($userData['username']) || empty($userData['username'])) {
        return ['success' => false, 'message' => 'Nombre de usuario requerido'];
    }

    if (!$isUpdate && (!isset($userData['password']) || empty($userData['password']))) {
        return ['success' => false, 'message' => 'Contraseña requerida'];
    }

    // Sanitizar nombre de usuario (será usado como nombre de archivo)
    $username = sanitizeFileName($userData['username']);
    $userData['username'] = $username;

    // Crear directorio de usuarios si no existe
    $usersDir = $config['users_dir'];
    createFolderIfNotExists($usersDir);

    // Ruta al archivo de usuario
    $userFile = getFullPath($usersDir, "$username.json");

    // Verificar si el usuario ya existe
    $userExists = file_exists($userFile);

    if (!$isUpdate && $userExists) {
        return ['success' => false, 'message' => 'El nombre de usuario ya está en uso'];
    }

    if ($isUpdate && !$userExists) {
        return ['success' => false, 'message' => 'Usuario no encontrado'];
    }

    // Para actualización, preservar datos existentes
    if ($isUpdate) {
        $existingData = json_decode(file_get_contents($userFile), true);
        // Verificar si password está vacía (no se quiere actualizar)
        if (!isset($userData['password']) || empty($userData['password'])) {
            $userData['password'] = $existingData['password'];
        } else {
            // Hash de la nueva contraseña
            $userData['password'] = password_hash($userData['password'], PASSWORD_DEFAULT);
        }
        // Fusionar datos
        $userData = array_merge($existingData, $userData);
    } else {
        // Hash de la contraseña para nuevo usuario
        $userData['password'] = password_hash($userData['password'], PASSWORD_DEFAULT);
        // Agregar fecha de creación
        $userData['created_at'] = date('Y-m-d H:i:s');
    }

    // Actualizar fecha de modificación
    $userData['updated_at'] = date('Y-m-d H:i:s');

    // Guardar datos
    file_put_contents($userFile, json_encode($userData, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

    return [
        'success' => true,
        'message' => $isUpdate ? 'Usuario actualizado correctamente' : 'Usuario creado correctamente',
        'username' => $username
    ];
}

/**
 * Verifica credenciales de usuario
 */
function loginUser($credentials) {
    global $config;

    // Validar datos requeridos
    if (!isset($credentials['username']) || empty($credentials['username']) ||
        !isset($credentials['password']) || empty($credentials['password'])) {
        return ['success' => false, 'message' => 'Nombre de usuario y contraseña requeridos'];
    }

    // Sanitizar nombre de usuario
    $username = sanitizeFileName($credentials['username']);

    // Ruta al archivo de usuario
    $userFile = getFullPath($config['users_dir'], "$username.json");

    // Verificar si el usuario existe
    if (!file_exists($userFile)) {
        return ['success' => false, 'message' => 'Usuario o contraseña incorrectos'];
    }

    // Obtener datos del usuario
    $userData = json_decode(file_get_contents($userFile), true);

    // Verificar contraseña
    if (!password_verify($credentials['password'], $userData['password'])) {
        return ['success' => false, 'message' => 'Usuario o contraseña incorrectos'];
    }

    // Eliminar contraseña de los datos a devolver
    unset($userData['password']);

    return [
        'success' => true,
        'message' => 'Inicio de sesión exitoso',
        'user' => $userData
    ];
}

/**
 * Obtiene datos de un usuario
 */
function getUserDetails($username) {
    global $config;

    // Sanitizar nombre de usuario
    $username = sanitizeFileName($username);

    // Ruta al archivo de usuario
    $userFile = getFullPath($config['users_dir'], "$username.json");

    // Verificar si el usuario existe
    if (!file_exists($userFile)) {
        return ['success' => false, 'message' => 'Usuario no encontrado'];
    }

    // Obtener datos del usuario
    $userData = json_decode(file_get_contents($userFile), true);

    // Eliminar contraseña de los datos a devolver
    unset($userData['password']);

    return [
        'success' => true,
        'user' => $userData
    ];
}

/**
 * Elimina un usuario
 */
function deleteUser($username, $confirmKey) {
    global $config;

    // Sanitizar nombre de usuario
    $username = sanitizeFileName($username);

    // Ruta al archivo de usuario
    $userFile = getFullPath($config['users_dir'], "$username.json");

    // Verificar si el usuario existe
    if (!file_exists($userFile)) {
        return ['success' => false, 'message' => 'Usuario no encontrado'];
    }

    // Obtener datos del usuario
    $userData = json_decode(file_get_contents($userFile), true);

    // Verificar palabra clave de eliminación
    if (!isset($userData['delete_key']) || $userData['delete_key'] !== $confirmKey) {
        return ['success' => false, 'message' => 'Palabra clave de eliminación incorrecta'];
    }

    // Eliminar archivo
    unlink($userFile);

    return [
        'success' => true,
        'message' => 'Usuario eliminado correctamente'
    ];
}

// MANEJO DE PETICIONES
if ($method == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Procesamiento de solicitudes de usuario
if (!empty($user)) {
    switch ($user) {
        case 'register':
            if ($method == 'POST') {
                $content = trim(file_get_contents("php://input"));
                $userData = json_decode($content, true);
                $result = saveUser($userData);
                echo json_encode($result, JSON_UNESCAPED_UNICODE);
            } else {
                http_response_code(405);
                echo json_encode(['success' => false, 'message' => 'Método no permitido'], JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'login':
            if ($method == 'POST') {
                $content = trim(file_get_contents("php://input"));
                $credentials = json_decode($content, true);
                $result = loginUser($credentials);
                echo json_encode($result, JSON_UNESCAPED_UNICODE);
            } else {
                http_response_code(405);
                echo json_encode(['success' => false, 'message' => 'Método no permitido'], JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'update':
            if ($method == 'POST') {
                $content = trim(file_get_contents("php://input"));
                $userData = json_decode($content, true);
                $result = saveUser($userData, true);
                echo json_encode($result, JSON_UNESCAPED_UNICODE);
            } else {
                http_response_code(405);
                echo json_encode(['success' => false, 'message' => 'Método no permitido'], JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'forgot':
            if ($method == 'POST') {
                $content = trim(file_get_contents("php://input"));
                $data = json_decode($content, true);

                if (!isset($data['username']) || empty($data['username'])) {
                    echo json_encode(['success' => false, 'message' => 'Nombre de usuario requerido'], JSON_UNESCAPED_UNICODE);
                    break;
                }

                $username = sanitizeFileName($data['username']);
                $userFile = getFullPath($config['users_dir'], "$username.json");

                if (!file_exists($userFile)) {
                    echo json_encode(['success' => false, 'message' => 'Usuario no encontrado'], JSON_UNESCAPED_UNICODE);
                    break;
                }

                // En un sistema real, aquí enviaríamos un correo con un enlace para restablecer
                // Para esta demo, simplemente generamos una nueva contraseña temporal
                $tempPassword = substr(md5(time()), 0, 8);

                $userData = json_decode(file_get_contents($userFile), true);
                $userData['password'] = password_hash($tempPassword, PASSWORD_DEFAULT);
                $userData['password_reset'] = true;
                $userData['updated_at'] = date('Y-m-d H:i:s');

                file_put_contents($userFile, json_encode($userData, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

                echo json_encode([
                    'success' => true,
                    'message' => 'Se ha generado una contraseña temporal',
                    'temp_password' => $tempPassword // En un sistema real NO enviaríamos esto directamente
                ], JSON_UNESCAPED_UNICODE);
            } else {
                http_response_code(405);
                echo json_encode(['success' => false, 'message' => 'Método no permitido'], JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'details':
            if ($method == 'GET') {
                if (!isset($_GET['username']) || empty($_GET['username'])) {
                    echo json_encode(['success' => false, 'message' => 'Nombre de usuario requerido'], JSON_UNESCAPED_UNICODE);
                    break;
                }

                $result = getUserDetails($_GET['username']);
                echo json_encode($result, JSON_UNESCAPED_UNICODE);
            } else {
                http_response_code(405);
                echo json_encode(['success' => false, 'message' => 'Método no permitido'], JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'delete':
            if ($method == 'POST') {
                $content = trim(file_get_contents("php://input"));
                $data = json_decode($content, true);

                if (!isset($data['username']) || empty($data['username']) ||
                    !isset($data['delete_key']) || empty($data['delete_key'])) {
                    echo json_encode(['success' => false, 'message' => 'Nombre de usuario y palabra clave de eliminación requeridos'], JSON_UNESCAPED_UNICODE);
                    break;
                }

                $result = deleteUser($data['username'], $data['delete_key']);
                echo json_encode($result, JSON_UNESCAPED_UNICODE);
            } else {
                http_response_code(405);
                echo json_encode(['success' => false, 'message' => 'Método no permitido'], JSON_UNESCAPED_UNICODE);
            }
            break;

        default:
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Operación de usuario no encontrada'], JSON_UNESCAPED_UNICODE);
            break;
    }
    exit();
}

// Procesamiento de solicitudes API JSON
switch ($api) {
    // GESTIÓN DE ARCHIVOS

    // Subir un archivo
    case 'upload_file':
        if ($method == 'POST') {
            if (!isset($_FILES['file'])) {
                echo json_encode(['success' => false, 'message' => 'No se ha enviado ningún archivo'], JSON_UNESCAPED_UNICODE);
                break;
            }

            $folder = isset($_POST['folder']) ? $_POST['folder'] : $config['upload_dir'];
            $customName = isset($_POST['custom_name']) ? $_POST['custom_name'] : null;

            $result = uploadFile($_FILES['file'], getFullPath($folder), $customName);
            echo json_encode($result, JSON_UNESCAPED_UNICODE);
        } else {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido'], JSON_UNESCAPED_UNICODE);
        }
        break;

    // Subir múltiples archivos
    case 'upload_multiple':
        if ($method == 'POST') {
            if (!isset($_FILES['files'])) {
                echo json_encode(['success' => false, 'message' => 'No se han enviado archivos'], JSON_UNESCAPED_UNICODE);
                break;
            }

            $folder = isset($_POST['folder']) ? $_POST['folder'] : $config['upload_dir'];
            $results = [];

            $filesCount = count($_FILES['files']['name']);

            for ($i = 0; $i < $filesCount; $i++) {
                $file = [
                    'name' => $_FILES['files']['name'][$i],
                    'type' => $_FILES['files']['type'][$i],
                    'tmp_name' => $_FILES['files']['tmp_name'][$i],
                    'error' => $_FILES['files']['error'][$i],
                    'size' => $_FILES['files']['size'][$i]
                ];

                $results[] = uploadFile($file, getFullPath($folder));
            }

            echo json_encode([
                'success' => true,
                'results' => $results
            ], JSON_UNESCAPED_UNICODE);
        } else {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido'], JSON_UNESCAPED_UNICODE);
        }
        break;

    // Listar archivos
    case 'list_files':
        if ($method == 'GET') {
            $folder = isset($_GET['folder']) ? $_GET['folder'] : $config['upload_dir'];
            $files = [];

            $folderPath = getFullPath($folder);
            if (file_exists($folderPath) && is_dir($folderPath)) {
                $allFiles = glob($folderPath . '*');

                foreach ($allFiles as $file) {
                    if (is_file($file)) {
                        $fileInfo = [
                            'name' => basename($file),
                            'path' => $file,
                            'size' => filesize($file),
                            'type' => mime_content_type($file),
                            'modified' => date('Y-m-d H:i:s', filemtime($file))
                        ];
                        $files[] = $fileInfo;
                    }
                }
            }

            echo json_encode([
                'success' => true,
                'folder' => $folder,
                'files' => $files
            ], JSON_UNESCAPED_UNICODE);
        } else {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido'], JSON_UNESCAPED_UNICODE);
        }
        break;

    // Eliminar un archivo
    case 'delete_file':
        if ($method == 'POST') {
            $content = trim(file_get_contents("php://input"));
            $data = json_decode($content, true);

            if (!isset($data['file']) || empty($data['file'])) {
                echo json_encode(['success' => false, 'message' => 'Nombre de archivo requerido'], JSON_UNESCAPED_UNICODE);
                break;
            }

            $folder = isset($data['folder']) ? $data['folder'] : $config['upload_dir'];
            $filePath = getFullPath($folder, $data['file']);

            if (!file_exists($filePath) || !is_file($filePath)) {
                echo json_encode(['success' => false, 'message' => 'Archivo no encontrado'], JSON_UNESCAPED_UNICODE);
                break;
            }

            if (unlink($filePath)) {
                echo json_encode(['success' => true, 'message' => 'Archivo eliminado correctamente'], JSON_UNESCAPED_UNICODE);
            } else {
                echo json_encode(['success' => false, 'message' => 'Error al eliminar el archivo'], JSON_UNESCAPED_UNICODE);
            }
        } else {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido'], JSON_UNESCAPED_UNICODE);
        }
        break;

    // FUNCIONALIDADES ORIGINALES

    // LISTADO DE DIRECTORIOS
    case 'folders':
        if ($method == 'GET') {
            $dirs = getDirectoriesList();
            echo json_encode(['success' => true, 'folders' => $dirs], JSON_UNESCAPED_UNICODE);
        } else {
            http_response_code(405);
        }
        break;

    // CREAR DIRECTORIO
    case 'create_folder':
        if ($method == 'POST') {
            $content = trim(file_get_contents("php://input"));
            $contentArray = json_decode($content, true);

            if (!isset($contentArray['folder']) || empty($contentArray['folder'])) {
                echo json_encode(['success' => false, 'message' => 'Nombre de carpeta requerido'], JSON_UNESCAPED_UNICODE);
                break;
            }

            $folder = $contentArray['folder'];
            $created = createFolderIfNotExists($folder);

            if ($created) {
                echo json_encode(['success' => true, 'message' => "Carpeta '$folder' creada correctamente"], JSON_UNESCAPED_UNICODE);
            } else {
                echo json_encode(['success' => false, 'message' => "La carpeta '$folder' ya existe o no se pudo crear"], JSON_UNESCAPED_UNICODE);
            }
        } else {
            http_response_code(405);
        }
        break;

    // OBTENER TODOS LOS ARCHIVOS
    case 'all':
        if ($method == 'GET') {
            $folder = isset($_GET['folder']) ? $_GET['folder'] : '';
            $files = getFilesList($folder);
            $data = [];
            foreach ($files as $file) {
                $item = json_decode(file_get_contents($file), true);
                // Extraer solo la estructura si existe la key
                if (isset($item['key']) && isset($item['estructura'])) {
                    $data[] = $item['estructura'];
                } else {
                    // Mantener el item original si no tiene key
                    $data[] = $item;
                }
            }
            echo json_encode(['success' => true, 'data' => $data], JSON_UNESCAPED_UNICODE);
        } else {
            http_response_code(405);
        }
        break;

    // OBTENER ESTRUCTURA COMPLETA
    case 'all_estructura':
        if ($method == 'GET') {
            $folder = isset($_GET['folder']) ? $_GET['folder'] : '';
            // Listar todos los archivos en el directorio
            $files = getFilesList($folder);
            $data = [];
            foreach ($files as $file) {
                $item = json_decode(file_get_contents($file), true);
                $data[] = $item;
            }
            echo json_encode(['success' => true, 'data' => $data], JSON_UNESCAPED_UNICODE);
        } else {
            http_response_code(405); // Método no permitido
        }
        break;

    // OBTENER DATOS PARA WEB
    case 'web':
        if ($method == 'GET') {
            $key = $_GET['key'];
            $folder = isset($_GET['folder']) ? $_GET['folder'] : '';
            $filePath = getFullPath($folder, "$key.json");

            if (file_exists($filePath)) {
                $data = json_decode(file_get_contents($filePath), true);
                echo json_encode(['success' => true, 'data' => $data['estructura']], JSON_UNESCAPED_UNICODE);
            } else {
                echo json_encode(['success' => false, 'message' => 'No se encontró la configuración'], JSON_UNESCAPED_UNICODE);
            }
        } else {
            http_response_code(405); // Método no permitido
        }
        break;

    // INSERTAR NUEVO ARCHIVO
    case 'insert':
        if ($method == 'POST') {
            $content = trim(file_get_contents("php://input"));
            $contentArray = json_decode($content, true);

            if (!isset($contentArray['key']) || !isset($contentArray['estructura'])) {
                echo json_encode(['success' => false, 'message' => 'Faltan datos requeridos'], JSON_UNESCAPED_UNICODE);
                break;
            }

            $key = $contentArray['key'];
            $estructura = $contentArray['estructura'];
            $folder = isset($contentArray['folder']) ? $contentArray['folder'] : '';

            // Crear carpeta si no existe y se especificó
            if (!empty($folder)) {
                createFolderIfNotExists($folder);
            }

            $filePath = getFullPath($folder, "$key.json");
            $data = ['key' => $key, 'estructura' => $estructura];
            file_put_contents($filePath, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
            echo json_encode(['success' => true, 'message' => "Configuración guardada correctamente"], JSON_UNESCAPED_UNICODE);
        } else {
            http_response_code(405); // Método no permitido
        }
        break;

    // ACTUALIZAR ARCHIVO
    case 'update':
        if ($method == 'POST') {
            $content = trim(file_get_contents("php://input"));
            $contentArray = json_decode($content, true);

            if (!isset($contentArray['key']) || !isset($contentArray['estructura'])) {
                echo json_encode(['success' => false, 'message' => 'Faltan datos requeridos'], JSON_UNESCAPED_UNICODE);
                break;
            }

            $key = $contentArray['key'];
            $estructura = $contentArray['estructura'];
            $folder = isset($contentArray['folder']) ? $contentArray['folder'] : '';
            $filePath = getFullPath($folder, "$key.json");

            if (file_exists($filePath)) {
                $data = ['key' => $key, 'estructura' => $estructura];
                file_put_contents($filePath, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
                echo json_encode(['success' => true, 'message' => "Configuración actualizada correctamente"], JSON_UNESCAPED_UNICODE);
            } else {
                echo json_encode(['success' => false, 'message' => 'No se encontró la configuración'], JSON_UNESCAPED_UNICODE);
            }
        } else {
            http_response_code(405); // Método no permitido
        }
        break;

    // ACTUALIZAR PROPIEDAD ESPECÍFICA
    case 'update_property':
        if ($method == 'POST') {
            $content = trim(file_get_contents("php://input"));
            $contentArray = json_decode($content, true);

            if (!isset($contentArray['key']) || !isset($contentArray['property']) || !isset($contentArray['value'])) {
                echo json_encode(['success' => false, 'message' => 'Faltan datos requeridos'], JSON_UNESCAPED_UNICODE);
                break;
            }

            $key = $contentArray['key'];
            $property = $contentArray['property'];
            $value = $contentArray['value'];
            $folder = isset($contentArray['folder']) ? $contentArray['folder'] : '';

            $result = updateSpecificProperty($key, $property, $value, $folder);
            echo json_encode($result, JSON_UNESCAPED_UNICODE);
        } else {
            http_response_code(405); // Método no permitido
        }
        break;

    // OBTENER ÍNDICE DE UN ELEMENTO
    case 'get_index':
        if ($method == 'GET') {
            $key = $_GET['key'];
            $itemId = $_GET['item_id'];
            $folder = isset($_GET['folder']) ? $_GET['folder'] : '';

            $index = getItemIndex($key, $itemId, $folder);
            if ($index >= 0) {
                echo json_encode(['success' => true, 'index' => $index], JSON_UNESCAPED_UNICODE);
            } else {
                echo json_encode(['success' => false, 'message' => 'Elemento no encontrado'], JSON_UNESCAPED_UNICODE);
            }
        } else {
            http_response_code(405); // Método no permitido
        }
        break;

    // BUSCAR EN ARCHIVOS
    case 'search':
        if ($method == 'GET') {
            $searchTerm = $_GET['term'];
            $folder = isset($_GET['folder']) ? $_GET['folder'] : '';
            $searchInContent = isset($_GET['content']) && $_GET['content'] === 'true';

            $results = searchInFiles($searchTerm, $folder, $searchInContent);
            echo json_encode(['success' => true, 'results' => $results], JSON_UNESCAPED_UNICODE);
        } else {
            http_response_code(405); // Método no permitido
        }
        break;

    // ELIMINAR ARCHIVO
    case 'delete':
        if ($method == 'GET') {
            $key = $_GET['key'];
            $folder = isset($_GET['folder']) ? $_GET['folder'] : '';
            $filePath = getFullPath($folder, "$key.json");

            if (file_exists($filePath)) {
                unlink($filePath);
                echo json_encode(['success' => true, 'message' => "Configuración eliminada correctamente"], JSON_UNESCAPED_UNICODE);
            } else {
                echo json_encode(['success' => false, 'message' => 'No se encontró la configuración'], JSON_UNESCAPED_UNICODE);
            }
        } else {
            http_response_code(405); // Método no permitido
        }
        break;

    default:
        http_response_code(404); // No encontrado
        echo json_encode(['success' => false, 'message' => 'Endpoint no encontrado'], JSON_UNESCAPED_UNICODE);
        break;
}
?>