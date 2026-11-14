import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

// Escolher ou tirar uma foto e deixar pronta para enviar (perfil e logo do ministério).
// O servidor recorta em quadrado e reduz; aqui só pedimos um recorte quadrado quando o aparelho permite.

export type PhotoSource = 'camera' | 'library';

/** Devolve o formulário com a foto, ou null se a pessoa desistiu. Lança erro com mensagem amigável. */
export async function pickPhoto(source: PhotoSource): Promise<FormData | null> {
  if (Platform.OS !== 'web') {
    const permission =
      source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      throw new Error(source === 'camera' ? 'Libere a câmera para o Ministre nos Ajustes do celular.' : 'Libere as fotos para o Ministre nos Ajustes do celular.');
    }
  }

  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.85 };
  const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  const form = new FormData();
  if (Platform.OS === 'web') {
    // Na web o arquivo vem pronto (ou como endereço temporário, que vira arquivo aqui).
    const file = asset.file ?? (await (await fetch(asset.uri)).blob());
    form.append('photo', file, asset.fileName ?? 'foto.jpg');
  } else {
    form.append('photo', { uri: asset.uri, name: asset.fileName ?? 'foto.jpg', type: asset.mimeType ?? 'image/jpeg' } as unknown as Blob);
  }
  return form;
}
