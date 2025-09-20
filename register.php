<?php
// registrar.php
session_start();
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = filter_var(trim($_POST['email'] ?? ''), FILTER_VALIDATE_EMAIL);
    $password = trim($_POST['password'] ?? '');

    if (!$email || strlen($password) < 6) {
        // Entrada inválida
        header('Location: register.html');
        exit;
    }

    // Hashear la contraseña
    $hash = password_hash($password, PASSWORD_DEFAULT);

    // Insertar en la base de datos
    try {
        $stmt = $pdo->prepare('INSERT INTO usuario (correo_electronico, contrasena) VALUES (:email, :pass)');
        $stmt->execute(['email' => $email, 'pass' => $hash]);

        // Iniciar sesión automáticamente
        $_SESSION['user_email'] = $email;

        // Redirigir al index.html
        header('Location: index.html');
        exit;
    } catch (PDOException $e) {
        // Si el correo ya existe u otro error
        header('Location: register.html');
        exit;
    }
} else {
    header('Location: register.html');
    exit;
}
