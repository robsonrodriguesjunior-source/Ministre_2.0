import { FormScreen } from '@/components/FormScreen';
import { Card, EmptyState } from '@/components/ui';

// Lista de avisos: chega na Etapa 5.
export default function Avisos() {
  return (
    <FormScreen title="Avisos">
      <Card>
        <EmptyState icon="megaphone" message="A lista de avisos chega na Etapa 5." />
      </Card>
    </FormScreen>
  );
}
