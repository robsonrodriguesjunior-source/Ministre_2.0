import { useState } from 'react';
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

import { ApiError } from '@/lib/api';

/**
 * Envia um formulário para a API e distribui os erros: os de campo vão para o campo certo,
 * o resto vira a mensagem geral do formulário.
 */
export function useApiForm<T extends FieldValues>(setError: UseFormSetError<T>, fields: Path<T>[]) {
  const [formError, setFormError] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setFormError(null);
    try {
      await fn();
    } catch (error) {
      if (error instanceof ApiError) {
        let placed = false;
        for (const field of fields) {
          const message = error.field(field);
          if (message) {
            setError(field, { type: 'server', message });
            placed = true;
          }
        }
        if (!placed) setFormError(Object.values(error.fieldErrors)[0]?.[0] ?? error.message);
      } else {
        setFormError('Algo deu errado. Tente de novo.');
      }
    }
  };

  return { formError, run, setFormError };
}
