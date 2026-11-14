<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Fotos (perfil e logo do ministério): recorta em quadrado, reduz e grava como JPEG leve no disco público.
 * Assim a foto do celular (vários MB) vira poucos KB e abre rápido para todos.
 */
class ImageStore
{
    public const MAX_KB = 8192;

    public function storeSquare(UploadedFile $file, string $folder, int $size = 512, string $field = 'photo'): string
    {
        $image = @imagecreatefromstring((string) file_get_contents($file->getRealPath()));
        if (! $image) {
            throw ValidationException::withMessages([$field => 'Não foi possível ler esta imagem. Use uma foto JPG ou PNG.']);
        }

        // Recorte central em quadrado.
        $w = imagesx($image);
        $h = imagesy($image);
        $side = min($w, $h);
        $target = min($size, $side);
        $square = imagecreatetruecolor($target, $target);
        imagefill($square, 0, 0, imagecolorallocate($square, 255, 255, 255)); // PNG transparente fica com fundo branco
        imagecopyresampled($square, $image, 0, 0, intdiv($w - $side, 2), intdiv($h - $side, 2), $target, $target, $side, $side);

        ob_start();
        imagejpeg($square, null, 85);
        $jpeg = (string) ob_get_clean();
        imagedestroy($image);
        imagedestroy($square);

        $path = trim($folder, '/').'/'.Str::random(32).'.jpg';
        Storage::disk('public')->put($path, $jpeg);

        return $path;
    }

    public function delete(?string $path): void
    {
        if ($path) {
            Storage::disk('public')->delete($path);
        }
    }

    public static function url(?string $path): ?string
    {
        return $path ? Storage::disk('public')->url($path) : null;
    }
}
