import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';

function PageLoader() {
  return (
    <div className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-slate-100">
      <FontAwesomeIcon icon={faSpinner} spin size="2x" color="#3b82f6" />
    </div>
  );
}

export default PageLoader;
