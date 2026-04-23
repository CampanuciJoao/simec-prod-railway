import UnidadeCard from './UnidadeCard';

function UnidadesListSection({ unidades, actions }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {unidades.map((u) => (
        <UnidadeCard
          key={u.id}
          unidade={u}
          onEdit={actions.edit}
          onDelete={actions.delete}
        />
      ))}
    </div>
  );
}

export default UnidadesListSection;
