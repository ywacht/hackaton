<?php
// config.php - coloca en la raíz de tu proyecto y ajusta valores
$host = 'localhost';
$db   = 'sistema_login';
$user = 'tu_usuario_mysql';
$pass = 'tu_contraseña_mysql';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (PDOException $e) {
    // En producción no mostrar detalles
    exit('Error de conexión a la base de datos.');
}
