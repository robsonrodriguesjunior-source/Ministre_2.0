import { router } from 'expo-router';
import { useState } from 'react';

import { FormScreen } from '@/components/FormScreen';
import { Button, TextField } from '@/components/ui';

const clean = (v: string) => v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);

// "Tenho um convite": digitar o código de 8 caracteres e ver o convite.
export default function DigitarConvite() {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string>();

  const next = () => {
    if (code.length !== 8) {
      setError('O código tem 8 letras e números.');
      return;
    }
    router.push({ pathname: '/convite/[code]', params: { code } });
  };

  return (
    <FormScreen
      question="Digite o código do convite"
      subtitle="O líder do ministério manda o código ou um link pelo WhatsApp."
      footer={<Button label="Continuar" onPress={next} disabled={code.length === 0} />}
    >
      <TextField
        label="Código"
        value={code}
        onChangeText={(t) => {
          setCode(clean(t));
          setError(undefined);
        }}
        error={error}
        autoCapitalize="characters"
        autoCorrect={false}
        placeholder="Ex.: AB12CD34"
        maxLength={8}
        returnKeyType="go"
        onSubmitEditing={next}
      />
    </FormScreen>
  );
}
