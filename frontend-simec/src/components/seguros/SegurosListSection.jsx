import SeguroCard from './SeguroCard';

function SegurosListSection({ seguros, getStatus, actions }) {
  return (
    <div className="grid gap-4">
      {seguros.map((s) => (
        <SeguroCard
          key={s.id}
          seguro={s}
          status={getStatus(s)}
          onView={() => actions.view(s.id)}
          onEdit={() => actions.edit(s.id)}
          onDelete={() => actions.delete(s)}
        />
      ))}
    </div>
  );
}

export default SegurosListSection;