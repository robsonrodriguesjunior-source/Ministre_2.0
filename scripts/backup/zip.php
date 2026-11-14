<?php

/*
 * Ajudante dos backups do Ministre: cria e abre arquivos .zip criptografados com AES-256.
 * Abre também no 7-Zip ou no WinRAR de qualquer computador, com a mesma senha.
 *
 *   php zip.php pack   <saida.zip> <arquivo-da-senha> <pasta-de-origem>
 *   php zip.php unpack <backup.zip> <arquivo-da-senha> <pasta-de-destino>
 *   php zip.php check  <backup.zip> <arquivo-da-senha>     (confere se abre e se nada está corrompido)
 */

if ($argc < 4) {
    fwrite(STDERR, "Uso: php zip.php pack|unpack|check <zip> <arquivo-da-senha> [pasta]\n");
    exit(2);
}

[, $mode, $zipPath, $passwordFile] = $argv;
$dir = $argv[4] ?? null;

$password = trim((string) @file_get_contents($passwordFile));
if (strlen($password) < 20) {
    fwrite(STDERR, "Senha do backup não encontrada ou curta demais em {$passwordFile}\n");
    exit(3);
}

$zip = new ZipArchive;

if ($mode === 'pack') {
    if (! $dir || ! is_dir($dir)) {
        fwrite(STDERR, "Pasta de origem não existe: {$dir}\n");
        exit(2);
    }
    if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
        fwrite(STDERR, "Não foi possível criar {$zipPath}\n");
        exit(4);
    }
    $base = rtrim(str_replace('\\', '/', realpath($dir)), '/').'/';
    $files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS));
    $count = 0;
    foreach ($files as $file) {
        if (! $file->isFile()) {
            continue;
        }
        $name = substr(str_replace('\\', '/', $file->getRealPath()), strlen($base));
        $zip->addFile($file->getRealPath(), $name);
        $zip->setEncryptionName($name, ZipArchive::EM_AES_256, $password);
        $count++;
    }
    if (! $zip->close()) {
        fwrite(STDERR, "Falhou ao gravar {$zipPath}\n");
        exit(4);
    }
    echo "{$count} arquivos criptografados em {$zipPath}\n";
    exit(0);
}

if ($zip->open($zipPath, ZipArchive::CHECKCONS) !== true) {
    fwrite(STDERR, "Arquivo de backup corrompido ou inexistente: {$zipPath}\n");
    exit(5);
}
$zip->setPassword($password);

if ($mode === 'check') {
    for ($i = 0; $i < $zip->numFiles; $i++) {
        $name = $zip->getNameIndex($i);
        $stat = $zip->statIndex($i);
        // Com AES a própria criptografia confere a integridade (se mudou um byte, não abre);
        // arquivos pequenos nem guardam o CRC (fica 0), então só conferimos quando existe.
        $content = $zip->getFromIndex($i);
        if ($content === false || strlen($content) !== $stat['size'] || ($stat['crc'] !== 0 && crc32($content) !== $stat['crc'])) {
            fwrite(STDERR, "Não abriu ou está corrompido: {$name} (senha errada?)\n");
            exit(6);
        }
    }
    echo "OK: {$zip->numFiles} arquivos conferidos\n";
    exit(0);
}

if ($mode === 'unpack') {
    if (! $dir) {
        fwrite(STDERR, "Informe a pasta de destino\n");
        exit(2);
    }
    if (! $zip->extractTo($dir)) {
        fwrite(STDERR, "Não foi possível abrir o backup (senha errada?)\n");
        exit(6);
    }
    echo "{$zip->numFiles} arquivos restaurados em {$dir}\n";
    exit(0);
}

fwrite(STDERR, "Modo desconhecido: {$mode}\n");
exit(2);
