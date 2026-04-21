import { useNavigate, useParams } from 'react-router-dom';
import { useEquipamentoFichaTecnica } from './useEquipamentoFichaTecnica';

export function useFichaTecnicaPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fichaTecnica = useEquipamentoFichaTecnica(id);

  return {
    ...fichaTecnica,

    goBack: () => navigate('/equipamentos'),
  };
}
