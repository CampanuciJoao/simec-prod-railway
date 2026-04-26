import React from 'react';
import { Navigate, useParams } from 'react-router-dom';

function FichaTecnicaPage() {
  const { id } = useParams();
  return <Navigate to={id ? `/equipamentos/detalhes/${id}` : '/equipamentos'} replace />;
}

export default FichaTecnicaPage;
