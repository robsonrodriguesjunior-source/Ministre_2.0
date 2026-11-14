import { FormScreen } from '@/components/FormScreen';
import { Card, EmptyState } from '@/components/ui';

// Central de notificações (sino): chega na Etapa 5.
export default function Notificacoes() {
  return (
    <FormScreen title="Notificações">
      <Card>
        <EmptyState icon="bell" message="A central de notificações chega na Etapa 5." />
      </Card>
    </FormScreen>
  );
}
