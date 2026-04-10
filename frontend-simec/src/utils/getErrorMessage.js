export function getErrorMessage(error, fallback = 'Ocorreu um erro inesperado.') {
  return (
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}