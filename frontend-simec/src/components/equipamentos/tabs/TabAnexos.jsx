// TRECHO PRINCIPAL ALTERADO (UI)

<div className="space-y-5">
  {/* HEADER */}
  <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex items-center gap-3">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
        <FontAwesomeIcon icon={faPaperclip} />
      </span>

      <div>
        <h3 className="text-lg font-semibold text-slate-900">
          Anexos ({anexosIniciais.length})
        </h3>
        <p className="text-sm text-slate-500">
          Documentos vinculados ao equipamento
        </p>
      </div>
    </div>

    <button
      className="btn btn-primary"
      onClick={() => anexoInputRef.current?.click()}
      disabled={isSubmitting}
    >
      <FontAwesomeIcon icon={isSubmitting ? faSpinner : faUpload} spin={isSubmitting} />
      {isSubmitting ? 'Enviando...' : 'Enviar'}
    </button>

    <input
      type="file"
      multiple
      ref={anexoInputRef}
      className="hidden"
      onChange={handleAnexosUpload}
      disabled={isSubmitting}
    />
  </div>

  {/* GRID */}
  {anexosIniciais.length > 0 ? (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {anexosIniciais.map((anexo) => {
        const { icon, color } = getIconePorTipoArquivo(anexo.tipoMime);

        return (
          <div
            key={anexo.id}
            className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition"
          >
            <div
              className="h-12 w-12 flex items-center justify-center rounded-xl"
              style={{ backgroundColor: `${color}20`, color }}
            >
              <FontAwesomeIcon icon={icon} />
            </div>

            <div className="flex-1 min-w-0">
              <a
                href={`${API_BASE_URL_DOWNLOAD}/${anexo.path}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm font-semibold text-blue-600 truncate hover:underline"
              >
                {anexo.nomeOriginal}
              </a>

              <span className="text-xs text-slate-400">
                {formatarData(anexo.createdAt)}
              </span>
            </div>

            <button
              onClick={() => handleDeleteClick(anexo)}
              className="h-9 w-9 flex items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-600 hover:text-white"
              disabled={isSubmitting}
            >
              <FontAwesomeIcon icon={faTrashAlt} />
            </button>
          </div>
        );
      })}
    </div>
  ) : (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
      Nenhum anexo encontrado.
    </div>
  )}
</div>