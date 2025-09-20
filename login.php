<?php
// login.php
session_start();
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = filter_var(trim($_POST['email'] ?? ''), FILTER_VALIDATE_EMAIL);
    $password = trim($_POST['password'] ?? '');

    if (!$email || $password === '') {
        header('Location: login.html');
        exit;
    }

    // Buscar usuario
    $stmt = $pdo->prepare('SELECT idusuario, correo_electronico, contrasena FROM usuario WHERE correo_electronico = :email LIMIT 1');
    $stmt->execute(['email' => $email]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['contrasena'])) {
        // Login correcto: crear sesión
        session_regenerate_id(true);
        $_SESSION['user_id'] = $user['idusuario'];
        $_SESSION['user_email'] = $user['correo_electronico'];

        // Redirigir al index.html
        header('Location: index.html');
        exit;
    } else {
        // Login fallido
        header('Location: login.html');
        exit;
    }
} else {
    header('Location: login.html');
    exit;
}
