import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendar, faClock } from '@fortawesome/free-solid-svg-icons';
import { useTenantTime } from '../../hooks/time/useTenantTime';

function getHojeNoTimezone(timeZone = 'America/Campo_Grande') {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    return formatter.format(new Date());
  } catch {
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const dia = String(agora.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }
}

export function DateField({
  label,
  value,
  onChange,
  name,
}) {
  const { timezone } = useTenantTime();

  const handleToday = () => {
    const hoje = getHojeNoTimezone(timezone);
    onChange({ target: { name, value: hoje } });
  };

  const handleClear = () => {
    onChange({ target: { name, value: '' } });
  };

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-slate-600">
        {label}
      </label>

      <div className="flex flex-col gap-2">
        <div className="relative">
          <FontAwesomeIcon
            icon={faCalendar}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"
          />

          <input
            type="date"
            name={name}
            value={value || ''}
            onChange={onChange}
            className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleToday}
            className="text-xs px-3 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
          >
            Hoje
          </button>

          <button
            type="button"
            onClick={handleClear}
            className="text-xs px-3 py-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
          >
            Limpar
          </button>
        </div>
      </div>
    </div>
  );
}

export function TimeField({
  label,
  value,
  onChange,
  name,
}) {
  const sugestoes = [
    '08:00',
    '08:30',
    '09:00',
    '10:00',
    '12:00',
    '14:00',
    '16:00',
  ];

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-slate-600">
        {label}
      </label>

      <div className="flex flex-col gap-2">
        <div className="relative">
          <FontAwesomeIcon
            icon={faClock}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"
          />

          <input
            type="time"
            name={name}
            value={value || ''}
            onChange={onChange}
            className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-1">
          {sugestoes.map((hora) => (
            <button
              key={hora}
              type="button"
              onClick={() =>
                onChange({ target: { name, value: hora } })
              }
              className="text-xs px-2 py-1 rounded bg-slate-100 hover:bg-slate-200"
            >
              {hora}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}